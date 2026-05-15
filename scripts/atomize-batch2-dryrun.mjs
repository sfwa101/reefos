#!/usr/bin/env node
/**
 * Atomization Batch-2 Sweep — DRY RUN ONLY.
 * Reports raw <button>/<input> usages outside the design-system primitives
 * along with the planned action. Writes nothing.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = "src";
const EXTS = new Set([".tsx"]);
const WHITELIST_PREFIXES = [
  "src/components/ui/",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (EXTS.has(extname(p))) yield p;
  }
}

const RX_BUTTON = /<button(\s|>)/g;
// Exclude special inputs (file/checkbox/radio/hidden) — those stay raw.
const RX_INPUT = /<input(?![^>]*type\s*=\s*["'](?:file|checkbox|radio|hidden)["'])(\s|>)/g;

const planned = [];
const skipped = [];

for (const file of walk(ROOT)) {
  const rel = relative(".", file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");

  if (WHITELIST_PREFIXES.some((p) => rel.startsWith(p))) continue;
  if (rel.endsWith(".test.tsx") || rel.includes("__tests__")) continue;
  if (src.includes("// @raw-html-ok")) {
    skipped.push({ file: rel, reason: "raw-html-ok" });
    continue;
  }

  const buttons = (src.match(RX_BUTTON) || []).length;
  const inputs = (src.match(RX_INPUT) || []).length;
  if (buttons + inputs === 0) continue;

  // Heuristic: skip files whose JSX uses dynamic spread props on these tags
  // (sweep can't safely transform them).
  const dynamicSpread =
    /<button[^>]*\{\.\.\./.test(src) || /<input[^>]*\{\.\.\./.test(src);
  if (dynamicSpread) {
    skipped.push({ file: rel, reason: "dynamic-spread", buttons, inputs });
    continue;
  }

  planned.push({ file: rel, buttons, inputs, total: buttons + inputs });
}

planned.sort((a, b) => b.total - a.total);

mkdirSync("reports", { recursive: true });
writeFileSync("reports/sweep-atomize-dryrun.json",
  JSON.stringify({ planned, skipped, summary: {
    files_to_modify: planned.length,
    total_callsites: planned.reduce((s, p) => s + p.total, 0),
    buttons: planned.reduce((s, p) => s + p.buttons, 0),
    inputs: planned.reduce((s, p) => s + p.inputs, 0),
    skipped_count: skipped.length,
  }}, null, 2));

console.log("=== ATOMIZE BATCH-2 — DRY RUN ===");
console.log(`Files to modify : ${planned.length}`);
console.log(`Total callsites : ${planned.reduce((s, p) => s + p.total, 0)}`);
console.log(`  → <button> → <Button>: ${planned.reduce((s, p) => s + p.buttons, 0)}`);
console.log(`  → <input>  → <Input> : ${planned.reduce((s, p) => s + p.inputs, 0)}`);
console.log(`Skipped         : ${skipped.length}`);
console.log("\nTop 15 offenders:");
for (const p of planned.slice(0, 15)) {
  console.log(`  ${String(p.total).padStart(3)}  ${p.file}  (btn=${p.buttons}, inp=${p.inputs})`);
}
console.log("\nSkipped files:");
for (const s of skipped) console.log(`  - ${s.file} [${s.reason}]`);
console.log("\nFull report → reports/sweep-atomize-dryrun.json");
