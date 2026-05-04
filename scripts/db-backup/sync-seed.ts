/**
 * Catalog Disaster-Recovery Seeder (CLI).
 *
 * Backup: pulls the four PUBLIC catalog tables (categories, products,
 *         loyalty_tier_rules, incentive_milestones) from Supabase and writes
 *         them into ./catalog_seed.json with a stable, deterministic shape.
 *
 * Restore: reads ./catalog_seed.json and UPSERTs every row back into Supabase
 *          using the natural PK of each table. Idempotent.
 *
 * SECURITY (hard rules):
 *   - The list of allowed tables is a hardcoded constant. No env override.
 *   - Any attempt to add a forbidden table here will fail the type check.
 *   - Requires the SERVICE ROLE key — never bundle this file into the client.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun run scripts/db-backup/sync-seed.ts backup | restore
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATALOG_TABLES,
  PK,
  FORBIDDEN_TABLES,
  type CatalogTable,
  type SeedFile,
  type SeedRow as Row,
} from "../../src/lib/catalogSeedShared";

// Re-export so existing consumers (and external tooling) keep working.
export { CATALOG_TABLES, PK, FORBIDDEN_TABLES, type CatalogTable, type SeedFile };

// ─── Helpers ────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEED_PATH = resolve(__dirname, "catalog_seed.json");

const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
};

const makeAdminClient = (): SupabaseClient => {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
};

// ─── Backup ─────────────────────────────────────────────────────────────
export async function backup(client: SupabaseClient): Promise<SeedFile> {
  const tables = {} as Record<CatalogTable, Row[]>;
  for (const t of CATALOG_TABLES) {
    const { data, error } = await client
      .from(t)
      .select("*")
      .order(PK[t], { ascending: true });
    if (error) throw new Error(`Backup ${t} failed: ${error.message}`);
    tables[t] = (data ?? []) as Row[];
    console.log(`  ✔ ${t}: ${tables[t].length} rows`);
  }
  return {
    $schema: "./catalog_seed.schema.md",
    version: 1,
    exported_at: new Date().toISOString(),
    exported_by: "cli",
    note: "Disaster-recovery seed for PUBLIC catalog only. NEVER stores customer PII.",
    tables,
  };
}

// ─── Restore ────────────────────────────────────────────────────────────
export async function restore(client: SupabaseClient, seed: SeedFile): Promise<void> {
  // Insertion order matters: categories first (FK target), then the rest.
  const order: CatalogTable[] = [
    "categories",
    "loyalty_tier_rules",
    "incentive_milestones",
    "products",
  ];
  for (const t of order) {
    const rows = seed.tables[t] ?? [];
    if (rows.length === 0) {
      console.log(`  · ${t}: 0 rows (skipped)`);
      continue;
    }
    const { error } = await client.from(t).upsert(rows, { onConflict: PK[t] });
    if (error) throw new Error(`Restore ${t} failed: ${error.message}`);
    console.log(`  ✔ ${t}: upserted ${rows.length} rows`);
  }
}

// ─── CLI entry ──────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const cmd = process.argv[2];
  const client = makeAdminClient();

  if (cmd === "backup") {
    console.log("⏳ Backing up catalog from Supabase…");
    const seed = await backup(client);
    await writeFile(SEED_PATH, JSON.stringify(seed, null, 2) + "\n", "utf8");
    console.log(`✅ Wrote ${SEED_PATH}`);
    return;
  }

  if (cmd === "restore") {
    console.log(`⏳ Restoring catalog from ${SEED_PATH}…`);
    const raw = await readFile(SEED_PATH, "utf8");
    const seed = JSON.parse(raw) as SeedFile;
    if (seed.version !== 1) {
      throw new Error(`Unsupported seed version: ${seed.version}`);
    }
    await restore(client, seed);
    console.log("✅ Catalog restored.");
    return;
  }

  console.error("Usage: bun run scripts/db-backup/sync-seed.ts <backup|restore>");
  process.exit(1);
}

// Only run when invoked as a script (not when imported by tests/UI helpers).
const isMain = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isMain) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

export { CATALOG_TABLES, PK, type CatalogTable, type SeedFile };
