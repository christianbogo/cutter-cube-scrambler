/**
 * Core cubie model for Rubik's cube representation
 * Using the standard cubie approach with separate corner and edge arrays
 */

// Corner positions (clockwise from top-right-front)
export enum Corner {
  URF = 0,
  UFL = 1,
  ULB = 2,
  UBR = 3, // Upper layer
  DFR = 4,
  DLF = 5,
  DBL = 6,
  DRB = 7, // Down layer
}

// Edge positions
export enum Edge {
  UR = 0,
  UF = 1,
  UL = 2,
  UB = 3, // Upper layer
  DR = 4,
  DF = 5,
  DL = 6,
  DB = 7, // Down layer
  FR = 8,
  FL = 9,
  BL = 10,
  BR = 11, // Middle layer
}

// Face identifiers
export enum Face {
  U = 0,
  R = 1,
  F = 2,
  D = 3,
  L = 4,
  B = 5,
}

/**
 * Cube state represented by cubie positions and orientations
 */
export interface Cube {
  // Corner permutation: cPerm[i] = corner at position i
  cPerm: number[]; // length 8, values 0-7

  // Corner orientation: cOri[i] = orientation of corner at position i
  cOri: number[]; // length 8, values 0-2

  // Edge permutation: ePerm[i] = edge at position i
  ePerm: number[]; // length 12, values 0-11

  // Edge orientation: eOri[i] = orientation of edge at position i
  eOri: number[]; // length 12, values 0-1
}

/**
 * Move table representing a quarter turn or half turn
 */
export interface MoveTable {
  // How corners permute: newPos[i] = corner that moves to position i
  cornerPerm: number[]; // length 8

  // Corner orientation changes: added mod 3
  cornerOriDelta: number[]; // length 8, values 0-2

  // How edges permute: newPos[i] = edge that moves to position i
  edgePerm: number[]; // length 12

  // Edge orientation changes: XORed
  edgeOriDelta: number[]; // length 12, values 0-1
}

/**
 * Create a solved cube state
 */
