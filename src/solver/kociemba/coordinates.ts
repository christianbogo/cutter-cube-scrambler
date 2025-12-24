/**
 * Coordinate mappings for Kociemba's two-phase algorithm
 * Maps cube states to lower-dimensional coordinates for efficient solving
 */

import { Cube, MoveTable, applyMove, solvedCube } from "../../core/cubie";
import { ALL_MOVES, MoveKey, MOVE_KEYS } from "../../core/moves";

// Phase 1 coordinate sizes
// Phase 1 coordinate sizes
export const EO_SIZE = 2048; // 2^11 edge orientations
export const CO_SIZE = 2187; // 3^7 corner orientations
export const ESLICE_SIZE = 495; // C(12,4) E-slice positions

// Phase 2 coordinate sizes
export const CP_SIZE = 40320; // 8! corner permutations
export const UDEP_SIZE = 40320; // 8! UD-edge permutations
export const EP_SIZE = 24; // 4! E-slice edge permutations

// E-slice edges (middle layer)
// FR=8, FL=9, BL=10, BR=11
const E_EDGES = [8, 9, 10, 11];

/**
 * Phase 1 coordinates
 */

/**
 * Edge Orientation coordinate (0 to 2047)
 * Uses first 11 edges as bits, 12th is determined
 */
export function getEdgeOrientation(cube: Cube): number {
  let coord = 0;
  for (let i = 0; i < 11; i++) {
    coord = (coord << 1) | cube.eOri[i];
  }
  return coord;
}

export function setEdgeOrientation(cube: Cube, coord: number): void {
  let sum = 0;
  for (let i = 10; i >= 0; i--) {
    cube.eOri[i] = coord & 1;
    sum ^= cube.eOri[i];
    coord >>= 1;
  }
  cube.eOri[11] = sum; // Ensure even sum
}

/**
 * Corner Orientation coordinate (0 to 2186)
 * Uses first 7 corners in base 3, 8th is determined
 */
export function getCornerOrientation(cube: Cube): number {
  let coord = 0;
  for (let i = 0; i < 7; i++) {
    coord = coord * 3 + cube.cOri[i];
  }
  return coord;
}

export function setCornerOrientation(cube: Cube, coord: number): void {
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    cube.cOri[i] = coord % 3;
    sum = (sum + cube.cOri[i]) % 3;
    coord = Math.floor(coord / 3);
  }
  cube.cOri[7] = (3 - sum) % 3; // Ensure sum is 0 mod 3
}

/**
 * E-slice coordinate (0 to 494)
 * Represents the positions of the 4 E-slice edges among the 12 edge positions.
 * This corresponds to C(12,4) = 495 possible combinations.
 */
export function getESlice(cube: Cube): number {
  let coord = 0;
  let r = 4;
  for (let i = 11; i >= 0; i--) {
    if (cube.ePerm[i] >= 8) {
      // This is an E-slice edge
      coord += binomial(i, r);
      r--;
    }
  }
  return 494 - coord;
}

export function setESlice(cube: Cube, rawCoord: number): void {
  const coord = 494 - rawCoord;

  // Reset edges
  // Mark all positions as "non-E-slice" (e.g. edge 0)
  for (let i = 0; i < 12; i++) cube.ePerm[i] = 0;

  let r = 4;
  let c = coord;
  for (let i = 11; i >= 0; i--) {
    if (c >= binomial(i, r)) {
      c -= binomial(i, r);
      cube.ePerm[i] = 8 + (4 - r); // Set as one of the E-slice edges
      r--;
    } else {
      // Not an E-slice edge spot
      cube.ePerm[i] = 0; // Set as non-E-slice
    }
  }
}



/**
 * Phase 2 coordinates
 */

/**
 * Corner Permutation coordinate (0 to 40319)
 */
export function getCornerPermutation(cube: Cube): number {
  return permutationToIndex(cube.cPerm);
}

export function setCornerPermutation(cube: Cube, coord: number): void {
  cube.cPerm = indexToPermutation(coord, 8);
}

/**
 * UD-Edge Permutation coordinate (0 to 40319)
 * Permutation of the 8 UD-slice edges (0-7) within their 8 positions.
 */
