/**
 * Move definitions for all six face quarter turns
 * Each face turn is defined by how it permutes corners and edges
 * and how it changes their orientations
 */

import { MoveTable, Corner, Edge, composeMoves, invertMove } from "./cubie";

// Define the six basic quarter-turn moves
export const MOVES = {
  U: createUMove(),
  R: createRMove(),
  F: createFMove(),
  D: createDMove(),
  L: createLMove(),
  B: createBMove(),
} as const;

// Also create derived moves (prime and double)
export const ALL_MOVES = {
  U: MOVES.U,
  U2: composeMoves(MOVES.U, MOVES.U),
  Up: invertMove(MOVES.U),

  R: MOVES.R,
  R2: composeMoves(MOVES.R, MOVES.R),
  Rp: invertMove(MOVES.R),

  F: MOVES.F,
  F2: composeMoves(MOVES.F, MOVES.F),
  Fp: invertMove(MOVES.F),

  D: MOVES.D,
  D2: composeMoves(MOVES.D, MOVES.D),
  Dp: invertMove(MOVES.D),

  L: MOVES.L,
  L2: composeMoves(MOVES.L, MOVES.L),
  Lp: invertMove(MOVES.L),

  B: MOVES.B,
  B2: composeMoves(MOVES.B, MOVES.B),
  Bp: invertMove(MOVES.B),
} as const;

export type MoveKey = keyof typeof ALL_MOVES;

// Move indices for compact representation
export enum MoveIndex {
  U = 0,
  U2 = 1,
  Up = 2,
  R = 3,
  R2 = 4,
  Rp = 5,
  F = 6,
  F2 = 7,
  Fp = 8,
  D = 9,
  D2 = 10,
  Dp = 11,
  L = 12,
  L2 = 13,
  Lp = 14,
  B = 15,
  B2 = 16,
  Bp = 17,
}

export const MOVE_KEYS: MoveKey[] = [
  "U",
  "U2",
  "Up",
  "R",
  "R2",
  "Rp",
  "F",
  "F2",
  "Fp",
  "D",
  "D2",
  "Dp",
  "L",
  "L2",
  "Lp",
  "B",
  "B2",
  "Bp",
];

/**
 * U face quarter turn clockwise
 * Rotates: URF->UBR->ULB->UFL corners, UR->UB->UL->UF edges
 */
