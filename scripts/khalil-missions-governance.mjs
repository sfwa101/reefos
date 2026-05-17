#!/usr/bin/env node
/**
 * Khalil — Missions governance tripwires (P3.2).
 *
 * Static analysis. Forbids non-determinism in mission engines, direct UI
 * imports of engine internals, and any mutable persistence escape hatch.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MISSIONS_ROOT = "src/core/khalil/missions";
const PURE_DIRS = ["", "/contracts.ts", "/types.ts", "/scoring.ts", "/adaptation.ts", "/planner.ts", "/selectors.ts", "/engine.ts", "/replay.ts"];

const FORBIDDEN_PURE = [
  { rx: /Math\.random\s*\(/, msg: "Math.random() forbidden in mission engines" },
  { rx: /Date\.now\s*\(\)/, msg: "Date.now() forbidden — accept `now` via inputs" },
  { rx: /new Date\(\)/, msg: "`new Date()` forbidden — receive ISO `now` from caller" },
  { rx: /crypto\.randomUUID/, msg: "randomUUID forbidden — derive ids deterministically" },
  { rx: /\bfetch\s*\(/, msg: "Direct fetch forbidden in mission engines" },
  { rx: /openai|anthropic|@ai-sdk/i, msg: "Direct LLM SDK forbidden — server gateway only" },
];

const FORBIDDEN_GATEWAY = [
  { rx: /\.delete\s*\(\s*\)/, msg: "delete() forbidden — missions/events are append-only" },
];

let violations = 0;

function purePaths(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "gateway" || name === "__tests__") continue;
      out.push(...purePaths(p));
    } else if (/\.(ts|tsx)$/.test(p) && !p.endsWith(".test.ts")) {
      out.push(p);
    }
  }
  return out;
}

for (const file of purePaths(MISSIONS_ROOT)) {
  const src = readFileSync(file, "utf8");
  for (const { rx, msg } of FORBIDDEN_PURE) {
    if (rx.test(src)) {
      console.error(`✖ ${file}: ${msg}`);
      violations++;
    }
  }
}

// Gateway: forbid raw delete on mission/event tables.
function walkGateway(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkGateway(p);
    else if (/\.(ts|tsx)$/.test(p)) {
      const src = readFileSync(p, "utf8");
      for (const { rx, msg } of FORBIDDEN_GATEWAY) {
        if (rx.test(src)) {
          console.error(`✖ ${p}: ${msg}`);
          violations++;
        }
      }
    }
  }
}
walkGateway(`${MISSIONS_ROOT}/gateway`);

// UI guard: blocks under src/apps/khalil must not import mission engine internals.
const bad =
  /from ["']@\/core\/khalil\/missions\/(scoring|adaptation|planner|engine|replay|selectors|contracts|types)/;
(function walkUI(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    const s = statSync(p);
    if (s.isDirectory()) walkUI(p);
    else if (/\.(ts|tsx)$/.test(p)) {
      const src = readFileSync(p, "utf8");
      if (bad.test(src)) {
        console.error(`✖ ${p}: UI must import via @/core/khalil barrel only`);
        violations++;
      }
    }
  }
})("src/apps/khalil");

if (violations > 0) {
  console.error(`\n${violations} mission governance violation(s).`);
  process.exit(1);
}
console.log("✓ mission governance clean.");
