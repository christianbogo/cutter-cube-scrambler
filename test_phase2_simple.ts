// Simple test to debug Phase 2 specifically
import { solvedCube, applyMove, isSolved } from "./src/core/cubie";
import { ALL_MOVES, MOVE_KEYS } from "./src/core/moves";
import {
  getPhase2Coord,
  applyMoveToCP,
  applyMoveToUDEP,
  applyMoveToEP,
  initializeMoveTables,
} from "./src/solver/kociemba/coordinates";

async function testPhase2() {
  console.log("Testing Phase 2 coordinates and moves...");

  // Initialize move tables first
  console.log("Initializing move tables...");
  initializeMoveTables();

  const solved = solvedCube();
  const afterU = applyMove(solved, ALL_MOVES.U);

  console.log("Solved cube Phase 2 coord:", getPhase2Coord(solved));
  console.log("After U cube Phase 2 coord:", getPhase2Coord(afterU));

  // Test individual coordinate moves
  const coord = getPhase2Coord(afterU);
  console.log(
    "Current coordinates: CP=%d, UDEP=%d, EP=%d",
    coord.cp,
    coord.udep,
    coord.ep
  );

  // Test what happens when we apply moves to these coordinates
  console.log("\nTesting moves on coordinates:");
  for (let moveIdx of [0, 1, 2]) {
    // U, U2, Up
    const newCP = applyMoveToCP(coord.cp, moveIdx);
    const newUDEP = applyMoveToUDEP(coord.udep, moveIdx);
    const newEP = applyMoveToEP(coord.ep, moveIdx);
    console.log(
      `${MOVE_KEYS[moveIdx]}: CP=${newCP}, UDEP=${newUDEP}, EP=${newEP}`
    );

    if (newCP === 0 && newUDEP === 0 && newEP === 0) {
      console.log(`  *** ${MOVE_KEYS[moveIdx]} reaches goal state!`);
    }
  }

  // Test what the actual cube does
  console.log("\nTesting actual cube moves:");
  const testU = applyMove(afterU, ALL_MOVES.U);
  const testUp = applyMove(afterU, ALL_MOVES.Up);

  console.log("afterU + U -> solved:", isSolved(testU));
  console.log("afterU + Up -> solved:", isSolved(testUp));

  console.log("afterU + U Phase2 coord:", getPhase2Coord(testU));
  console.log("afterU + Up Phase2 coord:", getPhase2Coord(testUp));
}

testPhase2().catch(console.error);
