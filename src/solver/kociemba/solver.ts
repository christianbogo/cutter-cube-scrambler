/**
 * Kociemba two-phase solver orchestration
 * Coordinates Phase 1 and Phase 2 searches to solve the cube
 */

import { Cube, applyMove, isSolved, solvedCube } from "../../core/cubie";
import { getMoveByKey } from "../../core/moves";
import { MoveKey, MOVE_KEYS } from "../../core/moves";
import { invertMoveSequence, formatMoveSequence } from "../../core/notation";
import {
  getPhase1Coord,
  getPhase2Coord,
  isInG1,
  applyMoveToEO,
  applyMoveToCO,
  applyMoveToESlice,
  applyMoveToCP,
  applyMoveToUDEP,
  applyMoveToEP,
} from "./coordinates";
import { initializePruningTables } from "./pruning";
import {
  searchPhase1,
  searchPhase2,
  moveIndicesToKeys,
  SearchStats,
} from "./ida";

// Solver configuration
export interface SolverConfig {
  maxPhase1Depth: number;
  maxPhase2Depth: number;
  maxTotalDepth: number;
  timeoutMs?: number;
  verbose: boolean;
}

export const DEFAULT_CONFIG: SolverConfig = {
  maxPhase1Depth: 18,
  maxPhase2Depth: 18,
  maxTotalDepth: 30,
  verbose: false,
};

// Solution result
export interface Solution {
  moves: MoveKey[];
  scramble: MoveKey[];
  phase1Moves: MoveKey[];
  phase2Moves: MoveKey[];
  stats: SearchStats;
  success: boolean;
  error?: string;
}

/**
 * Main Kociemba solver class
 */
export class KociembaSolver {
  private initialized = false;
  private config: SolverConfig;

  constructor(config: Partial<SolverConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the solver (load/build pruning tables)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("Initializing Kociemba solver...");
    const startTime = Date.now();

    try {
      initializePruningTables();
      this.initialized = true;

      const initTime = Date.now() - startTime;
      console.log(`Solver initialized in ${initTime}ms`);
    } catch (error) {
      throw new Error(`Failed to initialize solver: ${error}`);
    }
  }

  /**
   * Solve a cube state and return the scramble sequence
   */
  async solve(cube: Cube): Promise<Solution> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const stats: SearchStats = {
      totalDepth: 0,
      totalNodes: 0,
      totalTimeMs: 0,
    };

    try {
      // Check if already solved
      if (isSolved(cube)) {
        return {
          moves: [],
          scramble: [],
          phase1Moves: [],
          phase2Moves: [],
          stats,
          success: true,
        };
      }

      if (this.config.verbose) {
        console.log("Starting two-phase solve...");
      }

      // Phase 1: Reach G1 subgroup
      const phase1Result = await this.solvePhase1(cube);
      if (!phase1Result.success) {
        return phase1Result;
      }

      stats.phase1Stats = phase1Result.stats.phase1Stats;
      stats.totalNodes += phase1Result.stats.totalNodes;

      // Apply Phase 1 moves to get G1 state
      let intermediateCube = cube;
      for (const moveKey of phase1Result.phase1Moves) {
        const move = getMoveByKey(moveKey);
        intermediateCube = applyMove(intermediateCube, move);
      }

      // Verify we reached G1
      if (!isInG1(intermediateCube)) {
        return {
          moves: [],
          scramble: [],
          phase1Moves: [],
          phase2Moves: [],
          stats,
          success: false,
          error: "Failed to reach G1 subgroup in Phase 1",
        };
      }

      if (this.config.verbose) {
        console.log(
          `Phase 1 completed: ${phase1Result.phase1Moves.length} moves`
        );
      }

      // Phase 2: Solve from G1 to solved state
      const phase2Result = await this.solvePhase2(intermediateCube);
      if (!phase2Result.success) {
        return {
          ...phase2Result,
          phase1Moves: phase1Result.phase1Moves,
          stats: {
            ...stats,
            phase2Stats: phase2Result.stats.phase2Stats,
            totalNodes: stats.totalNodes + phase2Result.stats.totalNodes,
          },
        };
      }

      stats.phase2Stats = phase2Result.stats.phase2Stats;
      stats.totalNodes += phase2Result.stats.totalNodes;
      stats.totalDepth =
        phase1Result.phase1Moves.length + phase2Result.phase2Moves.length;
      stats.totalTimeMs = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(
          `Phase 2 completed: ${phase2Result.phase2Moves.length} moves`
        );
        console.log(`Total solution: ${stats.totalDepth} moves`);
      }

