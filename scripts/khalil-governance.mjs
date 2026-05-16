#!/usr/bin/env node
/**
 * Khalil governance tripwire (P2.8).
 *
 * Static scan for forbidden patterns. Exits non-zero when violations
 * are found so CI can gate merges. Heuristic only — true enforcement
 * lives in code review + ADRs, but this catches the obvious slips.
 *
 * Rules:
 *   1. No direct `@/integrations/supabase/client` imports inside
 *      src/apps/khalil/** (UI must go through the gateway barrel).
 *   2. No cross-domain imports: src/core/khalil/<A>/** must not import
 *      from src/core/khalil/<B>/** (except `index.ts` re-exports, the
 *      shared `capabilities`, `events`, `i18n`, `middleware`, `gateway`,
 *      `replay`, `offline`, `analytics`, `orchestrator`, `queryKeys`).
 *   3. No hardcoded Arabic literals in TSX (must go through `kt()`).
 *   4. No `*.server.ts` import from anything under src/apps/khalil/**.
 *   5. No `recharts` / chart imports in `src/apps/khalil/blocks/**`
 *      except files matching `*Chart*` or `Insights*`.
 *   6. No coach `prompts.server.ts` import outside server fns.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const violations = [];

const SHARED = new Set([
  "capabilities",
  "events",
  "i18n",
  "middleware",
  "gateway",
  "replay",
  "offline",
  "analytics",
  "orchestrator",
  "queryKeys",
  "index",
]);

const ARABIC_RE = /[\u0600-\u06FF]/;

/** @param {string} dir */
function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      out = out.concat(walk(p));
    } else out.push(p);
  }
  return out;
}

const files = walk(join(ROOT, "src")).filter((f) =>
  /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"),
);

for (const f of files) {
  const rel = relative(ROOT, f);
  const src = readFileSync(f, "utf8");

  // Rule 1 — direct supabase in apps/khalil
  if (rel.startsWith("src/apps/khalil/") &&
      /from\s+["']@\/integrations\/supabase\/client/.test(src)) {
    violations.push(`${rel}: direct supabase import (rule 1)`);
  }

  // Rule 2 — cross-domain imports
  const dom = rel.match(/^src\/core\/khalil\/([^/]+)\//)?.[1];
  if (dom && !SHARED.has(dom)) {
    const importRe = /from\s+["']([^"']+)["']/g;
    let m;
    while ((m = importRe.exec(src))) {
      const imp = m[1];
      const cross = imp.match(/(?:@\/core\/khalil|\.{1,2}\/.*core\/khalil|\.{2,}\/)([^/"']+)/);
      // resolve relative cross-domain: matches like "../identity/..." from recovery
      const rel2 = imp.match(/^\.\.\/([^/]+)\//);
      const target = rel2?.[1];
      if (target && target !== dom && !SHARED.has(target)) {
        violations.push(`${rel}: cross-domain import "${imp}" (rule 2)`);
      }
    }
  }

  // Rule 3 — hardcoded Arabic in TSX
  if (rel.endsWith(".tsx") && ARABIC_RE.test(src)) {
    // allow inside comments or kt() call sites
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (ARABIC_RE.test(line) && !/^\s*\/\//.test(line) && !/kt\(/.test(line)) {
        violations.push(`${rel}:${i + 1}: hardcoded Arabic literal (rule 3)`);
      }
    });
  }

  // Rule 4 — *.server.ts imports from apps/khalil
  if (rel.startsWith("src/apps/khalil/") && /\.server["']/.test(src)) {
    violations.push(`${rel}: imports *.server.* module (rule 4)`);
  }

  // Rule 5 — chart libs on home blocks
  if (rel.startsWith("src/apps/khalil/blocks/") &&
      !/Chart|Insights/.test(rel) &&
      /from\s+["'](recharts|d3|chart\.js)/.test(src)) {
    violations.push(`${rel}: chart library imported in home block (rule 5)`);
  }

  // Rule 6 — coach prompts.server import outside server fns
  if (/coach\/runtime\/prompts\.server/.test(src) &&
      !rel.includes("coach/runtime/prompts.server") &&
      !rel.includes("coach/gateway/")) {
    violations.push(`${rel}: imports coach prompts.server outside gateway (rule 6)`);
  }
}

if (violations.length) {
  console.error(`Khalil governance: ${violations.length} violation(s)`);
  for (const v of violations) console.error("  - " + v);
  process.exit(1);
}
console.log("Khalil governance: clean");
