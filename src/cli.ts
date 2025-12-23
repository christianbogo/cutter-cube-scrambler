#!/usr/bin/env node

/**
 * Command-line interface for the Rubik's cube scrambler
 * Generates high-quality scrambles using uniform random states and Kociemba solver
 */

// Using global process object instead of import
import { randomState, randomStateWithSeed, SeededRNG } from "./random/state";
import {
  KociembaSolver,
  generateScramble,
  benchmarkSolver,
} from "./solver/kociemba/solver";
import { formatMoveSequence } from "./core/notation";
import { formatCacheSize } from "./solver/kociemba/pruning";

// CLI configuration
interface CLIConfig {
  count: number;
  seed?: number;
  verbose: boolean;
  benchmark: boolean;
  maxDepth?: number;
  showSolution: boolean;
  format: "standard" | "compact" | "json";
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIConfig {
  const args = process.argv.slice(2);
  const config: CLIConfig = {
    count: 1,
    verbose: false,
    benchmark: false,
    showSolution: false,
    format: "standard",
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-h":
      case "--help":
        config.help = true;
        break;

      case "-n":
      case "--count":
        const count = parseInt(args[++i]);
        if (isNaN(count) || count < 1) {
          throw new Error("Count must be a positive integer");
        }
        config.count = count;
        break;

      case "-s":
      case "--seed":
        const seed = parseInt(args[++i]);
        if (isNaN(seed)) {
          throw new Error("Seed must be an integer");
        }
        config.seed = seed;
        break;

      case "-v":
      case "--verbose":
        config.verbose = true;
        break;

      case "-b":
      case "--benchmark":
        config.benchmark = true;
        break;

      case "--max-depth":
        const depth = parseInt(args[++i]);
        if (isNaN(depth) || depth < 1) {
          throw new Error("Max depth must be a positive integer");
        }
        config.maxDepth = depth;
        break;

      case "--show-solution":
        config.showSolution = true;
        break;

      case "--format":
        const format = args[++i];
        if (!["standard", "compact", "json"].includes(format)) {
          throw new Error("Format must be one of: standard, compact, json");
        }
        config.format = format as any;
        break;

      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        // Treat as count if it's a number
        const num = parseInt(arg);
        if (!isNaN(num) && num > 0) {
          config.count = num;
        }
        break;
    }
  }