export function solvedCube(): Cube {
  return {
    cPerm: [0, 1, 2, 3, 4, 5, 6, 7],
    cOri: [0, 0, 0, 0, 0, 0, 0, 0],
    ePerm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eOri: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * Apply a move to a cube state
 */
export function applyMove(cube: Cube, move: MoveTable): Cube {
  const result: Cube = {
    cPerm: new Array(8),
    cOri: new Array(8),
    ePerm: new Array(12),
    eOri: new Array(12),
  };

  // Apply corner permutation and orientation
  for (let i = 0; i < 8; i++) {
    const sourceCorner = move.cornerPerm[i];
    result.cPerm[i] = cube.cPerm[sourceCorner];
    result.cOri[i] = (cube.cOri[sourceCorner] + move.cornerOriDelta[i]) % 3;
  }

  // Apply edge permutation and orientation
  for (let i = 0; i < 12; i++) {
    const sourceEdge = move.edgePerm[i];
    result.ePerm[i] = cube.ePerm[sourceEdge];
    result.eOri[i] = cube.eOri[sourceEdge] ^ move.edgeOriDelta[i];
  }

  return result;
}

/**
 * Compose two moves: result = move2(move1(cube))
 */
export function composeMoves(move1: MoveTable, move2: MoveTable): MoveTable {
  const result: MoveTable = {
    cornerPerm: new Array(8),
    cornerOriDelta: new Array(8),
    edgePerm: new Array(12),
    edgeOriDelta: new Array(12),
  };

  // Compose corner operations
  for (let i = 0; i < 8; i++) {
    const intermediate = move1.cornerPerm[i];
    result.cornerPerm[i] = move2.cornerPerm[intermediate];
    result.cornerOriDelta[i] =
      (move1.cornerOriDelta[i] + move2.cornerOriDelta[intermediate]) % 3;
  }

  // Compose edge operations
  for (let i = 0; i < 12; i++) {
    const intermediate = move1.edgePerm[i];
    result.edgePerm[i] = move2.edgePerm[intermediate];
    result.edgeOriDelta[i] =
      move1.edgeOriDelta[i] ^ move2.edgeOriDelta[intermediate];
  }

  return result;
}

/**
 * Create inverse of a move
 */
export function invertMove(move: MoveTable): MoveTable {
  const result: MoveTable = {
    cornerPerm: new Array(8),
    cornerOriDelta: new Array(8),
    edgePerm: new Array(12),
    edgeOriDelta: new Array(12),
  };

  // Invert corner permutation and adjust orientations
  for (let i = 0; i < 8; i++) {
    const target = move.cornerPerm[i];
    result.cornerPerm[target] = i;
    result.cornerOriDelta[target] = (3 - move.cornerOriDelta[i]) % 3;
  }

  // Invert edge permutation and orientations
  for (let i = 0; i < 12; i++) {
    const target = move.edgePerm[i];
    result.edgePerm[target] = i;
    result.edgeOriDelta[target] = move.edgeOriDelta[i]; // XOR is self-inverse
  }

  return result;
}

/**
 * Check if two cube states are equal
 */
export function cubesEqual(cube1: Cube, cube2: Cube): boolean {
  return (
    arraysEqual(cube1.cPerm, cube2.cPerm) &&
    arraysEqual(cube1.cOri, cube2.cOri) &&
    arraysEqual(cube1.ePerm, cube2.ePerm) &&
    arraysEqual(cube1.eOri, cube2.eOri)
  );
}

/**
 * Check if cube is in solved state
 */
export function isSolved(cube: Cube): boolean {
  return cubesEqual(cube, solvedCube());
}

/**
 * Deep copy a cube state
 */
export function copyCube(cube: Cube): Cube {
  return {
    cPerm: [...cube.cPerm],
    cOri: [...cube.cOri],
    ePerm: [...cube.ePerm],
    eOri: [...cube.eOri],
  };
}

// Helper function
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Validate cube state satisfies group constraints
 */
export function isValidCube(cube: Cube): boolean {
  // Check corner permutation is valid
  if (!isValidPermutation(cube.cPerm, 8)) return false;

  // Check edge permutation is valid
  if (!isValidPermutation(cube.ePerm, 12)) return false;

  // Check corner and edge permutations have same parity
  if (parityOfPermutation(cube.cPerm) !== parityOfPermutation(cube.ePerm))
    return false;

  // Check corner orientations sum to 0 mod 3
  const cOriSum = cube.cOri.reduce((sum, ori) => sum + ori, 0);
  if (cOriSum % 3 !== 0) return false;

  // Check edge orientations sum to 0 mod 2
  const eOriSum = cube.eOri.reduce((sum, ori) => sum + ori, 0);
  if (eOriSum % 2 !== 0) return false;

  // Check orientation values are in valid range
  if (cube.cOri.some((ori) => ori < 0 || ori > 2)) return false;
  if (cube.eOri.some((ori) => ori < 0 || ori > 1)) return false;

  return true;
}

function isValidPermutation(perm: number[], n: number): boolean {
  if (perm.length !== n) return false;
  const seen = new Array(n).fill(false);
  for (const val of perm) {
    if (val < 0 || val >= n || seen[val]) return false;
    seen[val] = true;
  }
  return true;
}

export function parityOfPermutation(perm: number[]): number {
  let parity = 0;
  const seen = new Array(perm.length).fill(false);

  for (let i = 0; i < perm.length; i++) {
    if (!seen[i]) {
      let j = i;
      let cycleLength = 0;
      while (!seen[j]) {
        seen[j] = true;
        j = perm[j];
        cycleLength++;
      }
      if (cycleLength > 0) {
        parity ^= (cycleLength + 1) & 1;
      }
    }
  }

  return parity;
}
