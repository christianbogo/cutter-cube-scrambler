/**
 * Pruning table generation and management for Kociemba solver
 * Generates distance tables for efficient IDA* heuristics
 */

import * as fs from "fs";
import * as path from "path";
import {
  EO_SIZE,
  CO_SIZE,
  ESLICE_SIZE,
  CP_SIZE,
  UDEP_SIZE,
  EP_SIZE,
  CP_EP_SIZE,
  UDEP_EP_SIZE,
  applyMoveToEO,
  applyMoveToCO,
  applyMoveToESlice,
  applyMoveToCP,
  applyMoveToUDEP,
  applyMoveToEP,
  applyMoveToCP_EP,
  applyMoveToUDEP_EP,
  initializeMoveTables,
} from "./coordinates";

// Cache directory for pruning tables
const CACHE_DIR = ".cache/kociemba/v1";

// Maximum distance stored (255 = unknown/unreachable)
const MAX_DISTANCE = 20;
const UNKNOWN_DISTANCE = 255;

/**
 * Pruning table types
 */
export class PruningTable {
  private data: Uint8Array;
  private size: number;
  private name: string;

  constructor(size: number, name: string) {
    this.size = size;
    this.name = name;
    this.data = new Uint8Array(size).fill(UNKNOWN_DISTANCE);
  }

  get(index: number): number {
    return this.data[index];
  }

  set(index: number, distance: number): void {
    this.data[index] = Math.min(distance, MAX_DISTANCE);
  }

  isBuilt(): boolean {
    return this.data[0] !== UNKNOWN_DISTANCE;
  }

  getSize(): number {
    return this.size;
  }

  getName(): string {
    return this.name;
  }

  getData(): Uint8Array {
    return this.data;
  }

  setData(data: Uint8Array): void {
    if (data.length !== this.size) {
      throw new Error(
        `Invalid data size for ${this.name}: expected ${this.size}, got ${data.length}`
      );
    }
    this.data = data;
  }
}

// Global pruning tables
export const EOPruningTable = new PruningTable(EO_SIZE, "eo_pruning");
export const COPruningTable = new PruningTable(CO_SIZE, "co_pruning");
export const ESlicePruningTable = new PruningTable(
  ESLICE_SIZE,
  "eslice_pruning"
);
export const CPPruningTable = new PruningTable(CP_SIZE, "cp_pruning");
export const UDEPPruningTable = new PruningTable(UDEP_SIZE, "udep_pruning");
export const EPPruningTable = new PruningTable(EP_SIZE, "ep_pruning");

// Composite tables for Phase 2 optimization
export const CP_EP_PruningTable = new PruningTable(
  CP_EP_SIZE,
  "cp_ep_pruning"
);
export const UDEP_EP_PruningTable = new PruningTable(
  UDEP_EP_SIZE,
  "udep_ep_pruning"
);

/**
 * Build a pruning table using BFS
 */
export function buildPruningTable(
  table: PruningTable,
  applyMoveFunc: (coord: number, moveIdx: number) => number,
  goalCoord: number = 0,
  allowedMoves: number[] = Array.from({ length: 18 }, (_, i) => i)
): void {
  console.log(`Building ${table.getName()} pruning table...`);

  const queue: number[] = [];
  let head = 0;

  // Initialize goal state
  table.set(goalCoord, 0);
  queue.push(goalCoord);

  let nodesProcessed = 0;
  const startTime = Date.now();

  while (head < queue.length) {
    const currentCoord = queue[head++];
    const currentDistance = table.get(currentCoord);

    if (currentDistance >= MAX_DISTANCE - 1) continue;

    const nextDistance = currentDistance + 1;

    for (const moveIdx of allowedMoves) {
      const nextCoord = applyMoveFunc(currentCoord, moveIdx);

      if (table.get(nextCoord) === UNKNOWN_DISTANCE) {
        table.set(nextCoord, nextDistance);
        queue.push(nextCoord);
      }
    }

    nodesProcessed++;

    // Progress reporting
    if (nodesProcessed % 100000 === 0) {
      const elapsed = Date.now() - startTime;
      const progress = (nodesProcessed / table.getSize()) * 100;
      console.log(
        `  Progress: ${progress.toFixed(
          1
        )}% (${nodesProcessed}/${table.getSize()}) - ${elapsed}ms`
      );
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `${table.getName()} built in ${elapsed}ms (${nodesProcessed} nodes processed)`
  );

  // Report statistics
  reportTableStatistics(table);
}

/**
 * Report statistics about a pruning table
 */
function reportTableStatistics(table: PruningTable): void {
  const histogram: number[] = new Array(MAX_DISTANCE + 1).fill(0);
  let unknownCount = 0;

  for (let i = 0; i < table.getSize(); i++) {
    const distance = table.get(i);
    if (distance === UNKNOWN_DISTANCE) {
      unknownCount++;
    } else {
      histogram[distance]++;
    }
  }

  console.log(`${table.getName()} statistics:`);
  for (let d = 0; d <= MAX_DISTANCE; d++) {
    if (histogram[d] > 0) {
      const percentage = (histogram[d] / table.getSize()) * 100;
      console.log(
        `  Distance ${d}: ${histogram[d]} nodes (${percentage.toFixed(2)}%)`
      );
    }
  }

  if (unknownCount > 0) {
    const percentage = (unknownCount / table.getSize()) * 100;
    console.log(`  Unknown: ${unknownCount} nodes (${percentage.toFixed(2)}%)`);
  }
}

/**
 * Save pruning table to disk
 */
export function savePruningTable(table: PruningTable): void {
  const filename = path.join(CACHE_DIR, `${table.getName()}.bin`);

  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(filename), { recursive: true });

    // Write binary data
    fs.writeFileSync(filename, Buffer.from(table.getData()));

    console.log(`Saved ${table.getName()} to ${filename}`);
  } catch (error) {
    console.error(`Failed to save ${table.getName()}:`, error);
  }
}

