#!/usr/bin/env node
/**
 * Khalil — Intelligence governance tripwires (P3.1).
 *
 * Static analysis that blocks non-deterministic patterns from leaking
 * into the sovereign intelligence layer. Run in CI.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const INTEL_ROOT = "src/core/khalil/intelligence";
const FORBIDDEN = [
  { rx: /Math\.random/, msg: "Math.random forbidden in intelligence layer" },
  { rx: /Date\.now\(\)/, msg: "Date.now() forbidden — accept `now` via inputs" },
  { rx: /new Date\(\)/, msg: "`new Date()` forbidden — receive ISO `now` from caller" },
  { rx: /crypto\.randomUUID/, msg: "randomUUID forbidden — derive ids deterministically" },
  { rx: /fetch\(/, msg: "Direct fetch forbidden in intelligence engines" },
  { rx: /openai|anthropic|@ai-sdk/i, msg: "Direct LLM SDK forbidden — server gateway only" },
];

const PURE_DIRS = ["signals", "scoring", "nudges", "planning", "replay", "contracts"];

let violations = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p)) check(p);
  }
}

function check(file) {
  const isPure = PURE_DIRS.some((d) => file.includes(`${INTEL_ROOT}/${d}/`));
  const isTest = file.includes("/tests/") || file.endsWith(".test.ts");
  if (!isPure || isTest) return;
  const src = readFileSync(file, "utf8");
  for (const { rx, msg } of FORBIDDEN) {
    if (rx.test(src)) {
      console.error(`✖ ${file}: ${msg}`);
      violations++;
    }
  }
}

walk(INTEL_ROOT);

// UI inference guard: blocks under src/apps/khalil must not import intelligence engines directly.
function uiGuard() {
  const root = "src/apps/khalil";
  const bad = /from ["']@\/core\/khalil\/intelligence\/(signals|scoring|nudges|planning|replay)/;
  (function walk2(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk2(p);
      else if (/\.(ts|tsx)$/.test(p)) {
        const src = readFileSync(p, "utf8");
        if (bad.test(src)) {
          console.error(`✖ ${p}: UI must import via @/core/khalil barrel only`);
          violations++;
        }
      }
    }
  })(root);
}
uiGuard();

if (violations > 0) {
  console.error(`\n${violations} intelligence governance violation(s).`);
  process.exit(1);
}
console.log("✓ intelligence governance clean.");