function createUMove(): MoveTable {
  return {
    // Corner permutation: URF->UBR->ULB->UFL, others unchanged
    cornerPerm: [
      Corner.UBR, // position 0 (URF) gets corner from UBR
      Corner.URF, // position 1 (UFL) gets corner from URF
      Corner.UFL, // position 2 (ULB) gets corner from UFL
      Corner.ULB, // position 3 (UBR) gets corner from ULB
      Corner.DFR, // Down layer unchanged
      Corner.DLF,
      Corner.DBL,
      Corner.DRB,
    ],

    // Corner orientations unchanged for U turn
    cornerOriDelta: [0, 0, 0, 0, 0, 0, 0, 0],

    // Edge permutation: UR->UB->UL->UF, others unchanged
    edgePerm: [
      Edge.UB, // position 0 (UR) gets edge from UB
      Edge.UR, // position 1 (UF) gets edge from UR
      Edge.UF, // position 2 (UL) gets edge from UF
      Edge.UL, // position 3 (UB) gets edge from UL
      Edge.DR, // Down and middle layers unchanged
      Edge.DF,
      Edge.DL,
      Edge.DB,
      Edge.FR,
      Edge.FL,
      Edge.BL,
      Edge.BR,
    ],

    // Edge orientations unchanged for U turn
    edgeOriDelta: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * R face quarter turn clockwise
 * Rotates: URF->DFR->DRB->UBR corners, UR->FR->DR->BR edges
 */
function createRMove(): MoveTable {
  return {
    cornerPerm: [
      Corner.DFR, // URF -> DFR
      Corner.UFL, // UFL unchanged
      Corner.ULB, // ULB unchanged
      Corner.URF, // UBR -> URF
      Corner.DRB, // DFR -> DRB
      Corner.DLF, // DLF unchanged
      Corner.DBL, // DBL unchanged
      Corner.UBR, // DRB -> UBR
    ],

    // Corner orientations: R face turns change orientation
    cornerOriDelta: [2, 0, 0, 1, 1, 0, 0, 2],

    edgePerm: [
      Edge.FR, // UR -> FR
      Edge.UF, // UF unchanged
      Edge.UL, // UL unchanged
      Edge.UB, // UB unchanged
      Edge.BR, // DR -> BR
      Edge.DF, // DF unchanged
      Edge.DL, // DL unchanged
      Edge.DB, // DB unchanged
      Edge.DR, // FR -> DR
      Edge.FL, // FL unchanged
      Edge.BL, // BL unchanged
      Edge.UR, // BR -> UR
    ],

    edgeOriDelta: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * F face quarter turn clockwise
 * Rotates: URF->UFL->DLF->DFR corners, UF->FL->DF->FR edges
 */
function createFMove(): MoveTable {
  return {
    cornerPerm: [
      Corner.UFL, // URF -> UFL
      Corner.DLF, // UFL -> DLF
      Corner.ULB, // ULB unchanged
      Corner.UBR, // UBR unchanged
      Corner.URF, // DFR -> URF
      Corner.DFR, // DLF -> DFR
      Corner.DBL, // DBL unchanged
      Corner.DRB, // DRB unchanged
    ],

    // F face turns change corner orientations differently
    cornerOriDelta: [1, 2, 0, 0, 2, 1, 0, 0],

    edgePerm: [
      Edge.UR, // UR unchanged
      Edge.FL, // UF -> FL
      Edge.UL, // UL unchanged
      Edge.UB, // UB unchanged
      Edge.DR, // DR unchanged
      Edge.FR, // DF -> FR
      Edge.DL, // DL unchanged
      Edge.DB, // DB unchanged
      Edge.UF, // FR -> UF
      Edge.DF, // FL -> DF
      Edge.BL, // BL unchanged
      Edge.BR, // BR unchanged
    ],

    // F face turns flip edge orientations
    edgeOriDelta: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
  };
}

/**
 * D face quarter turn clockwise
 * Rotates: DFR->DLF->DBL->DRB corners, DR->DF->DL->DB edges
 */
function createDMove(): MoveTable {
  return {
    cornerPerm: [
      Corner.URF, // Upper layer unchanged
      Corner.UFL,
      Corner.ULB,
      Corner.UBR,
      Corner.DLF, // DFR -> DLF
      Corner.DBL, // DLF -> DBL
      Corner.DRB, // DBL -> DRB
      Corner.DFR, // DRB -> DFR
    ],

    cornerOriDelta: [0, 0, 0, 0, 0, 0, 0, 0],

    edgePerm: [
      Edge.UR, // Upper layer unchanged
      Edge.UF,
      Edge.UL,
      Edge.UB,
      Edge.DF, // DR -> DF
      Edge.DL, // DF -> DL
      Edge.DB, // DL -> DB
      Edge.DR, // DB -> DR
      Edge.FR, // Middle layer unchanged
      Edge.FL,
      Edge.BL,
      Edge.BR,
    ],

    edgeOriDelta: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * L face quarter turn clockwise
 * Rotates: UFL->ULB->DBL->DLF corners, UL->BL->DL->FL edges
 */
function createLMove(): MoveTable {
  return {
    cornerPerm: [
      Corner.URF, // URF unchanged
      Corner.ULB, // UFL -> ULB
      Corner.DBL, // ULB -> DBL
      Corner.UBR, // UBR unchanged
      Corner.DFR, // DFR unchanged
      Corner.UFL, // DLF -> UFL
      Corner.DLF, // DBL -> DLF
      Corner.DRB, // DRB unchanged
    ],

    cornerOriDelta: [0, 1, 2, 0, 0, 2, 1, 0],

    edgePerm: [
      Edge.UR, // UR unchanged
      Edge.UF, // UF unchanged
      Edge.BL, // UL -> BL
      Edge.UB, // UB unchanged
      Edge.DR, // DR unchanged
      Edge.DF, // DF unchanged
      Edge.FL, // DL -> FL
      Edge.DB, // DB unchanged
      Edge.FR, // FR unchanged
      Edge.UL, // FL -> UL
      Edge.DL, // BL -> DL
      Edge.BR, // BR unchanged
    ],

    edgeOriDelta: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * B face quarter turn clockwise
 * Rotates: UBR->ULB->DBL->DRB corners, UB->BL->DB->BR edges
 */
function createBMove(): MoveTable {
  return {
    cornerPerm: [
      Corner.URF, // URF unchanged
      Corner.UFL, // UFL unchanged
      Corner.UBR, // ULB -> UBR
      Corner.DBL, // UBR -> DBL
      Corner.DFR, // DFR unchanged
      Corner.DLF, // DLF unchanged
      Corner.DRB, // DBL -> DRB
      Corner.ULB, // DRB -> ULB
    ],

    cornerOriDelta: [0, 0, 1, 2, 0, 0, 2, 1],

    edgePerm: [
      Edge.UR, // UR unchanged
      Edge.UF, // UF unchanged
      Edge.UL, // UL unchanged
      Edge.BL, // UB -> BL
      Edge.DR, // DR unchanged
      Edge.DF, // DF unchanged
      Edge.DL, // DL unchanged
      Edge.BR, // DB -> BR
      Edge.FR, // FR unchanged
      Edge.FL, // FL unchanged
      Edge.UB, // BL -> UB
      Edge.DB, // BR -> DB
    ],

    edgeOriDelta: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
  };
}

/**
 * Get move by index
 */
export function getMoveByIndex(index: MoveIndex): MoveTable {
  return ALL_MOVES[MOVE_KEYS[index]];
}

/**
 * Get move by key
 */
export function getMoveByKey(key: MoveKey): MoveTable {
  return ALL_MOVES[key];
}
