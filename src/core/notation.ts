/**
 * Move notation parsing and formatting
 * Supports standard cube notation: U, R, F, D, L, B with ' for counterclockwise and 2 for half-turns
 */

import { MoveKey, ALL_MOVES, getMoveByKey } from "./moves";
import { MoveTable, applyMove, Cube, invertMove, composeMoves } from "./cubie";

/**
 * Parse a move string into a MoveKey
 */
export function parseMove(moveStr: string): MoveKey | null {
  const normalized = moveStr.trim().toUpperCase();

  // Handle prime notation (both ' and P)
  const primeMove = normalized.replace(/['P]$/, "p");

  if (primeMove in ALL_MOVES) {
    return primeMove as MoveKey;
  }

  return null;
}

/**
 * Parse a sequence of moves from a string
 */
export function parseMoveSequence(sequence: string): MoveKey[] {
  if (!sequence.trim()) return [];

  // Split on whitespace and filter empty strings
  const moveStrs = sequence.trim().split(/\s+/);
  const moves: MoveKey[] = [];

  for (const moveStr of moveStrs) {
    const move = parseMove(moveStr);
    if (move === null) {
      throw new Error(`Invalid move: ${moveStr}`);
    }
    moves.push(move);
  }

  return moves;
}

/**
 * Format a move key as a string
 */
export function formatMove(move: MoveKey): string {
  // Convert internal 'p' notation back to standard prime notation
  return move.replace(/p$/, "'");
}

/**
 * Format a sequence of moves as a string
 */
export function formatMoveSequence(moves: MoveKey[]): string {
  return moves.map(formatMove).join(" ");
}

/**
 * Apply a sequence of moves to a cube
 */
export function applyMoveSequence(cube: Cube, moves: MoveKey[]): Cube {
  let result = cube;
  for (const moveKey of moves) {
    const moveTable = getMoveByKey(moveKey);
    result = applyMove(result, moveTable);
  }
  return result;
}

/**
 * Invert a move sequence (returns moves that undo the sequence)
 */
export function invertMoveSequence(moves: MoveKey[]): MoveKey[] {
  const result: MoveKey[] = [];

  // Reverse the sequence and invert each move
  for (let i = moves.length - 1; i >= 0; i--) {
    const move = moves[i];
    const inverted = invertMoveKey(move);
    result.push(inverted);
  }

  return result;
}

/**
 * Invert a single move key
 */
export function invertMoveKey(move: MoveKey): MoveKey {
  // Handle the different move types
  if (move.endsWith("p")) {
    // Prime moves: Up -> U, Rp -> R, etc.
    return move.slice(0, -1) as MoveKey;
  } else if (move.endsWith("2")) {
    // Half turns are self-inverse: U2 -> U2
    return move;
  } else {
    // Quarter turns: U -> Up, R -> Rp, etc.
    return (move + "p") as MoveKey;
  }
}

/**
 * Compose two move sequences into one
 */
export function composeMoveSequences(
  seq1: MoveKey[],
  seq2: MoveKey[]
): MoveKey[] {
  return [...seq1, ...seq2];
}

/**
 * Simplify a move sequence by canceling redundant moves
 */
export function simplifyMoveSequence(moves: MoveKey[]): MoveKey[] {
  if (moves.length === 0) return [];

  const result: MoveKey[] = [];

  for (let i = 0; i < moves.length; i++) {
    let currentMove = moves[i];
    const face = getFaceFromMove(currentMove);

    // Look for consecutive moves on the same face
    while (
      result.length > 0 &&
      getFaceFromMove(result[result.length - 1]) === face
    ) {
      const lastMove = result.pop()!;
      const combined = combineSameFaceMoves(lastMove, currentMove);

      if (combined === null) {
        // Moves cancel out completely
        currentMove = null as any;
        break;
      } else {
        // Update the current move to the combined result
        currentMove = combined;
      }
    }

    // Add the final move if it's not null
    if (currentMove !== null) {
      result.push(currentMove);
    }
  }

  return result;
}

/**
 * Get the face letter from a move key
 */
function getFaceFromMove(move: MoveKey): string {
  return move.charAt(0);
}

/**
 * Combine two moves on the same face
 */
function combineSameFaceMoves(move1: MoveKey, move2: MoveKey): MoveKey | null {
  const face = getFaceFromMove(move1);

  // Convert moves to quarter-turn counts (0-3)
  const count1 = getMoveQuarterTurns(move1);
  const count2 = getMoveQuarterTurns(move2);

  const totalTurns = (count1 + count2) % 4;

  return quarterTurnsToMove(face, totalTurns);
}

/**
 * Convert a move to number of quarter turns (0-3)
 */
function getMoveQuarterTurns(move: MoveKey): number {
  if (move.endsWith("2")) return 2;
  if (move.endsWith("p")) return 3;
  return 1;
}

/**
 * Convert quarter turn count back to move key
 */
function quarterTurnsToMove(face: string, turns: number): MoveKey | null {
  switch (turns) {
    case 0:
      return null; // No move
    case 1:
      return face as MoveKey;
    case 2:
      return (face + "2") as MoveKey;
    case 3:
      return (face + "p") as MoveKey;
    default:
      throw new Error(`Invalid turn count: ${turns}`);
  }
}

/**
 * Check if a move sequence is valid (all moves parse correctly)
 */
export function isValidMoveSequence(sequence: string): boolean {
  try {
    parseMoveSequence(sequence);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a random move sequence of given length
 */
export function randomMoveSequence(
  length: number,
  rng: () => number = Math.random
): MoveKey[] {
  const allMoves = Object.keys(ALL_MOVES) as MoveKey[];
  const result: MoveKey[] = [];

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(rng() * allMoves.length);
    result.push(allMoves[randomIndex]);
  }

  return result;
}
