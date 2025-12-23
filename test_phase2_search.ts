// Direct test of Phase 2 search
import { solvedCube, applyMove } from "./src/core/cubie";
import { ALL_MOVES } from "./src/core/moves";
import {
  getPhase2Coord,
  initializeMoveTables,
} from "./src/solver/kociemba/coordinates";
import { searchPhase2 } from "./src/solver/kociemba/ida";
import { initializePruningTables } from "./src/solver/kociemba/pruning";

async function testPhase2Search() {
  console.log("Direct test of Phase 2 search...");

  // Initialize everything
  initializeMoveTables();
  initializePruningTables();

  const solved = solvedCube();
  const afterU = applyMove(solved, ALL_MOVES.U);

  const phase2Coord = getPhase2Coord(afterU);
  console.log("Starting Phase 2 coordinate:", phase2Coord);

  // Directly call Phase 2 search
  const result = searchPhase2(phase2Coord, 10);

  console.log("Phase 2 search result:", result);

  if (result) {
    console.log("Solution moves:", result.solution);
    console.log("Expected: [2] (Up)");
    console.log("Got:", result.solution);
  }
}

testPhase2Search().catch(console.error);
