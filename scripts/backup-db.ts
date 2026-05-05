/**
 * Database Snapshot Tool — Phase 23.6
 *
 * Pulls the PUBLIC catalog tables (`products`, `sdui_layouts`) from Supabase
 * and writes them as pretty-printed JSON into `db-backup/`. Idempotent.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun run scripts/backup-db.ts
 *
 * Falls back to VITE_* / publishable key when service role is absent
 * (will then only see rows visible under RLS).
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "db-backup");

const TABLES = ["products", "sdui_layouts"] as const;

const url =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or auth key in env.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function dump(table: string): Promise<number> {
  const all: unknown[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) {
      // sdui_layouts may not exist — skip gracefully
      if (/does not exist|relation .* not found/i.test(error.message)) {
        console.warn(`  · ${table}: table missing, skipped`);
        return 0;
      }
      throw new Error(`${table}: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const out = resolve(OUT_DIR, `${table}-snapshot.json`);
  await writeFile(
    out,
    JSON.stringify(
      {
        table,
        exported_at: new Date().toISOString(),
        count: all.length,
        rows: all,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`  ✔ ${table}: ${all.length} rows → ${out}`);
  return all.length;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`⏳ Snapshotting catalog → ${OUT_DIR}`);
  let total = 0;
  for (const t of TABLES) total += await dump(t);
  console.log(`✅ Done. ${total} total rows written.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
