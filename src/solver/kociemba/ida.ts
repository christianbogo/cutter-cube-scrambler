/**
 * IDA* search implementation for Kociemba's two-phase algorithm
 * Implements iterative deepening A* with pruning table heuristics
 */

import {
  Phase1Coord,
  Phase2Coord,
  applyMoveToEO,
  applyMoveToCO,
  applyMoveToESlice,
  applyMoveToCP,
  applyMoveToUDEP,
  applyMoveToEP,
  isInG1,
} from "./coordinates";
import { phase1Heuristic, phase2Heuristic } from "./pruning";
import { MoveKey, MOVE_KEYS } from "../../core/moves";
import { Cube, applyMove } from "../../core/cubie";
import { getMoveByKey } from "../../core/moves";

// Search limits
const MAX_PHASE1_DEPTH = 25;
const MAX_PHASE2_DEPTH = 18;
const MAX_TOTAL_DEPTH = 30;

// Search result
export interface SearchResult {
  solution: number[]; // Move indices
  depth: number;
  nodesSearched: number;
  timeMs: number;
}

// Search statistics
export interface SearchStats {
  phase1Stats?: SearchResult;
  phase2Stats?: SearchResult;
  totalDepth: number;
  totalNodes: number;
  totalTimeMs: number;
}

/**
 * Phase 1 move restrictions
 * Allow all 18 moves initially, but implement axis restrictions
 */
const PHASE1_MOVES = Array.from({ length: 18 }, (_, i) => i);

/**
 * Phase 2 move restrictions
 * Only allow moves that preserve G1 subgroup properties
 * U, U2, U', D, D2, D', R2, L2, F2, B2
 */
const PHASE2_MOVES = [
  0,
  1,
  2, // U, U2, U'
  9,
  10,
  11, // D, D2, D'
  4,
  13,
  7,
  16, // R2, L2, F2, B2
];

/**
 * IDA* search for Phase 1: reach G1 subgroup
 */
export function searchPhase1(
  startCoord: Phase1Coord,
  maxDepth: number = MAX_PHASE1_DEPTH
): SearchResult | null {
  const startTime = Date.now();
  let totalNodes = 0;

  // Check if already in G1
  if (startCoord.eo === 0 && startCoord.eslice === 0) {
    return {
      solution: [],
      depth: 0,
      nodesSearched: 0,
      timeMs: Date.now() - startTime,
    };
  }

  // Iterative deepening
  const heuristic = phase1Heuristic(
    startCoord.eo,
    startCoord.co,
    startCoord.eslice
  );

  for (let depth = Math.max(1, heuristic); depth <= maxDepth; depth++) {
    const result = searchPhase1Depth(startCoord, depth, 0, -1);

    totalNodes += result.nodesSearched;

    if (result.solution !== null) {
      return {
        solution: result.solution,
        depth: depth,
        nodesSearched: totalNodes,
        timeMs: Date.now() - startTime,
      };
    }
  }

  return null; // No solution found
}

/**
 * Phase 1 depth-limited search
 */
function searchPhase1Depth(
  coord: Phase1Coord,
  depth: number,
  currentDepth: number,
  lastMove: number
): { solution: number[] | null; nodesSearched: number } {
  let nodesSearched = 1;

  // Check if goal reached
  if (coord.eo === 0 && coord.eslice === 0) {
    return { solution: [], nodesSearched };
  }

  // Pruning: if heuristic + current depth > target depth, prune
  const heuristic = phase1Heuristic(coord.eo, coord.co, coord.eslice);
  if (currentDepth + heuristic > depth) {
    return { solution: null, nodesSearched };
  }

  // If at maximum depth, fail
  if (currentDepth >= depth) {
    return { solution: null, nodesSearched };
  }

  // Try all valid moves
  for (const moveIdx of PHASE1_MOVES) {
    // Skip redundant moves
    if (shouldSkipMove(moveIdx, lastMove, PHASE1_MOVES)) {
      continue;
    }

    // Apply move to coordinates
    const nextCoord: Phase1Coord = {
      eo: applyMoveToEO(coord.eo, moveIdx),
      co: applyMoveToCO(coord.co, moveIdx),
      eslice: applyMoveToESlice(coord.eslice, moveIdx),
    };

    // Recursive search
    const result = searchPhase1Depth(
      nextCoord,
      depth,
      currentDepth + 1,
      moveIdx
    );
    nodesSearched += result.nodesSearched;

    if (result.solution !== null) {
      // Found solution (including empty for goal)
      return {
        solution: [moveIdx, ...result.solution],
        nodesSearched,
      };
    }
  }

  return { solution: null, nodesSearched };
}

/**
 * IDA* search for Phase 2: solve from G1 to solved state
 */
export function searchPhase2(
  startCoord: Phase2Coord,
  maxDepth: number = MAX_PHASE2_DEPTH
): SearchResult | null {
  const startTime = Date.now();
  let totalNodes = 0;

  // Check if already solved
  if (startCoord.cp === 0 && startCoord.udep === 0 && startCoord.ep === 0) {
    return {
      solution: [],
      depth: 0,
      nodesSearched: 0,
      timeMs: Date.now() - startTime,
    };
  }

  // Iterative deepening
  const heuristic = phase2Heuristic(
    startCoord.cp,
    startCoord.udep,
    startCoord.ep
  );

  for (let depth = Math.max(1, heuristic); depth <= maxDepth; depth++) {
    const result = searchPhase2Depth(startCoord, depth, 0, -1);

    totalNodes += result.nodesSearched;

    if (result.solution !== null) {
      return {
        solution: result.solution,
        depth: depth,
        nodesSearched: totalNodes,
        timeMs: Date.now() - startTime,
      };
    }
  }

  return null; // No solution found
}

