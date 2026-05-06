import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(url, key, { auth: { persistSession: false } });

const snap = JSON.parse(readFileSync("db-backup/products-snapshot.json", "utf8"));
const rows = snap.rows.map((r: any) => ({ ...r, image_url: r.image_url ?? r.image }));
console.log(`📦 Loaded ${rows.length} rows from snapshot (exported ${snap.exported_at})`);

const { data, error } = await sb.from("products").upsert(rows, { onConflict: "id" }).select("id");
if (error) { console.error("❌", error.message); process.exit(1); }
console.log(`✅ Upserted ${data?.length ?? 0} products`);

// SDUI layouts (best-effort)
try {
  const sdui = JSON.parse(readFileSync("db-backup/sdui_layouts-snapshot.json", "utf8"));
  if (sdui.rows?.length) {
    const { error: e2 } = await sb.from("sdui_layouts").upsert(sdui.rows, { onConflict: "id" });
    if (e2) console.warn("⚠️ sdui_layouts:", e2.message);
    else console.log(`✅ Upserted ${sdui.rows.length} sdui_layouts`);
  }
} catch (e) { console.warn("⚠️ sdui skip:", (e as Error).message); }