  return config;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Rubik's Cube Scrambler - High-quality scrambles using Kociemba solver

USAGE:
  cutter-cube-scrambler [OPTIONS] [COUNT]

OPTIONS:
  -h, --help              Show this help message
  -n, --count <N>         Generate N scrambles (default: 1)
  -s, --seed <SEED>       Use specific seed for reproducible scrambles
  -v, --verbose           Show detailed information
  -b, --benchmark         Run performance benchmark
  --max-depth <DEPTH>     Maximum search depth (default: 18)
  --show-solution         Show solution sequence (inverse of scramble)
  --format <FORMAT>       Output format: standard, compact, json (default: standard)

EXAMPLES:
  cutter-cube-scrambler                    # Generate 1 scramble
  cutter-cube-scrambler 5                  # Generate 5 scrambles
  cutter-cube-scrambler -n 10 -v          # Generate 10 scrambles with verbose output
  cutter-cube-scrambler -s 12345          # Generate scramble with seed 12345
  cutter-cube-scrambler -b                # Run benchmark test
  cutter-cube-scrambler --format json     # Output in JSON format

The scrambler generates uniform random cube states and uses a two-phase
Kociemba-style solver to find optimal scramble sequences.
`);
}

/**
 * Format scramble output based on format preference
 */
function formatOutput(
  scrambles: string[],
  solutions: string[],
  config: CLIConfig
): void {
  switch (config.format) {
    case "json":
      const jsonOutput = scrambles.map((scramble, i) => ({
        scramble,
        solution: config.showSolution ? solutions[i] : undefined,
      }));
      console.log(JSON.stringify(jsonOutput, null, 2));
      break;

    case "compact":
      for (let i = 0; i < scrambles.length; i++) {
        console.log(scrambles[i]);
        if (config.showSolution) {
          console.log(`Solution: ${solutions[i]}`);
        }
      }
      break;

    case "standard":
    default:
      for (let i = 0; i < scrambles.length; i++) {
        console.log(`Scramble ${i + 1}: ${scrambles[i]}`);
        if (config.showSolution) {
          console.log(`Solution ${i + 1}: ${solutions[i]}`);
        }
        if (i < scrambles.length - 1) console.log();
      }
      break;
  }
}

/**
 * Run benchmark test
 */
async function runBenchmark(config: CLIConfig): Promise<void> {
  console.log("Running benchmark...\n");

  const testCount = 50;
  const rng = config.seed ? new SeededRNG(config.seed) : new SeededRNG();

  // Generate test cases
  console.log(`Generating ${testCount} random cube states...`);
  const testCubes = Array.from({ length: testCount }, () => randomState(rng));

  // Run benchmark
  const startTime = Date.now();
  const results = await benchmarkSolver(testCubes, {
    maxPhase1Depth: config.maxDepth || 18,
    maxPhase2Depth: config.maxDepth || 18,
    verbose: config.verbose,
  });
  const totalTime = Date.now() - startTime;

  // Display results
  console.log("\n=== BENCHMARK RESULTS ===");
  console.log(`Total cubes: ${results.totalCubes}`);
  console.log(`Successful solves: ${results.successfulSolves}`);
  console.log(
    `Success rate: ${(
      (results.successfulSolves / results.totalCubes) *
      100
    ).toFixed(1)}%`
  );
  console.log(
    `Average solution depth: ${results.averageDepth.toFixed(1)} moves`
  );
  console.log(`Average solve time: ${results.averageTimeMs.toFixed(1)}ms`);
  console.log(`Average nodes searched: ${results.averageNodes.toFixed(0)}`);
  console.log(`Total benchmark time: ${totalTime}ms`);
  console.log(`Cache size: ${formatCacheSize()}`);

  // Depth distribution
  const depthCounts: { [key: number]: number } = {};
  results.solutions
    .filter((s) => s.success)
    .forEach((s) => {
      const depth = s.stats.totalDepth;
      depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    });

  console.log("\nDepth distribution:");
  Object.keys(depthCounts)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((depth) => {
      const count = depthCounts[depth];
      const percentage = ((count / results.successfulSolves) * 100).toFixed(1);
      console.log(`  ${depth} moves: ${count} (${percentage}%)`);
    });
}

/**
 * Generate scrambles
 */
async function generateScrambles(config: CLIConfig): Promise<void> {
  if (config.verbose) {
    console.log("Initializing solver...");
  }

  const solver = new KociembaSolver({
    maxPhase1Depth: config.maxDepth || 18,
    maxPhase2Depth: config.maxDepth || 18,
    verbose: config.verbose,
  });

  await solver.initialize();

  if (config.verbose) {
    console.log(`Generating ${config.count} scramble(s)...\n`);
  }

  const rng = config.seed ? new SeededRNG(config.seed) : new SeededRNG();
  const scrambles: string[] = [];
  const solutions: string[] = [];

  for (let i = 0; i < config.count; i++) {
    if (config.verbose && config.count > 1) {
      console.log(`Generating scramble ${i + 1}/${config.count}...`);
    }

    // Generate random state
    const randomCube = randomState(rng);

    // Solve to get scramble
    const result = await solver.solve(randomCube);

    if (!result.success) {
      console.error(`Failed to generate scramble ${i + 1}: ${result.error}`);
      continue;
    }

    const scramble = formatMoveSequence(result.scramble);
    const solution = formatMoveSequence(result.moves);

    scrambles.push(scramble);
    solutions.push(solution);

    if (config.verbose) {
      console.log(`  Scramble: ${scramble}`);
      console.log(`  Solution: ${solution}`);
      console.log(`  Depth: ${result.stats.totalDepth} moves`);
      console.log(`  Time: ${result.stats.totalTimeMs}ms`);
      console.log(`  Nodes: ${result.stats.totalNodes}`);
      if (i < config.count - 1) console.log();
    }
  }

  if (!config.verbose) {
    formatOutput(scrambles, solutions, config);
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const config = parseArgs();

    if (config.help) {
      showHelp();
      return;
    }

    if (config.benchmark) {
      await runBenchmark(config);
    } else {
      await generateScrambles(config);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.log("\nOperation cancelled.");
  process.exit(0);
});

// Only run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main, parseArgs, showHelp };