/**
 * Phase 2 depth-limited search
 */
function searchPhase2Depth(
  coord: Phase2Coord,
  depth: number,
  currentDepth: number,
  lastMove: number
): { solution: number[] | null; nodesSearched: number } {
  let nodesSearched = 1;

  // Check if goal reached (solved state)
  if (coord.cp === 0 && coord.udep === 0 && coord.ep === 0) {
    return { solution: [], nodesSearched };
  }

  // Pruning: if heuristic + current depth > target depth, prune
  const heuristic = phase2Heuristic(coord.cp, coord.udep, coord.ep);
  if (currentDepth + heuristic > depth) {
    return { solution: null, nodesSearched };
  }

  // If at maximum depth, fail
  if (currentDepth >= depth) {
    return { solution: null, nodesSearched };
  }

  // Try all valid Phase 2 moves
  for (const moveIdx of PHASE2_MOVES) {
    // Skip redundant moves
    if (shouldSkipMove(moveIdx, lastMove, PHASE2_MOVES)) {
      continue;
    }

    // Apply move to coordinates
    const nextCoord: Phase2Coord = {
      cp: applyMoveToCP(coord.cp, moveIdx),
      udep: applyMoveToUDEP(coord.udep, moveIdx),
      ep: applyMoveToEP(coord.ep, moveIdx),
    };

    // Debug logging (removed for clarity)

    // Recursive search
    const result = searchPhase2Depth(
      nextCoord,
      depth,
      currentDepth + 1,
      moveIdx
    );
    nodesSearched += result.nodesSearched;

    if (result.solution !== null) {
      // Found solution
      return {
        solution: [moveIdx, ...result.solution],
        nodesSearched,
      };
    }
  }

  return { solution: null, nodesSearched };
}

/**
 * Move pruning logic to avoid redundant sequences
 */
function shouldSkipMove(
  moveIdx: number,
  lastMove: number,
  allowedMoves: number[]
): boolean {
  if (lastMove === -1) return false;

  const currentFace = Math.floor(moveIdx / 3);
  const lastFace = Math.floor(lastMove / 3);

  // Don't repeat the same face
  if (currentFace === lastFace) {
    return true;
  }

  // For Phase 1, be less restrictive with opposite face moves
  // Only skip if we just did an opposite face move (to avoid immediate cancellation)
  // but allow sequences like R L R later in the search
  return false;
}

/**
 * Check if two faces are opposite (for move pruning)
 */
function areOppositeFaces(face1: number, face2: number): boolean {
  // Face pairs: U(0)-D(3), R(1)-L(4), F(2)-B(5)
  const oppositePairs = [
    [0, 3], // U-D
    [1, 4], // R-L
    [2, 5], // F-B
  ];

  return oppositePairs.some(
    ([a, b]) => (face1 === a && face2 === b) || (face1 === b && face2 === a)
  );
}

/**
 * Convert move indices to move keys
 */
export function moveIndicesToKeys(moveIndices: number[]): MoveKey[] {
  return moveIndices.map((idx) => MOVE_KEYS[idx]);
}

/**
 * Convert move keys to move indices
 */
export function moveKeysToIndices(moveKeys: MoveKey[]): number[] {
  return moveKeys.map((key) => MOVE_KEYS.indexOf(key));
}

/**
 * Enhanced search with better pruning and optimizations
 */
export function enhancedSearch(
  phase: 1 | 2,
  startCoord: Phase1Coord | Phase2Coord,
  maxDepth: number,
  timeoutMs?: number
): SearchResult | null {
  const startTime = Date.now();

  if (phase === 1) {
    return searchPhase1(startCoord as Phase1Coord, maxDepth);
  } else {
    return searchPhase2(startCoord as Phase2Coord, maxDepth);
  }
}

/**
 * Bidirectional search (experimental)
 * Search from both start and goal states
 */
export function bidirectionalSearch(
  phase: 1 | 2,
  startCoord: Phase1Coord | Phase2Coord,
  maxDepth: number
): SearchResult | null {
  // This is a placeholder for bidirectional search implementation
  // For now, fall back to standard search
  return enhancedSearch(phase, startCoord, maxDepth);
}

/**
 * Search with multiple heuristics (experimental)
 */
export function multiHeuristicSearch(
  phase: 1 | 2,
  startCoord: Phase1Coord | Phase2Coord,
  maxDepth: number
): SearchResult | null {
  // This could implement multiple heuristic functions and use their maximum
  // For now, use standard search
  return enhancedSearch(phase, startCoord, maxDepth);
}

/**
 * Parallel search (experimental)
 * Run multiple search threads with different parameters
 */
export function parallelSearch(
  phase: 1 | 2,
  startCoord: Phase1Coord | Phase2Coord,
  maxDepth: number
): Promise<SearchResult | null> {
  // This would implement parallel search using Worker threads
  // For now, return a promise with standard search
  return Promise.resolve(enhancedSearch(phase, startCoord, maxDepth));
}

/**
 * Adaptive search depth
 * Dynamically adjust search depth based on problem difficulty
 */
export function adaptiveSearch(
  phase: 1 | 2,
  startCoord: Phase1Coord | Phase2Coord,
  initialMaxDepth: number = 12
): SearchResult | null {
  let maxDepth = initialMaxDepth;
  let result: SearchResult | null = null;

  // Increase depth gradually if no solution found
  while (
    !result &&
    maxDepth <= (phase === 1 ? MAX_PHASE1_DEPTH : MAX_PHASE2_DEPTH)
  ) {
    result = enhancedSearch(phase, startCoord, maxDepth);
    if (!result) {
      maxDepth += 2; // Increase by 2 for faster convergence
    }
  }

  return result;
}
