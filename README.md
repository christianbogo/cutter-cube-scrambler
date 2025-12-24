# Cutter Cube Scrambler

A high-quality Rubik's cube scrambler implementing uniform random state generation and a Kociemba-style two-phase solver in TypeScript.

## Features

- **Uniform Random State Generation**: Generates cube states uniformly distributed across the entire cube group space (43 quintillion positions)
- **Two-Phase Kociemba Solver**: Implements the classic two-phase algorithm for optimal solving
- **High Performance**: Uses precomputed pruning tables and efficient coordinate mappings
- **Deterministic**: Supports seeded random generation for reproducible scrambles
- **CLI Interface**: Easy-to-use command-line tool
- **TypeScript**: Fully typed with comprehensive test coverage

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Generate a single scramble

```bash
npm start
```

### Generate multiple scrambles

```bash
npm start -- -n 5
```

### Generate with seed for reproducibility

```bash
npm start -- -s 12345
```

### Show solution sequence

```bash
npm start -- --show-solution
```

## Usage

### Command Line Interface

```bash
cutter-cube-scrambler [OPTIONS] [COUNT]

OPTIONS:
  -h, --help              Show help message
  -n, --count <N>         Generate N scrambles (default: 1)
  -s, --seed <SEED>       Use specific seed for reproducible scrambles
  -v, --verbose           Show detailed information
  -b, --benchmark         Run performance benchmark
  --max-depth <DEPTH>     Maximum search depth (default: 18)
  --show-solution         Show solution sequence (inverse of scramble)
  --format <FORMAT>       Output format: standard, compact, json (default: standard)
```

### Examples

```bash
# Generate 5 scrambles
cutter-cube-scrambler 5

# Generate with verbose output
cutter-cube-scrambler -n 3 -v

# Generate reproducible scramble
cutter-cube-scrambler -s 12345

# Run benchmark
cutter-cube-scrambler -b

# JSON output format
cutter-cube-scrambler --format json
```

### Programmatic API

```typescript
import { randomState, SeededRNG } from "./src/random/state";
import { KociembaSolver } from "./src/solver/kociemba/solver";

// Generate a random cube state
const rng = new SeededRNG(12345);
const randomCube = randomState(rng);

// Solve it to get a scramble sequence
const solver = new KociembaSolver();
await solver.initialize();

const solution = await solver.solve(randomCube);
if (solution.success) {
  console.log("Scramble:", solution.scramble.join(" "));
  console.log("Solution:", solution.moves.join(" "));
}
```

## Architecture

### Core Components

1. **Cubie Model** (`src/core/cubie.ts`)

   - Represents cube state with corner and edge arrays
   - Supports move application, composition, and inversion
   - Validates cube state constraints (parity, orientations)

2. **Move System** (`src/core/moves.ts`)

   - Defines all 18 basic moves (6 faces × 3 rotations)
   - Precomputed move tables for efficient application
   - Support for move composition and inversion

3. **Random State Generator** (`src/random/state.ts`)

   - Generates uniformly distributed valid cube states
   - Respects group theory constraints (parity, orientations)
   - Seedable for reproducible sequences

4. **Two-Phase Solver** (`src/solver/kociemba/`)
   - **Coordinates**: Maps cube states to lower-dimensional coordinates
   - **Pruning Tables**: Precomputed distance heuristics for IDA\* search
   - **IDA\* Search**: Iterative deepening A\* for both phases
   - **Solver**: Orchestrates the two-phase solving process

### Algorithm Details

#### Phase 1: Reach G1 Subgroup

- **Goal**: All edges oriented, E-slice edges in middle layer
- **Coordinates**: Edge orientation (2^11), Corner orientation (3^7), E-slice position (C(12,4))
- **Moves**: All 18 face turns allowed
- **Heuristic**: Maximum of individual coordinate distances

#### Phase 2: Solve within G1

- **Goal**: Completely solved cube
- **Coordinates**: Corner permutation (8!), UD-edge permutation, E-slice permutation
- **Moves**: Restricted to moves preserving G1 (U, U', U2, D, D', D2, R2, L2, F2, B2)
- **Heuristic**: Maximum of individual coordinate distances

## Performance

The solver typically generates scrambles with the following characteristics:

- **Average scramble length**: 19-21 moves
- **Solve time**: 10-100ms per scramble (after initialization)
- **Initialization time**: 1-5 seconds (loads/builds pruning tables)
- **Memory usage**: ~50MB for pruning tables

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- cubie.test.ts
npm test -- random.test.ts
npm test -- integration.test.ts

# Run with coverage
npm test -- --coverage
```

## Development

### Project Structure

```
src/
├── core/                 # Core cube representation
│   ├── cubie.ts         # Cubie model and operations
│   ├── moves.ts         # Move definitions and tables
│   └── notation.ts      # Move notation parsing/formatting
├── random/              # Random state generation
│   └── state.ts         # Uniform random state generator
├── solver/kociemba/     # Two-phase solver
│   ├── coordinates.ts   # Coordinate mappings
│   ├── pruning.ts       # Pruning table generation
│   ├── ida.ts          # IDA* search algorithm
│   └── solver.ts       # Main solver orchestration
└── cli.ts              # Command-line interface
```

### Building

```bash
npm run build    # Compile TypeScript
npm run clean    # Remove build artifacts
npm run dev      # Run in development mode
```

## Theory Background

This implementation is based on Herbert Kociemba's two-phase algorithm, which revolutionized computer cube solving in the 1990s. The key insights are:

1. **Group Theory**: The Rubik's cube group has ~4.3×10^19 states, but can be factored into smaller subgroups
2. **Two-Phase Approach**: First reach a smaller subgroup G1 (~2×10^10 states), then solve within G1
3. **Coordinate Reduction**: Map full cube state to lower-dimensional coordinates for efficient search
4. **Pruning Tables**: Precompute distance bounds to goal for effective A\* heuristics

## References

- [Kociemba's Original Algorithm](http://kociemba.org/cube.htm)
- [Cube Explorer](http://kociemba.org/cubeexplorer/)
- [Group Theory and the Rubik's Cube](https://web.mit.edu/sp.268/www/rubik.pdf)

## License

MIT License.

## Troubleshooting

### Solver Initialization Issues

If the solver appears stuck during initialization or tests, try clearing the cache directory:

```bash
rm -rf .cache
```

This will force the solver to rebuild the pruning tables with the correct configuration.
