#!/usr/bin/env node
/**
 * Atomization Batch-2 — EXECUTE (Chunk 1: top 50 files).
 *
 *  - <button …>…</button>            →  <Button …>…</Button>
 *  - <input  …/>  (non-special types) →  <Input  …/>
 *  - Adds shadcn imports if missing.
 *  - Skips files flagged "dynamic-spread" or with `// @raw-html-ok`.
 *  - Inputs of type file|checkbox|radio|hidden are LEFT UNTOUCHED.
 *
 * Reads reports/sweep-atomize-dryrun.json to choose chunk.
 */
import { readFileSync, writeFileSync } from "node:fs";

const START = parseInt(process.env.START ?? "0", 10);
const END = parseInt(process.env.END ?? "50", 10);
const report = JSON.parse(readFileSync("reports/sweep-atomize-dryrun.json", "utf8"));
const chunk = report.planned.slice(START, END);

const RX_BUTTON_OPEN  = /<button(\s|>)/g;
const RX_BUTTON_CLOSE = /<\/button>/g;
// Match a full <input ...> tag (self-closing or not) so we can inspect the
// attributes and decide whether to skip.
const RX_INPUT_TAG = /<input\b([^>]*)(\/?)>/g;
const SPECIAL_TYPES = /\btype\s*=\s*["'](?:file|checkbox|radio|hidden)["']/;

function ensureImport(src, name, from) {
  // Already imported (named) from any path that ends with this module?
  const importRx = new RegExp(
    `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["'][^"']+["']`,
  );
  if (importRx.test(src)) return src;

  // Insert after the last existing import, or at file top.
  const lastImport = [...src.matchAll(/^import .*?;$/gm)].pop();
  const line = `import { ${name} } from "${from}";`;
  if (!lastImport) return `${line}\n${src}`;
  const idx = lastImport.index + lastImport[0].length;
  return `${src.slice(0, idx)}\n${line}${src.slice(idx)}`;
}

let touched = 0;
let btnReplaced = 0;
let inpReplaced = 0;
const failed = [];

for (const entry of chunk) {
  const file = entry.file;
  try {
    let src = readFileSync(file, "utf8");
    let needBtn = false;
    let needInp = false;
    let localBtn = 0;
    let localInp = 0;

    if (entry.buttons > 0) {
      src = src.replace(RX_BUTTON_OPEN, (_m, suf) => {
        localBtn++;
        return `<Button${suf}`;
      });
      src = src.replace(RX_BUTTON_CLOSE, "</Button>");
      if (localBtn > 0) needBtn = true;
    }

    if (entry.inputs > 0) {
      src = src.replace(RX_INPUT_TAG, (m, attrs, slash) => {
        if (SPECIAL_TYPES.test(attrs)) return m;
        localInp++;
        return `<Input${attrs}${slash}>`;
      });
      if (localInp > 0) needInp = true;
    }

    if (needBtn) src = ensureImport(src, "Button", "@/components/ui/button");
    if (needInp) src = ensureImport(src, "Input", "@/components/ui/input");

    if (needBtn || needInp) {
      writeFileSync(file, src);
      btnReplaced += localBtn;
      inpReplaced += localInp;
      touched++;
      console.log(`✓ ${file}  (btn=${localBtn}, inp=${localInp})`);
    }
  } catch (e) {
    failed.push({ file, error: String(e) });
    console.log(`✗ ${file}  ${e}`);
  }
}

console.log(`\n=== ATOMIZE — CHUNK [${START}..${END}] DONE ===`);
console.log(`Files touched: ${touched}`);
console.log(`<button> → <Button>: ${btnReplaced}`);
console.log(`<input>  → <Input> : ${inpReplaced}`);
console.log(`Failed       : ${failed.length}`);
