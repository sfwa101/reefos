#!/usr/bin/env node
/**
 * Console Sweep — EXECUTE.
 * AST-based transform via ts-morph.
 *  - console.info|warn|error  →  Tracer.<level>("<domain>", "<type>", { args: [...] })
 *  - console.log|debug|trace  →  statement deleted
 *  - Adds `import { Tracer } from "@/core/system/observability/Tracer";` if needed
 *
 * Reads scripts/sweep-console-dryrun.mjs report to decide the file list,
 * but re-walks deterministically so it's safe to run standalone.
 */
import { Project, SyntaxKind } from "ts-morph";
import { readdirSync, statSync } from "node:fs";
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

function deriveDomain(rel) {
  const parts = rel.split("/");
  // src/core/<domain>/...  or  src/apps/<app>/features/<domain>/...
  if (parts[1] === "core" && parts[2]) return parts[2];
  if (parts[1] === "apps" && parts[3] === "features" && parts[4]) return parts[4];
  if (parts[1] === "components" && parts[2]) return parts[2];
  if (parts[1] === "hooks") return "hooks";
  if (parts[1] === "lib") return "lib";
  if (parts[1] === "modules" && parts[2]) return parts[2];
  if (parts[1] === "routes") return "routes";
  return parts[1] || "app";
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "log";
}

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: true,
});

const targetFiles = [];
for (const f of walk(ROOT)) {
  const rel = relative(".", f).replace(/\\/g, "/");
  if (WHITELIST.has(rel)) continue;
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx") || rel.includes("__tests__")) continue;
  targetFiles.push(rel);
}

let touched = 0;
let replaced = 0;
let deleted = 0;

for (const rel of targetFiles) {
  const src = project.addSourceFileAtPath(rel);
  const text = src.getFullText();
  if (!/\bconsole\.(log|info|warn|error|debug|trace)\s*\(/.test(text)) {
    project.removeSourceFile(src);
    continue;
  }

  const domain = deriveDomain(rel);
  let fileChanged = false;
  let needsImport = false;

  // Collect call expressions first; mutate after to avoid live-traversal issues.
  const calls = src
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => {
      const expr = c.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return false;
      const pae = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      return (
        pae.getExpression().getText() === "console" &&
        ["log", "info", "warn", "error", "debug", "trace"].includes(pae.getName())
      );
    });

  for (const c of calls) {
    const pae = c.getExpression().asKindOrThrow(SyntaxKind.PropertyAccessExpression);
    const method = pae.getName();
    const args = c.getArguments();

    if (method === "log" || method === "debug" || method === "trace") {
      const stmt = c.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
      if (stmt) {
        stmt.remove();
        deleted++;
        fileChanged = true;
      }
      continue;
    }

    // info | warn | error  →  Tracer.<m>(domain, type, { args: [...] })
    let typeSlug = "log";
    const first = args[0];
    if (first && first.getKind() === SyntaxKind.StringLiteral) {
      typeSlug = slug(first.getLiteralText());
    } else if (first && first.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
      typeSlug = slug(first.getLiteralText());
    }

    const argText = args.map((a) => a.getText()).join(", ");
    const ctx = args.length > 0 ? `, { args: [${argText}] }` : "";
    c.replaceWithText(`Tracer.${method}("${domain}", "${typeSlug}"${ctx})`);
    replaced++;
    fileChanged = true;
    needsImport = true;
  }

  if (needsImport) {
    const hasImport = src
      .getImportDeclarations()
      .some((d) => d.getModuleSpecifierValue() === "@/core/system/observability/Tracer");
    if (!hasImport) {
      src.addImportDeclaration({
        moduleSpecifier: "@/core/system/observability/Tracer",
        namedImports: ["Tracer"],
      });
    }
  }

  if (fileChanged) {
    src.saveSync();
    touched++;
    console.log(`✓ ${rel}`);
  }
  project.removeSourceFile(src);
}

console.log(`\n=== CONSOLE SWEEP — DONE ===`);
console.log(`Files touched : ${touched}`);
console.log(`Replaced      : ${replaced}`);
console.log(`Deleted       : ${deleted}`);
