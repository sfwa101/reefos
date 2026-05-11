/**
 * Capability-driven seeder.
 * Reads scripts/seeds/sections/<slug>.seed.json and writes products,
 * media, variants, addons, nutrition, relations into the live DB.
 *
 * Usage:
 *   bun scripts/seeds/run-seed.ts meat
 *   bun scripts/seeds/run-seed.ts meat --no-images   # skip image gen
 *   bun scripts/seeds/run-seed.ts meat --model=google/gemini-3-pro-image-preview
 *
 * No hardcoded section/product data lives in this file — all content
 * comes from the seed JSON. The script only knows the schema shape.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LOVABLE_KEY = process.env.LOVABLE_API_KEY!;
const BUCKET = "product-images";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase env");

const args = process.argv.slice(2);
const sectionArg = args.find((a) => !a.startsWith("--"));
if (!sectionArg) throw new Error("Usage: bun run-seed.ts <section-slug>");
const skipImages = args.includes("--no-images");
const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface I18n { ar: string; en?: string }
interface VariantSeed { axis: string; value: string; label: I18n; price_delta?: number; is_default?: boolean }
interface AddonSeed { group: string; group_name: I18n; name: I18n; price_delta?: number; is_required?: boolean; max_qty?: number }
interface NutritionSeed { per_100g: Record<string, number>; serving_size_g?: number; allergens?: string[]; diet_flags?: Record<string, boolean> }
interface RelationSeed { to_slug: string; type: string; strength?: number }
interface ProductSeed {
  slug: string; sku: string;
  name: I18n; short_description: I18n; description: I18n; story?: I18n;
  image_prompt: string;
  base_price: number; compare_at_price?: number | null;
  wholesale_price?: number; member_price?: number;
  sale_unit: string; stock_qty: number; low_stock_threshold: number;
  is_perishable: boolean; shelf_life_days?: number;
  storage_conditions?: I18n;
  badges?: string[]; tags?: string[]; attributes?: Record<string, unknown>;
  popularity_score?: number; rating_avg?: number; rating_count?: number;
  is_featured?: boolean;
  variants?: VariantSeed[]; addons?: AddonSeed[];
  nutrition?: NutritionSeed; relations?: RelationSeed[];
}
interface SeedFile {
  section_slug: string;
  image_model?: string;
  image_style?: string;
  products: ProductSeed[];
}

async function generateImage(prompt: string, style: string, model: string): Promise<Buffer | null> {
  const fullPrompt = `${prompt}. ${style}`;
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: fullPrompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    console.error(`  ✗ image gen failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
  if (!url?.startsWith("data:image")) return null;
  const b64 = url.split(",")[1];
  return Buffer.from(b64, "base64");
}

async function uploadImage(slug: string, buf: Buffer): Promise<string | null> {
  const path = `seed/${slug}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: "image/png", upsert: true });
  if (error) { console.error(`  ✗ upload: ${error.message}`); return null; }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function getSectionId(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from("sections").select("id").eq("slug", slug).maybeSingle();
  if (error || !data) throw new Error(`Section "${slug}" not found`);
  return data.id;
}

async function upsertProduct(sectionId: string, p: ProductSeed): Promise<string> {
  const row = {
    slug: p.slug,
    sku: p.sku,
    section_id: sectionId,
    name_i18n: p.name,
    short_description_i18n: p.short_description,
    description_i18n: p.description,
    story_i18n: p.story ?? {},
    base_price: p.base_price,
    compare_at_price: p.compare_at_price ?? null,
    wholesale_price: p.wholesale_price ?? null,
    member_price: p.member_price ?? null,
    sale_unit: p.sale_unit,
    stock_qty: p.stock_qty,
    low_stock_threshold: p.low_stock_threshold,
    is_perishable: p.is_perishable,
    shelf_life_days: p.shelf_life_days ?? null,
    storage_conditions_i18n: p.storage_conditions ?? {},
    badges: p.badges ?? [],
    tags: p.tags ?? [],
    attributes: p.attributes ?? {},
    popularity_score: p.popularity_score ?? 0,
    rating_avg: p.rating_avg ?? 0,
    rating_count: p.rating_count ?? 0,
    is_active: true,
    is_featured: p.is_featured ?? false,
  };
  const { data, error } = await supabase
    .from("usa_products").upsert(row, { onConflict: "slug" }).select("id").single();
  if (error) throw new Error(`upsert product ${p.slug}: ${error.message}`);
  return data.id;
}

async function clearChildren(productId: string) {
  await supabase.from("product_variants_v2").delete().eq("product_id", productId);
  await supabase.from("product_addons").delete().eq("product_id", productId);
  await supabase.from("product_media").delete().eq("product_id", productId);
  await supabase.from("product_nutrition").delete().eq("product_id", productId);
  await supabase.from("product_relations").delete().eq("product_id", productId);
}

async function insertChildren(productId: string, p: ProductSeed, mediaUrl: string | null) {
  if (mediaUrl) {
    await supabase.from("product_media").insert({
      product_id: productId, url: mediaUrl, kind: "primary",
      alt_i18n: p.name, sort_order: 0,
    });
  }
  if (p.variants?.length) {
    await supabase.from("product_variants_v2").insert(
      p.variants.map((v, i) => ({
        product_id: productId,
        axis_key: v.axis, axis_value: v.value, axis_value_i18n: v.label,
        price_delta: v.price_delta ?? 0,
        is_default: v.is_default ?? false,
        sort_order: i,
      })),
    );
  }
  if (p.addons?.length) {
    await supabase.from("product_addons").insert(
      p.addons.map((a, i) => ({
        product_id: productId,
        group_key: a.group, group_name_i18n: a.group_name,
        name_i18n: a.name, kind: "custom",
        price_delta: a.price_delta ?? 0,
        is_required: a.is_required ?? false,
        max_qty: a.max_qty ?? 1,
        sort_order: i,
      })),
    );
  }
  if (p.nutrition) {
    await supabase.from("product_nutrition").insert({
      product_id: productId,
      per_100g: p.nutrition.per_100g,
      per_serving: {},
      serving_size_g: p.nutrition.serving_size_g ?? null,
      allergens: p.nutrition.allergens ?? [],
      diet_flags: p.nutrition.diet_flags ?? {},
      ingredients_i18n: {},
    });
  }
}

async function insertRelations(slugToId: Map<string, string>, products: ProductSeed[]) {
  const rows: Array<Record<string, unknown>> = [];
  for (const p of products) {
    const fromId = slugToId.get(p.slug);
    if (!fromId || !p.relations?.length) continue;
    for (const r of p.relations) {
      const toId = slugToId.get(r.to_slug);
      if (!toId || toId === fromId) continue;
      rows.push({
        product_id: fromId, related_id: toId,
        relation_type: r.type, strength: r.strength ?? 0.5,
      });
    }
  }
  if (!rows.length) return;
  const { error } = await supabase.from("product_relations").upsert(rows, {
    onConflict: "product_id,related_id,relation_type",
  });
  if (error) console.error(`relations: ${error.message}`);
  else console.log(`✓ ${rows.length} relations`);
}

async function main() {
  const path = resolve(`scripts/seeds/sections/${sectionArg}.seed.json`);
  const seed = JSON.parse(readFileSync(path, "utf-8")) as SeedFile;
  const model = modelArg ?? seed.image_model ?? "google/gemini-2.5-flash-image";
  const style = seed.image_style ?? "professional product photo on white background";

  console.log(`Section: ${seed.section_slug} | products: ${seed.products.length} | model: ${skipImages ? "—" : model}`);
  const sectionId = await getSectionId(seed.section_slug);
  const slugToId = new Map<string, string>();

  for (let i = 0; i < seed.products.length; i++) {
    const p = seed.products[i];
    process.stdout.write(`[${i + 1}/${seed.products.length}] ${p.slug}…`);

    let mediaUrl: string | null = null;
    if (!skipImages) {
      const buf = await generateImage(p.image_prompt, style, model);
      if (buf) mediaUrl = await uploadImage(p.slug, buf);
    }

    const productId = await upsertProduct(sectionId, p);
    await clearChildren(productId);
    await insertChildren(productId, p, mediaUrl);
    slugToId.set(p.slug, productId);
    console.log(` ✓ ${mediaUrl ? "img" : "no-img"} | id=${productId.slice(0, 8)}`);
  }

  await insertRelations(slugToId, seed.products);
  console.log("\n✅ done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
