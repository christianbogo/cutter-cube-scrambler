// Simple test to debug the solver
import { KociembaSolver } from "./src/solver/kociemba/solver";
import { solvedCube, applyMove, isSolved } from "./src/core/cubie";
import { MOVES, ALL_MOVES } from "./src/core/moves";
import { getPhase1Coord, isInG1 } from "./src/solver/kociemba/coordinates";

async function test() {
  console.log("Testing solver with simple cases...");

  const solver = new KociembaSolver({ verbose: true, maxPhase1Depth: 10 });
  await solver.initialize();

  // Test 1: Solved cube
  console.log("\n=== Test 1: Solved cube ===");
  const solved = solvedCube();
  console.log("Solved cube coordinates:", getPhase1Coord(solved));
  console.log("Is in G1:", isInG1(solved));

  const result1 = await solver.solve(solved);
  console.log("Result:", result1.success, result1.moves);

  // Test 2: Single U move
  console.log("\n=== Test 2: Single U move ===");
  const afterU = applyMove(solved, MOVES.U);
  console.log("After U coordinates:", getPhase1Coord(afterU));
  console.log("Is in G1:", isInG1(afterU));

  const result2 = await solver.solve(afterU);
  console.log("Result:", result2.success, result2.moves);
  if (result2.success) {
    console.log("Scramble:", result2.scramble);
  } else {
    console.log("Error:", result2.error);
  }

  // Manual verification: what move actually solves afterU?
  console.log("Manual verification:");
  const testU = applyMove(afterU, MOVES.U);
  const testUp = applyMove(afterU, ALL_MOVES.Up);
  const testU2 = applyMove(afterU, ALL_MOVES.U2);
  console.log("afterU + U =", isSolved(testU));
  console.log("afterU + Up =", isSolved(testUp));
  console.log("afterU + U2 =", isSolved(testU2));

  // Test 3: R move (should not be in G1)
  console.log("\n=== Test 3: R move ===");
  const afterR = applyMove(solved, MOVES.R);
  console.log("After R coordinates:", getPhase1Coord(afterR));
  console.log("Is in G1:", isInG1(afterR));

  const result3 = await solver.solve(afterR);
  console.log("Result:", result3.success, result3.moves);
}

test().catch(console.error);