export function getUDEdgePermutation(cube: Cube): number {
  const perm: number[] = [];

  // Find relative permutation of edges 0-7
  // They are at positions where ePerm[pos] < 8

  // We strictly look at the 8 UD-slice edges (0-7).
  // In G1, they must be in the 8 UD-slice positions (0-7).
  // But we need to handle cases where they are not? 
  // Phase 2 assumes we are in G1.

  const udEdges = [0, 1, 2, 3, 4, 5, 6, 7];

  // We want to construct an array of length 8 representing the permutation.
  // The value at index i (0..7) is the EDGE present at the i-th UD-slice position.
  // Actually, standard permutationToIndex takes an array where result[i] is the element at position i.

  let k = 0;
  for (let i = 0; i < 12; i++) {
    if (cube.ePerm[i] < 8) {
      // This position contains a UD-edge.
      // Wait, if input is not in G1, this might collect edges < 8 from E-slice positions too.
      // Phase 2 coordinates are only valid in G1.
      // In G1, positions 0..7 contain edges 0..7.
      // So we just read cube.ePerm[0..7].
      if (i < 8) {
        perm[i] = cube.ePerm[i];
      } else {
        // If we are in G1, this shouldn't happen.
        // If we are mostly in G1, we expect 8 edges in 0-7.
      }
    }
  }

  // If we are in G1, cube.ePerm[0..7] contains a permutation of 0..7.
  // We can just take that slice.
  // BUT: The positions 0..7 map to edges 0..7.
  // let's verify positions. 0..3 are U, 4..7 are D.
  // And edges 0..3 are U, 4..7 are D.
  // So yes.

  // Use first 8 positions
  const udPermSlice = cube.ePerm.slice(0, 8);
  return permutationToIndex(udPermSlice);
}

export function setUDEdgePermutation(cube: Cube, coord: number): void {
  const perm = indexToPermutation(coord, 8);

  for (let i = 0; i < 8; i++) {
    cube.ePerm[i] = perm[i];
  }
}

/**
 * E-slice Edge Permutation coordinate (0 to 23)
 * Permutation of the 4 E-slice edges within the E-slice
 */
export function getESlicePermutation(cube: Cube): number {
  const eSlicePermutation: number[] = [];

  // In G1, E-edges are in positions 8,9,10,11
  // We want to know which edge is in 8, which in 9, etc.

  for (let i = 0; i < 4; i++) {
    // Check edge at position 8+i
    const edge = cube.ePerm[8 + i];
    // Map edge 8->0, 9->1, 10->2, 11->3
    eSlicePermutation[i] = edge - 8;
  }

  return permutationToIndex(eSlicePermutation);
}

export function setESlicePermutation(cube: Cube, coord: number): void {
  const perm = indexToPermutation(coord, 4);

  // Place E-slice edges (8-11) according to the permutation
  // In G1, E-slice edges are at positions 8-11
  for (let i = 0; i < 4; i++) {
    cube.ePerm[8 + i] = E_EDGES[perm[i]]; // Map 0->8, 1->9 etc
    // Wait, E_EDGES is [8,9,10,11]. perm[i] is 0..3.
    // So perm[0]=1 means first slot (8) has edge 9.
  }
}

/**
 * Move tables for coordinates
 */

// Edge orientation move table
const EO_MOVE_TABLE: number[][] = [];

// Corner orientation move table
const CO_MOVE_TABLE: number[][] = [];

// E-slice move table
const ESLICE_MOVE_TABLE: number[][] = [];

// Corner permutation move table
const CP_MOVE_TABLE: number[][] = [];

// UD-edge permutation move table
const UDEP_MOVE_TABLE: number[][] = [];

// E-slice permutation move table
const EP_MOVE_TABLE: number[][] = [];

/**
 * Initialize move tables
 */
export function initializeMoveTables(): void {
  console.log("Initializing coordinate move tables...");

  // Initialize arrays
  for (let i = 0; i < 18; i++) {
    EO_MOVE_TABLE[i] = new Array(EO_SIZE);
    CO_MOVE_TABLE[i] = new Array(CO_SIZE);
    ESLICE_MOVE_TABLE[i] = new Array(ESLICE_SIZE);
    CP_MOVE_TABLE[i] = new Array(CP_SIZE);
    UDEP_MOVE_TABLE[i] = new Array(UDEP_SIZE);
    EP_MOVE_TABLE[i] = new Array(EP_SIZE);
  }

  // Build each table
  buildCoordinateMoveTable(
    EO_SIZE,
    getEdgeOrientation,
    setEdgeOrientation,
    EO_MOVE_TABLE
  );
  buildCoordinateMoveTable(
    CO_SIZE,
    getCornerOrientation,
    setCornerOrientation,
    CO_MOVE_TABLE
  );
  buildCoordinateMoveTable(
    ESLICE_SIZE,
    getESlice,
    setESlice,
    ESLICE_MOVE_TABLE
  );
  buildCoordinateMoveTable(
    CP_SIZE,
    getCornerPermutation,
    setCornerPermutation,
    CP_MOVE_TABLE
  );
  buildCoordinateMoveTable(
    UDEP_SIZE,
    getUDEdgePermutation,
    setUDEdgePermutation,
    UDEP_MOVE_TABLE
  );
  buildCoordinateMoveTable(
    EP_SIZE,
    getESlicePermutation,
    setESlicePermutation,
    EP_MOVE_TABLE
  );

  console.log("Move tables initialized.");
}

/**
 * Build a move table for a coordinate
 */
