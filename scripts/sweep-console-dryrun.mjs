#!/usr/bin/env node
/**
 * Console Sweep — DRY RUN ONLY.
 * Walks src/ and reports the count of console.* call-sites per file
 * along with the planned action (replace → Tracer.* / delete).
 * Writes nothing.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = "src";
const WHITELIST = new Set([
  "src/core/hakim-ai/hooks/useHakimEdgeWorker.ts",
  "src/core/system/observability/Tracer.ts",
  "src/core/system/observability/SovereignTracingGateway.ts",
]);
const EXTS = new Set([".ts", ".tsx"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (EXTS.has(extname(p))) yield p;
  }
}

const planned = [];
const skipped = [];
const RX = /\bconsole\.(log|info|warn|error|debug|trace)\s*\(/g;

for (const file of walk(ROOT)) {
  const rel = relative(".", file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx") || rel.includes("__tests__")) {
    if (RX.test(src)) skipped.push({ file: rel, reason: "test-file" });
    continue;
  }
  if (WHITELIST.has(rel)) {
    const m = src.match(RX);
    if (m) skipped.push({ file: rel, reason: "whitelist", count: m.length });
    continue;
  }
  const matches = [...src.matchAll(RX)];
  if (matches.length === 0) continue;
  const counts = { log: 0, info: 0, warn: 0, error: 0, debug: 0, trace: 0 };
  for (const m of matches) counts[m[1]]++;
  const replace = counts.info + counts.warn + counts.error;
  const del = counts.log + counts.debug + counts.trace;
  planned.push({ file: rel, total: matches.length, replace, delete: del, by: counts });
}

planned.sort((a, b) => b.total - a.total);

mkdirSync("reports", { recursive: true });
writeFileSync("reports/sweep-console-dryrun.json",
  JSON.stringify({ planned, skipped, summary: {
    files_to_modify: planned.length,
    total_callsites: planned.reduce((s, p) => s + p.total, 0),
    will_replace: planned.reduce((s, p) => s + p.replace, 0),
    will_delete: planned.reduce((s, p) => s + p.delete, 0),
    skipped_count: skipped.length,
  }}, null, 2));

console.log("=== CONSOLE SWEEP — DRY RUN ===");
console.log(`Files to modify : ${planned.length}`);
console.log(`Total callsites : ${planned.reduce((s, p) => s + p.total, 0)}`);
console.log(`  → Replace (info/warn/error → Tracer): ${planned.reduce((s, p) => s + p.replace, 0)}`);
console.log(`  → Delete  (log/debug/trace)        : ${planned.reduce((s, p) => s + p.delete, 0)}`);
console.log(`Skipped         : ${skipped.length}`);
console.log("\nTop 15 offenders:");
for (const p of planned.slice(0, 15)) {
  console.log(`  ${String(p.total).padStart(3)}  ${p.file}  (replace=${p.replace}, delete=${p.delete})`);
}
console.log("\nSkipped files:");
for (const s of skipped) console.log(`  - ${s.file} [${s.reason}]`);
console.log("\nFull report → reports/sweep-console-dryrun.json");
