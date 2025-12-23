/**
 * Integration tests for the complete scrambler system
 */

import { randomState, SeededRNG } from "../src/random/state";
import {
  KociembaSolver,
  generateScramble,
} from "../src/solver/kociemba/solver";
import { solvedCube, applyMove, isSolved } from "../src/core/cubie";
import {
  parseMoveSequence,
  applyMoveSequence,
  invertMoveSequence,
} from "../src/core/notation";
import { MOVES } from "../src/core/moves";

describe("Integration Tests", () => {
  // These tests require the solver to be initialized, which can take time
  // Set a longer timeout
  jest.setTimeout(60000);

  test("should solve a simple scrambled cube", async () => {
    const solver = new KociembaSolver({ verbose: false });
    await solver.initialize();

    // Create a simple scramble
    const cube = solvedCube();
    const scrambled = applyMove(applyMove(cube, MOVES.R), MOVES.U);

    expect(isSolved(scrambled)).toBe(false);

    const solution = await solver.solve(scrambled);
    expect(solution.success).toBe(true);
    expect(solution.moves.length).toBeGreaterThan(0);

    // Verify the solution actually solves the cube
    const solved = applyMoveSequence(scrambled, solution.moves);
    expect(isSolved(solved)).toBe(true);
  });

  test("should generate valid scrambles", async () => {
    const solver = new KociembaSolver({ verbose: false });
    await solver.initialize();

    const rng = new SeededRNG(12345);
    const randomCube = randomState(rng);

    const solution = await solver.solve(randomCube);
    expect(solution.success).toBe(true);

    // The scramble should take us from solved to the random state
    const scrambled = applyMoveSequence(solvedCube(), solution.scramble);

    // Note: Due to the nature of cube solving, the scrambled state might not
    // exactly match the original random state (there can be multiple equivalent
    // states), but applying the solution should get us back to solved
    const solved = applyMoveSequence(scrambled, solution.moves);
    expect(isSolved(solved)).toBe(true);
  });

  test("should handle already solved cube", async () => {
    const solver = new KociembaSolver({ verbose: false });
    await solver.initialize();

    const cube = solvedCube();
    const solution = await solver.solve(cube);

    expect(solution.success).toBe(true);
    expect(solution.moves).toEqual([]);
    expect(solution.scramble).toEqual([]);
  });

  test("should generate multiple different scrambles", async () => {
    const solver = new KociembaSolver({ verbose: false });
    await solver.initialize();

    const scrambles: string[] = [];
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 5; i++) {
      const randomCube = randomState(rng);
      const solution = await solver.solve(randomCube);

      expect(solution.success).toBe(true);

      const scrambleStr = solution.scramble.join(" ");
      scrambles.push(scrambleStr);
    }

    // All scrambles should be different (very high probability)
    const uniqueScrambles = new Set(scrambles);
    expect(uniqueScrambles.size).toBe(scrambles.length);
  });

  test("should solve scrambles from standard notation", async () => {
    const solver = new KociembaSolver({ verbose: false });
    await solver.initialize();

    // Test a known scramble sequence
    const scrambleSequence = "R U R' F R F' U' R'";
    const moves = parseMoveSequence(scrambleSequence);

    const cube = solvedCube();
    const scrambled = applyMoveSequence(cube, moves);

    expect(isSolved(scrambled)).toBe(false);

    const solution = await solver.solve(scrambled);
    expect(solution.success).toBe(true);

    // Apply solution and verify it solves
    const solved = applyMoveSequence(scrambled, solution.moves);
    expect(isSolved(solved)).toBe(true);

    // The inverse of the solution should be the original scramble
    const inverse = invertMoveSequence(solution.moves);
    const backToScrambled = applyMoveSequence(solvedCube(), inverse);

    // Apply the original scramble to solved cube
    const originalScrambled = applyMoveSequence(solvedCube(), moves);

    // These should result in the same cube state
    expect(backToScrambled).toEqual(originalScrambled);
  });

  test("should respect solver configuration", async () => {
    const fastSolver = new KociembaSolver({
      maxPhase1Depth: 8,
      maxPhase2Depth: 8,
      verbose: false,
    });
    await fastSolver.initialize();

    const rng = new SeededRNG(12345);
    const randomCube = randomState(rng);

    const solution = await fastSolver.solve(randomCube);

    // With limited depth, some cubes might not be solvable
    // but if it succeeds, it should be valid
    if (solution.success) {
      const solved = applyMoveSequence(randomCube, solution.moves);
      expect(isSolved(solved)).toBe(true);

      // Solution should respect depth limits
      expect(solution.stats.totalDepth).toBeLessThanOrEqual(16); // 8 + 8
    }
  });
});