      // Combine solutions
      const solution = [
        ...phase1Result.phase1Moves,
        ...phase2Result.phase2Moves,
      ];
      const scramble = invertMoveSequence(solution);

      // Verify solution
      const verification = this.verifySolution(cube, solution);
      if (!verification.valid) {
        return {
          moves: solution,
          scramble,
          phase1Moves: phase1Result.phase1Moves,
          phase2Moves: phase2Result.phase2Moves,
          stats,
          success: false,
          error: `Solution verification failed: ${verification.error}`,
        };
      }

      return {
        moves: solution,
        scramble,
        phase1Moves: phase1Result.phase1Moves,
        phase2Moves: phase2Result.phase2Moves,
        stats,
        success: true,
      };
    } catch (error) {
      return {
        moves: [],
        scramble: [],
        phase1Moves: [],
        phase2Moves: [],
        stats: {
          ...stats,
          totalTimeMs: Date.now() - startTime,
        },
        success: false,
        error: `Solver error: ${error}`,
      };
    }
  }

  /**
   * Phase 1: Reach G1 subgroup
   */
  private async solvePhase1(cube: Cube): Promise<Solution> {
    const phase1Coord = getPhase1Coord(cube);

    if (this.config.verbose) {
      console.log(
        `Phase 1 coordinates: EO=${phase1Coord.eo}, CO=${phase1Coord.co}, E-slice=${phase1Coord.eslice}`
      );
    }

    // Check if already in G1
    if (isInG1(cube)) {
      return {
        moves: [],
        scramble: [],
        phase1Moves: [],
        phase2Moves: [],
        stats: { totalDepth: 0, totalNodes: 0, totalTimeMs: 0 },
        success: true,
      };
    }

    const searchResult = searchPhase1(phase1Coord, this.config.maxPhase1Depth);

    if (!searchResult) {
      return {
        moves: [],
        scramble: [],
        phase1Moves: [],
        phase2Moves: [],
        stats: { totalDepth: 0, totalNodes: 0, totalTimeMs: 0 },
        success: false,
        error: `Phase 1 search failed (max depth: ${this.config.maxPhase1Depth})`,
      };
    }

    const phase1Moves = moveIndicesToKeys(searchResult.solution);

    return {
      moves: phase1Moves,
      scramble: [],
      phase1Moves,
      phase2Moves: [],
      stats: {
        phase1Stats: searchResult,
        totalDepth: searchResult.depth,
        totalNodes: searchResult.nodesSearched,
        totalTimeMs: searchResult.timeMs,
      },
      success: true,
    };
  }

  /**
   * Phase 2: Solve from G1 to solved state
   */
  private async solvePhase2(cube: Cube): Promise<Solution> {
    const phase2Coord = getPhase2Coord(cube);

    if (this.config.verbose) {
      console.log(
        `Phase 2 coordinates: CP=${phase2Coord.cp}, UDEP=${phase2Coord.udep}, EP=${phase2Coord.ep}`
      );
    }

    // Check if already solved
    if (isSolved(cube)) {
      return {
        moves: [],
        scramble: [],
        phase1Moves: [],
        phase2Moves: [],
        stats: { totalDepth: 0, totalNodes: 0, totalTimeMs: 0 },
        success: true,
      };
    }

    const searchResult = searchPhase2(phase2Coord, this.config.maxPhase2Depth);

    if (!searchResult) {
      return {
        moves: [],
        scramble: [],
        phase1Moves: [],
        phase2Moves: [],
        stats: { totalDepth: 0, totalNodes: 0, totalTimeMs: 0 },
        success: false,
        error: `Phase 2 search failed (max depth: ${this.config.maxPhase2Depth})`,
      };
    }

    const phase2Moves = moveIndicesToKeys(searchResult.solution);

    return {
      moves: phase2Moves,
      scramble: [],
      phase1Moves: [],
      phase2Moves,
      stats: {
        phase2Stats: searchResult,
        totalDepth: searchResult.depth,
        totalNodes: searchResult.nodesSearched,
        totalTimeMs: searchResult.timeMs,
      },
      success: true,
    };
  }

  /**
   * Verify that a solution actually solves the cube
   */
  private verifySolution(
    originalCube: Cube,
    solution: MoveKey[]
  ): { valid: boolean; error?: string } {
    try {
      let testCube = originalCube;

      // Apply solution moves
      for (const moveKey of solution) {
        const move = getMoveByKey(moveKey);
        testCube = applyMove(testCube, move);
      }

      // Check if solved
      if (!isSolved(testCube)) {
        return {
          valid: false,
          error: "Solution does not result in solved cube",
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Verification error: ${error}` };
    }
  }

  /**
   * Get solver statistics and status
   */
  getStatus(): { initialized: boolean; config: SolverConfig } {
    return {
      initialized: this.initialized,
      config: this.config,
    };
  }

  /**
   * Update solver configuration
   */
  updateConfig(newConfig: Partial<SolverConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Convenience function to solve a cube with default settings
 */
export async function solveCube(
  cube: Cube,
  config?: Partial<SolverConfig>
): Promise<Solution> {
  const solver = new KociembaSolver(config);
  return solver.solve(cube);
}

/**
 * Generate a scramble for a given cube state
 */
export async function generateScramble(
  cube: Cube,
  config?: Partial<SolverConfig>
): Promise<MoveKey[]> {
  const solution = await solveCube(cube, config);
  if (!solution.success) {
    throw new Error(`Failed to generate scramble: ${solution.error}`);
  }
  return solution.scramble;
}

/**
 * Batch solve multiple cubes
 */
export async function solveCubes(
  cubes: Cube[],
  config?: Partial<SolverConfig>
): Promise<Solution[]> {
  const solver = new KociembaSolver(config);
  await solver.initialize(); // Initialize once for all solves

  const results: Solution[] = [];
  for (const cube of cubes) {
    const result = await solver.solve(cube);
    results.push(result);
  }

  return results;
}

/**
 * Performance benchmarking
 */
export async function benchmarkSolver(
  cubes: Cube[],
  config?: Partial<SolverConfig>
): Promise<{
  totalCubes: number;
  successfulSolves: number;
  averageDepth: number;
  averageTimeMs: number;
  averageNodes: number;
  solutions: Solution[];
}> {
  const solutions = await solveCubes(cubes, config);

  const successful = solutions.filter((s) => s.success);
  const totalDepth = successful.reduce((sum, s) => sum + s.stats.totalDepth, 0);
  const totalTime = successful.reduce((sum, s) => sum + s.stats.totalTimeMs, 0);
  const totalNodes = successful.reduce((sum, s) => sum + s.stats.totalNodes, 0);

  return {
    totalCubes: cubes.length,
    successfulSolves: successful.length,
    averageDepth: successful.length > 0 ? totalDepth / successful.length : 0,
    averageTimeMs: successful.length > 0 ? totalTime / successful.length : 0,
    averageNodes: successful.length > 0 ? totalNodes / successful.length : 0,
    solutions,
  };
}
