/**
 * Uniform random state generator for Rubik's cube
 * Generates valid cube states uniformly distributed across the cube group
 * Respects parity and orientation constraints
 */

import { Cube, parityOfPermutation, isValidCube } from "../core/cubie";

/**
 * Seedable pseudorandom number generator (Mulberry32)
 * Provides deterministic random sequences when seeded
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed;
  }

  /**
   * Generate a random number in [0, 1)
   */
  random(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random integer in [0, max)
   */
  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  /**
   * Generate a random integer in [min, max)
   */
  randomRange(min: number, max: number): number {
    return min + this.randomInt(max - min);
  }
}

/**
 * Generate a uniform random cube state
 */
export function randomState(rng: SeededRNG = new SeededRNG()): Cube {
  // Generate corner permutation
  const cPerm = randomPermutation(8, rng);
  const cornerParity = parityOfPermutation(cPerm);

  // Generate edge permutation with matching parity
  let ePerm = randomPermutation(12, rng);
  const edgeParity = parityOfPermutation(ePerm);

  if (cornerParity !== edgeParity) {
    // Swap two elements to fix parity
    [ePerm[0], ePerm[1]] = [ePerm[1], ePerm[0]];
  }

  // Generate corner orientations (sum must be 0 mod 3)
  const cOri = new Array(8);
  let cOriSum = 0;
  for (let i = 0; i < 7; i++) {
    cOri[i] = rng.randomInt(3);
    cOriSum = (cOriSum + cOri[i]) % 3;
  }
  cOri[7] = (3 - cOriSum) % 3;

  // Generate edge orientations (sum must be 0 mod 2)
  const eOri = new Array(12);
  let eOriSum = 0;
  for (let i = 0; i < 11; i++) {
    eOri[i] = rng.randomInt(2);
    eOriSum ^= eOri[i];
  }
  eOri[11] = eOriSum;

  const cube: Cube = { cPerm, cOri, ePerm, eOri };

  // Validate the generated state
  if (!isValidCube(cube)) {
    throw new Error("Generated invalid cube state");
  }

  return cube;
}

/**
 * Generate a random permutation of [0, 1, ..., n-1]
 * Uses Fisher-Yates shuffle for uniform distribution
 */
export function randomPermutation(n: number, rng: SeededRNG): number[] {
  const array = Array.from({ length: n }, (_, i) => i);

  // Fisher-Yates shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = rng.randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/**
 * Generate multiple random states
 */
export function randomStates(
  count: number,
  rng: SeededRNG = new SeededRNG()
): Cube[] {
  const states: Cube[] = [];
  for (let i = 0; i < count; i++) {
    states.push(randomState(rng));
  }
  return states;
}

/**
 * Generate a random state with specific seed for reproducibility
 */
export function randomStateWithSeed(seed: number): Cube {
  const rng = new SeededRNG(seed);
  return randomState(rng);
}

/**
 * Test the uniformity of the random state generator
 * Returns statistics about generated states
 */
export interface UniformityStats {
  totalStates: number;
  validStates: number;
  cornerParityDistribution: { even: number; odd: number };
  edgeParityDistribution: { even: number; odd: number };
  cornerOrientationSums: number[]; // Histogram of orientation sums mod 3
  edgeOrientationSums: number[]; // Histogram of orientation sums mod 2
}

export function testUniformity(
  sampleSize: number = 10000,
  seed?: number
): UniformityStats {
  const rng = seed !== undefined ? new SeededRNG(seed) : new SeededRNG();

  const stats: UniformityStats = {
    totalStates: sampleSize,
    validStates: 0,
    cornerParityDistribution: { even: 0, odd: 0 },
    edgeParityDistribution: { even: 0, odd: 0 },
    cornerOrientationSums: [0, 0, 0], // Index 0, 1, 2 for sums mod 3
    edgeOrientationSums: [0, 0], // Index 0, 1 for sums mod 2
  };

  for (let i = 0; i < sampleSize; i++) {
    const cube = randomState(rng);

    if (isValidCube(cube)) {
      stats.validStates++;

      // Check corner parity
      const cParity = parityOfPermutation(cube.cPerm);
      if (cParity === 0) stats.cornerParityDistribution.even++;
      else stats.cornerParityDistribution.odd++;

      // Check edge parity
      const eParity = parityOfPermutation(cube.ePerm);
      if (eParity === 0) stats.edgeParityDistribution.even++;
      else stats.edgeParityDistribution.odd++;

      // Check corner orientation sum
      const cOriSum = cube.cOri.reduce((sum, ori) => sum + ori, 0) % 3;
      stats.cornerOrientationSums[cOriSum]++;

      // Check edge orientation sum
      const eOriSum = cube.eOri.reduce((sum, ori) => sum + ori, 0) % 2;
      stats.edgeOrientationSums[eOriSum]++;
    }
  }

  return stats;
}

/**
 * Check if random state generator produces valid distributions
 */
export function validateUniformity(
  stats: UniformityStats,
  tolerance: number = 0.05
): boolean {
  const { totalStates, validStates } = stats;

  // All states should be valid
  if (validStates !== totalStates) {
    console.warn(
      `Invalid states generated: ${totalStates - validStates}/${totalStates}`
    );
    return false;
  }

  // Check corner/edge parity should be equal (both even or both odd)
  if (
    stats.cornerParityDistribution.even !== stats.edgeParityDistribution.even
  ) {
    console.warn("Corner and edge parity distributions do not match");
    return false;
  }

  // Check corner orientation sum distribution (should all be 0 mod 3)
  if (
    stats.cornerOrientationSums[1] > 0 ||
    stats.cornerOrientationSums[2] > 0
  ) {
    console.warn("Corner orientations not properly constrained");
    return false;
  }

  // Check edge orientation sum distribution (should all be 0 mod 2)
  if (stats.edgeOrientationSums[1] > 0) {
    console.warn("Edge orientations not properly constrained");
    return false;
  }

  // Check parity distribution is roughly 50/50
  const evenRatio = stats.cornerParityDistribution.even / totalStates;
  if (Math.abs(evenRatio - 0.5) > tolerance) {
    console.warn(`Parity distribution skewed: ${evenRatio} (expected ~0.5)`);
    return false;
  }

  return true;
}

/**
 * Utility function to create deterministic sequences for testing
 */
export function createTestSequence(length: number, seed: number): Cube[] {
  const rng = new SeededRNG(seed);
  return randomStates(length, rng);
}
