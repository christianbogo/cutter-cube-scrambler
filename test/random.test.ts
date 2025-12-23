/**
 * Unit tests for random state generation
 */

import {
  SeededRNG,
  randomState,
  randomStateWithSeed,
  testUniformity,
  validateUniformity,
} from "../src/random/state";
import { isValidCube, parityOfPermutation } from "../src/core/cubie";

describe("Random State Generator", () => {
  test("should generate deterministic sequences with seed", () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const values1 = Array.from({ length: 10 }, () => rng1.random());
    const values2 = Array.from({ length: 10 }, () => rng2.random());

    expect(values1).toEqual(values2);
  });

  test("should generate different sequences with different seeds", () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    const values1 = Array.from({ length: 10 }, () => rng1.random());
    const values2 = Array.from({ length: 10 }, () => rng2.random());

    expect(values1).not.toEqual(values2);
  });

  test("should generate valid cube states", () => {
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      const cube = randomState(rng);
      expect(isValidCube(cube)).toBe(true);
    }
  });

  test("should respect parity constraints", () => {
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      const cube = randomState(rng);
      const cParity = parityOfPermutation(cube.cPerm);
      const eParity = parityOfPermutation(cube.ePerm);
      expect(cParity).toBe(eParity);
    }
  });

  test("should respect orientation constraints", () => {
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      const cube = randomState(rng);

      // Corner orientations sum to 0 mod 3
      const cOriSum = cube.cOri.reduce((sum, ori) => sum + ori, 0);
      expect(cOriSum % 3).toBe(0);

      // Edge orientations sum to 0 mod 2
      const eOriSum = cube.eOri.reduce((sum, ori) => sum + ori, 0);
      expect(eOriSum % 2).toBe(0);
    }
  });

  test("should generate same state with same seed", () => {
    const cube1 = randomStateWithSeed(12345);
    const cube2 = randomStateWithSeed(12345);

    expect(cube1).toEqual(cube2);
  });

  test("should pass uniformity tests", () => {
    const stats = testUniformity(1000, 12345);
    expect(validateUniformity(stats, 0.1)).toBe(true);

    // All states should be valid
    expect(stats.validStates).toBe(stats.totalStates);

    // Parity distributions should match
    expect(stats.cornerParityDistribution.even).toBe(
      stats.edgeParityDistribution.even
    );
    expect(stats.cornerParityDistribution.odd).toBe(
      stats.edgeParityDistribution.odd
    );

    // Orientation constraints should be satisfied
    expect(stats.cornerOrientationSums[1]).toBe(0);
    expect(stats.cornerOrientationSums[2]).toBe(0);
    expect(stats.edgeOrientationSums[1]).toBe(0);
  });

  test("should have roughly equal parity distribution", () => {
    const stats = testUniformity(2000, 12345);
    const total = stats.totalStates;
    const evenRatio = stats.cornerParityDistribution.even / total;

    // Should be roughly 50/50, allow 10% tolerance
    expect(Math.abs(evenRatio - 0.5)).toBeLessThan(0.1);
  });
});