/**
 * Load pruning table from disk
 */
export function loadPruningTable(table: PruningTable): boolean {
  const filename = path.join(CACHE_DIR, `${table.getName()}.bin`);

  try {
    if (!fs.existsSync(filename)) {
      return false;
    }

    const buffer = fs.readFileSync(filename);
    const data = new Uint8Array(buffer);

    table.setData(data);
    console.log(`Loaded ${table.getName()} from ${filename}`);
    return true;
  } catch (error) {
    console.error(`Failed to load ${table.getName()}:`, error);
    return false;
  }
}

/**
 * Initialize all pruning tables
 */
export function initializePruningTables(): void {
  console.log("Initializing pruning tables...");

  // First initialize move tables
  initializeMoveTables();

  const PHASE2_MOVES = [
    0, 1, 2, // U, U2, U'
    9, 10, 11, // D, D2, D'
    4, 13, 7, 16, // R2, L2, F2, B2
  ];

  const tables = [
    { table: EOPruningTable, func: applyMoveToEO, moves: undefined },
    { table: COPruningTable, func: applyMoveToCO, moves: undefined },
    { table: ESlicePruningTable, func: applyMoveToESlice, moves: undefined },
    // Phase 2 Tables
    { table: CPPruningTable, func: applyMoveToCP, moves: PHASE2_MOVES },
    { table: UDEPPruningTable, func: applyMoveToUDEP, moves: PHASE2_MOVES },
    { table: EPPruningTable, func: applyMoveToEP, moves: PHASE2_MOVES },
    // Composite Tables for Phase 2
    { table: CP_EP_PruningTable, func: applyMoveToCP_EP, moves: PHASE2_MOVES },
    { table: UDEP_EP_PruningTable, func: applyMoveToUDEP_EP, moves: PHASE2_MOVES },
  ];

  for (const { table, func, moves } of tables) {
    // Try to load from cache first
    if (!loadPruningTable(table)) {
      // Build if not found
      buildPruningTable(table, func, 0, moves);
      savePruningTable(table);
    }
  }

  console.log("All pruning tables ready.");
}

/**
 * Clear pruning table cache
 */
export function clearPruningTableCache(): void {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith(".bin")) {
          fs.unlinkSync(path.join(CACHE_DIR, file));
          console.log(`Deleted ${file}`);
        }
      }
    }
    console.log("Pruning table cache cleared.");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
}

/**
 * Phase 1 heuristic: maximum of EO, CO, E-slice distances
 */
export function phase1Heuristic(
  eo: number,
  co: number,
  eslice: number
): number {
  const eoDistance = EOPruningTable.get(eo);
  const coDistance = COPruningTable.get(co);
  const esliceDistance = ESlicePruningTable.get(eslice);

  return Math.max(eoDistance, coDistance, esliceDistance);
}

/**
 * Phase 2 heuristic: maximum of composite distances
 */
export function phase2Heuristic(cp: number, udep: number, ep: number): number {
  // Compute composite indices
  const cp_ep = cp * EP_SIZE + ep;
  const udep_ep = udep * EP_SIZE + ep;

  const cpEpDistance = CP_EP_PruningTable.get(cp_ep);
  const udepEpDistance = UDEP_EP_PruningTable.get(udep_ep);

  // Use classic tables as fallback/augmentation (optional, but max is safe)
  // const cpDistance = CPPruningTable.get(cp);
  // const udepDistance = UDEPPruningTable.get(udep);
  // const epDistance = EPPruningTable.get(ep);

  return Math.max(cpEpDistance, udepEpDistance);
}

/**
 * Check if all pruning tables are built
 */
export function areAllTablesBuilt(): boolean {
  return (
    EOPruningTable.isBuilt() &&
    COPruningTable.isBuilt() &&
    ESlicePruningTable.isBuilt() &&
    CPPruningTable.isBuilt() &&
    UDEPPruningTable.isBuilt() &&
    EPPruningTable.isBuilt() &&
    CP_EP_PruningTable.isBuilt() &&
    UDEP_EP_PruningTable.isBuilt()
  );
}

/**
 * Get total cache size in bytes
 */
export function getCacheSize(): number {
  let totalSize = 0;

  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith(".bin")) {
          const filePath = path.join(CACHE_DIR, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      }
    }
  } catch (error) {
    console.error("Failed to calculate cache size:", error);
  }

  return totalSize;
}

/**
 * Format cache size for display
 */
export function formatCacheSize(): string {
  const bytes = getCacheSize();
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Build specific table by name (for debugging)
 */
export function buildTableByName(tableName: string): void {
  const tableMap: { [key: string]: { table: PruningTable; func: any } } = {
    eo: { table: EOPruningTable, func: applyMoveToEO },
    co: { table: COPruningTable, func: applyMoveToCO },
    eslice: { table: ESlicePruningTable, func: applyMoveToESlice },
    cp: { table: CPPruningTable, func: applyMoveToCP },
    udep: { table: UDEPPruningTable, func: applyMoveToUDEP },
    ep: { table: EPPruningTable, func: applyMoveToEP },
  };

  const entry = tableMap[tableName.toLowerCase()];
  if (!entry) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  console.log(`Building ${tableName} table...`);
  buildPruningTable(entry.table, entry.func);
  savePruningTable(entry.table);
}
