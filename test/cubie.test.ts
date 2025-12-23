/**
 * Unit tests for cubie model and move operations
 */

import {
  Cube,
  solvedCube,
  applyMove,
  composeMoves,
  invertMove,
  cubesEqual,
  isSolved,
  isValidCube,
  parityOfPermutation,
} from "../src/core/cubie";
import { MOVES } from "../src/core/moves";

describe("Cubie Model", () => {
  test("should create solved cube", () => {
    const cube = solvedCube();
    expect(cube.cPerm).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(cube.cOri).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(cube.ePerm).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(cube.eOri).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  test("should recognize solved cube", () => {
    const cube = solvedCube();
    expect(isSolved(cube)).toBe(true);
  });

  test("should validate solved cube", () => {
    const cube = solvedCube();
    expect(isValidCube(cube)).toBe(true);
  });

  test("should apply move and return to solved with inverse", () => {
    const cube = solvedCube();
    const afterU = applyMove(cube, MOVES.U);
    expect(isSolved(afterU)).toBe(false);

    const afterUp = applyMove(afterU, MOVES.U);
    const afterU2 = applyMove(afterUp, MOVES.U);
    const afterU3 = applyMove(afterU2, MOVES.U);

    expect(cubesEqual(afterU3, cube)).toBe(true);
  });

  test("should compose moves correctly", () => {
    const cube = solvedCube();

    // Test U * U = U2
    const U2_composed = composeMoves(MOVES.U, MOVES.U);
    const afterU_twice = applyMove(applyMove(cube, MOVES.U), MOVES.U);
    const afterU2 = applyMove(cube, U2_composed);

    expect(cubesEqual(afterU_twice, afterU2)).toBe(true);
  });

  test("should invert moves correctly", () => {
    const cube = solvedCube();
    const U_inv = invertMove(MOVES.U);

    const afterU = applyMove(cube, MOVES.U);
    const afterU_inv = applyMove(afterU, U_inv);

    expect(cubesEqual(afterU_inv, cube)).toBe(true);
  });

  test("should calculate parity correctly", () => {
    expect(parityOfPermutation([0, 1, 2, 3])).toBe(0); // Even
    expect(parityOfPermutation([1, 0, 2, 3])).toBe(1); // Odd (one swap)
    expect(parityOfPermutation([1, 0, 3, 2])).toBe(0); // Even (two swaps)
  });

  test("should validate cube constraints", () => {
    // Valid cube (solved)
    expect(isValidCube(solvedCube())).toBe(true);

    // Invalid corner orientation sum
    const invalidCO: Cube = {
      cPerm: [0, 1, 2, 3, 4, 5, 6, 7],
      cOri: [1, 0, 0, 0, 0, 0, 0, 0], // Sum = 1, not 0 mod 3
      ePerm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      eOri: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    expect(isValidCube(invalidCO)).toBe(false);

    // Invalid edge orientation sum
    const invalidEO: Cube = {
      cPerm: [0, 1, 2, 3, 4, 5, 6, 7],
      cOri: [0, 0, 0, 0, 0, 0, 0, 0],
      ePerm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      eOri: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Sum = 1, not 0 mod 2
    };
    expect(isValidCube(invalidEO)).toBe(false);

    // Invalid parity
    const invalidParity: Cube = {
      cPerm: [1, 0, 2, 3, 4, 5, 6, 7], // Odd parity
      cOri: [0, 0, 0, 0, 0, 0, 0, 0],
      ePerm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Even parity
      eOri: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    expect(isValidCube(invalidParity)).toBe(false);
  });
});