function buildCoordinateMoveTable(
  size: number,
  getCoord: (cube: Cube) => number,
  setCoord: (cube: Cube, coord: number) => void,
  moveTable: number[][]
): void {
  for (let coord = 0; coord < size; coord++) {
    // Start with solved cube and set to this coordinate
    const tempCube = solvedCube();
    setCoord(tempCube, coord);

    for (let moveIdx = 0; moveIdx < 18; moveIdx++) {
      const move = ALL_MOVES[MOVE_KEYS[moveIdx]];
      const resultCube = applyMove(tempCube, move);
      moveTable[moveIdx][coord] = getCoord(resultCube);
    }
  }
}

/**
 * Get coordinate after applying a move
 */
export function applyMoveToEO(coord: number, moveIdx: number): number {
  return EO_MOVE_TABLE[moveIdx][coord];
}

export function applyMoveToCO(coord: number, moveIdx: number): number {
  return CO_MOVE_TABLE[moveIdx][coord];
}

export function applyMoveToESlice(coord: number, moveIdx: number): number {
  return ESLICE_MOVE_TABLE[moveIdx][coord];
}

export function applyMoveToCP(coord: number, moveIdx: number): number {
  return CP_MOVE_TABLE[moveIdx][coord];
}

export function applyMoveToUDEP(coord: number, moveIdx: number): number {
  return UDEP_MOVE_TABLE[moveIdx][coord];
}

export function applyMoveToEP(coord: number, moveIdx: number): number {
  return EP_MOVE_TABLE[moveIdx][coord];
}

/**
 * Composite Move Functions (Phase 2 optimization)
 * Combine CP+EP and UDEP+EP for larger pruning tables.
 */
export const CP_EP_SIZE = CP_SIZE * EP_SIZE;
export const UDEP_EP_SIZE = UDEP_SIZE * EP_SIZE;

export function applyMoveToCP_EP(coord: number, moveIdx: number): number {
  const cp = Math.floor(coord / EP_SIZE);
  const ep = coord % EP_SIZE;

  const nextCp = CP_MOVE_TABLE[moveIdx][cp];
  const nextEp = EP_MOVE_TABLE[moveIdx][ep];

  return nextCp * EP_SIZE + nextEp;
}

export function applyMoveToUDEP_EP(coord: number, moveIdx: number): number {
  const udep = Math.floor(coord / EP_SIZE);
  const ep = coord % EP_SIZE;

  const nextUdep = UDEP_MOVE_TABLE[moveIdx][udep];
  const nextEp = EP_MOVE_TABLE[moveIdx][ep];

  return nextUdep * EP_SIZE + nextEp;
}

/**
 * Utility functions
 */

function binomial(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.floor(result);
}

function permutationToIndex(perm: number[]): number {
  const n = perm.length;
  let index = 0;
  let factorial = 1;

  for (let i = 0; i < n; i++) {
    factorial *= i + 1;
  }

  for (let i = 0; i < n; i++) {
    factorial /= n - i;
    let rank = 0;
    for (let j = i + 1; j < n; j++) {
      if (perm[j] < perm[i]) rank++;
    }
    index += rank * factorial;
  }

  return index;
}

function indexToPermutation(index: number, n: number): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  let factorial = 1;

  for (let i = 2; i <= n; i++) {
    factorial *= i;
  }

  for (let i = 0; i < n; i++) {
    factorial /= n - i;
    const rank = Math.floor(index / factorial);
    index %= factorial;

    const temp = perm[i + rank];
    for (let j = i + rank; j > i; j--) {
      perm[j] = perm[j - 1];
    }
    perm[i] = temp;
  }

  return perm;
}

/**
 * Check if cube is in Phase 1 target (G1 subgroup)
 */
export function isInG1(cube: Cube): boolean {
  // All edges must be oriented
  for (let i = 0; i < 12; i++) {
    if (cube.eOri[i] !== 0) return false;
  }

  // E-slice edges must be in E-slice positions (8,9,10,11)
  const eSlicePositions = [8, 9, 10, 11];
  const edgesInESlice = eSlicePositions.map((pos) => cube.ePerm[pos]);
  const eSliceInPlace = E_EDGES.every((edge) => edgesInESlice.includes(edge));

  return eSliceInPlace;
}

/**
 * Phase 1 coordinate structure
 */
export interface Phase1Coord {
  eo: number;
  co: number;
  eslice: number;
}

/**
 * Phase 2 coordinate structure
 */
export interface Phase2Coord {
  cp: number;
  udep: number;
  ep: number;
}

/**
 * Get Phase 1 coordinates from cube
 */
export function getPhase1Coord(cube: Cube): Phase1Coord {
  return {
    eo: getEdgeOrientation(cube),
    co: getCornerOrientation(cube),
    eslice: getESlice(cube),
  };
}

/**
 * Get Phase 2 coordinates from cube
 */
export function getPhase2Coord(cube: Cube): Phase2Coord {
  return {
    cp: getCornerPermutation(cube),
    udep: getUDEdgePermutation(cube),
    ep: getESlicePermutation(cube),
  };
}
