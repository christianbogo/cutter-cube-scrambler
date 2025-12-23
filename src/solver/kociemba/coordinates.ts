/**
 * Coordinate mappings for Kociemba's two-phase algorithm
 * Maps cube states to lower-dimensional coordinates for efficient solving
 */

import { Cube, MoveTable, applyMove, solvedCube } from "../../core/cubie";
import { ALL_MOVES, MoveKey, MOVE_KEYS } from "../../core/moves";

// Phase 1 coordinate sizes
export const EO_SIZE = 2048; // 2^11 edge orientations
export const CO_SIZE = 2187; // 3^7 corner orientations
export const ESLICE_SIZE = 5; // 0-4 misplaced E-slice edges

// Phase 2 coordinate sizes
export const CP_SIZE = 40320; // 8! corner permutations
export const UDEP_SIZE = 576; // 4! * 4! / 2 UD-edge permutations
export const EP_SIZE = 24; // 4! E-slice edge permutations

// E-slice edges (middle layer)
const E_EDGES = [4, 5, 6, 7]; // DR, DF, DL, DB edges

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
 * E-slice coordinate (0 to 15)
 * Simple implementation: count E-slice edges NOT in E-slice positions
 * 0 = all E-slice edges are in E-slice positions (goal state)
 */
export function getESlice(cube: Cube): number {
  let misplacedCount = 0;

  // Check each E-slice edge to see if it's in an E-slice position
  for (let i = 0; i < 4; i++) {
    const edge = E_EDGES[i]; // Which E-slice edge (4,5,6,7)
    const position = cube.ePerm.indexOf(edge); // Where is this edge?

    if (position < 4 || position >= 8) {
      // E-slice edge is NOT in E-slice positions (4,5,6,7)
      misplacedCount++;
    }
  }

  return misplacedCount;
}

export function setESlice(cube: Cube, coord: number): void {
  // This simple coordinate can't uniquely determine edge positions
  // So we'll just ensure the E-slice edges are in the right layer
  // This is mainly used for pruning table generation

  if (coord === 0) {
    // Goal state: put all E-slice edges in E-slice positions
    for (let i = 0; i < 4; i++) {
      cube.ePerm[4 + i] = E_EDGES[i];
    }
  } else {
    // Non-goal state: put some E-slice edges in wrong positions
    // This is a simplified approach for table generation
    for (let i = 0; i < Math.min(coord, 4); i++) {
      cube.ePerm[i] = E_EDGES[i]; // Put E-slice edge in U layer
    }
    for (let i = coord; i < 4; i++) {
      cube.ePerm[4 + i] = E_EDGES[i]; // Keep remaining in E-slice
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
 * UD-Edge Permutation coordinate (0 to 575)
 * Combines U and D edge permutations with parity constraint
 */
export function getUDEdgePermutation(cube: Cube): number {
  // Extract U-layer edges (positions 0,1,2,3) and D-layer edges (positions 4,5,6,7)
  const uEdges: number[] = [];
  const dEdges: number[] = [];

  // Find where the U and D edges are positioned
  for (let pos = 0; pos < 12; pos++) {
    const edge = cube.ePerm[pos];
    if (edge >= 0 && edge < 4) {
      // This is a U-layer edge, record its position
      uEdges[edge] = pos;
    } else if (edge >= 4 && edge < 8) {
      // This is a D-layer edge, record its position
      dEdges[edge - 4] = pos;
    }
  }

  // Convert positions to permutation indices within their respective layers
  const uPerm = uEdges.map((pos) => {
    if (pos < 4) return pos; // In U layer
    if (pos < 8) return pos - 4; // In D layer, map to 0-3
    return pos - 8; // In middle layer, map to 0-3
  });

  const dPerm = dEdges.map((pos) => {
    if (pos < 4) return pos; // In U layer
    if (pos < 8) return pos - 4; // In D layer, map to 0-3
    return pos - 8; // In middle layer, map to 0-3
  });

  const uPermIndex = permutationToIndex(uPerm);
  const dPermIndex = permutationToIndex(dPerm);

  return uPermIndex * 24 + dPermIndex;
}

export function setUDEdgePermutation(cube: Cube, coord: number): void {
  const dPermIndex = coord % 24;
  const uPermIndex = Math.floor(coord / 24);

  const uPerm = indexToPermutation(uPermIndex, 4);
  const dPerm = indexToPermutation(dPermIndex, 4);

  // Place U edges in U positions
  for (let i = 0; i < 4; i++) {
    cube.ePerm[uPerm[i]] = i; // U edge i goes to position uPerm[i]
  }

  // Place D edges in D positions
  for (let i = 0; i < 4; i++) {
    cube.ePerm[4 + dPerm[i]] = 4 + i; // D edge 4+i goes to position 4+dPerm[i]
  }
}

/**
 * E-slice Edge Permutation coordinate (0 to 23)
 * Permutation of the 4 E-slice edges within the E-slice
 */
export function getESlicePermutation(cube: Cube): number {
  const eSlicePermutation: number[] = [];

  // Find where each E-slice edge is positioned within the E-slice positions (4,5,6,7)
  for (let eSliceEdge = 0; eSliceEdge < 4; eSliceEdge++) {
    const actualEdge = E_EDGES[eSliceEdge]; // DR=4, DF=5, DL=6, DB=7

    // Find which E-slice position (4,5,6,7) contains this edge
    for (let pos = 4; pos < 8; pos++) {
      if (cube.ePerm[pos] === actualEdge) {
        eSlicePermutation[eSliceEdge] = pos - 4; // Map position 4,5,6,7 to 0,1,2,3
        break;
      }
    }
  }

  return permutationToIndex(eSlicePermutation);
}

export function setESlicePermutation(cube: Cube, coord: number): void {
  const perm = indexToPermutation(coord, 4);

  // Place E-slice edges according to the permutation
  for (let i = 0; i < 4; i++) {
    cube.ePerm[4 + perm[i]] = E_EDGES[i];
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

  // E-slice edges must be in E-slice positions (4,5,6,7)
  const eSlicePositions = [4, 5, 6, 7];
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
