// Defect registry: reads a comma-separated list of active defect ids from
// the ACTIVE_DEFECTS environment variable at process start. Exactly one
// defect is normally active at a time (the regression matrix runner in
// scripts/run-regression-matrix.mjs starts the server 30 times, once per
// defect id, plus one clean baseline run with no defects active).
//
// Every call site that reads isDefectActive(N) documents, in a comment
// immediately above it, the single contract guarantee that defect N
// breaks. See docs/DEFECTS.md for the full table of 30 defects.

const raw = process.env.ACTIVE_DEFECTS ?? '';

const ACTIVE: Set<number> = new Set(
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => Number.isInteger(n))
);

export function isDefectActive(id: number): boolean {
  return ACTIVE.has(id);
}

export function activeDefects(): number[] {
  return Array.from(ACTIVE).sort((a, b) => a - b);
}

export function isFlakeModeActive(): boolean {
  return process.env.FLAKE_MODE === '1';
}
