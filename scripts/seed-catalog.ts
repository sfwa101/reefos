/**
 * Phase 23.2 — Automated Catalog & Media Seeder.
 * Reads images from /tmp/seed/images, uploads to Supabase Storage
 * `product-images` bucket, then upserts product rows into `products`.
 *
 * NOTE: The attached CSV contained ONLY headers (no data rows), so the
 * 38 image filenames are the source of truth for the seed catalog.
 * Arabic names + category mapping are derived deterministically from the
 * slug so re-running is fully idempotent (UPSERT on `id`).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { extname, basename, join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "product-images";
const IMG_DIR = "/tmp/seed/images";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Source =
  | "supermarket" | "produce" | "meat" | "dairy" | "sweets"
  | "pharmacy" | "library" | "homegoods" | "recipes";

interface SeedMeta {
  name: string;
  category: string;
  sub_category: string;
  source: Source;
  price: number;
  unit: string;
  brand?: string;
}

// slug (without `p-` prefix and extension) → product metadata
const META: Record<string, SeedMeta> = {
  apple:           { name: "تفاح أحمر",        category: "الخضار والفواكه", sub_category: "فواكه", source: "produce",     price: 45, unit: "كجم" },
  banana:          { name: "موز بلدي",         category: "الخضار والفواكه", sub_category: "فواكه", source: "produce",     price: 28, unit: "كجم" },
  orange:          { name: "برتقال أبو سرة",   category: "الخضار والفواكه", sub_category: "فواكه", source: "produce",     price: 22, unit: "كجم" },
  strawberry:      { name: "فراولة طازجة",     category: "الخضار والفواكه", sub_category: "فواكه", source: "produce",     price: 55, unit: "كجم" },
  tomato:          { name: "طماطم بلدي",       category: "الخضار والفواكه", sub_category: "خضار",  source: "produce",     price: 18, unit: "كجم" },
  cucumber:        { name: "خيار بلدي",        category: "الخضار والفواكه", sub_category: "خضار",  source: "produce",     price: 16, unit: "كجم" },
  lettuce:         { name: "خس أمريكي",        category: "الخضار والفواكه", sub_category: "خضار",  source: "produce",     price: 14, unit: "حبة" },
  beef:            { name: "لحم بقري بلدي",    category: "اللحوم والدواجن", sub_category: "لحوم",  source: "meat",        price: 380, unit: "كجم" },
  "chicken-raw":   { name: "دجاج طازج كامل",   category: "اللحوم والدواجن", sub_category: "دواجن", source: "meat",        price: 145, unit: "كجم" },
  salmon:          { name: "سلمون نرويجي",     category: "اللحوم والدواجن", sub_category: "أسماك", source: "meat",        price: 420, unit: "كجم" },
  milk:            { name: "حليب طازج",        category: "الألبان والبيض", sub_category: "حليب",  source: "dairy",       price: 38, unit: "لتر",  brand: "جهينة" },
  yogurt:          { name: "زبادي طبيعي",       category: "الألبان والبيض", sub_category: "ألبان", source: "dairy",       price: 12, unit: "كوب",  brand: "المراعي" },
  cheese:          { name: "جبنة بيضاء",        category: "الألبان والبيض", sub_category: "أجبان", source: "dairy",       price: 95, unit: "كجم" },
  butter:          { name: "زبدة طبيعية",       category: "الألبان والبيض", sub_category: "ألبان", source: "dairy",       price: 75, unit: "علبة 200ج" },
  eggs:            { name: "بيض بلدي",          category: "الألبان والبيض", sub_category: "بيض",   source: "dairy",       price: 95, unit: "طبق 30" },
  bread:           { name: "خبز فينو طازج",     category: "المخبوزات",       sub_category: "خبز",   source: "supermarket", price: 18, unit: "حزمة" },
  rice:            { name: "أرز مصري",          category: "البقالة الجافة",  sub_category: "حبوب", source: "supermarket", price: 38, unit: "كجم" },
  pasta:           { name: "مكرونة إيطالية",    category: "البقالة الجافة",  sub_category: "مكرونة", source: "supermarket", price: 22, unit: "كيس 500ج" },
  oil:             { name: "زيت عباد الشمس",    category: "البقالة الجافة",  sub_category: "زيوت", source: "supermarket", price: 95, unit: "زجاجة 1لتر", brand: "عافية" },
  cereal:          { name: "كورن فليكس",         category: "البقالة الجافة",  sub_category: "إفطار", source: "supermarket", price: 65, unit: "علبة",     brand: "كيلوجز" },
  coffee:          { name: "قهوة عربية",         category: "المشروبات",       sub_category: "قهوة", source: "supermarket", price: 120, unit: "علبة 250ج" },
  juice:           { name: "عصير برتقال طبيعي", category: "المشروبات",       sub_category: "عصائر", source: "supermarket", price: 28, unit: "لتر" },
  water:           { name: "مياه معدنية",        category: "المشروبات",       sub_category: "مياه", source: "supermarket", price: 8, unit: "زجاجة 1.5لتر", brand: "حياة" },
  cookies:         { name: "بسكويت شوكولاتة",    category: "حلويات وسناكس",   sub_category: "بسكويت", source: "sweets",     price: 35, unit: "علبة" },
  icecream:        { name: "آيس كريم فانيليا",   category: "حلويات وسناكس",   sub_category: "آيس كريم", source: "sweets",   price: 85, unit: "علبة 1لتر" },
  risotto:         { name: "ريزوتو الفطر",       category: "وجبات جاهزة",     sub_category: "إيطالي", source: "recipes",    price: 145, unit: "وجبة" },
  "grilled-chicken": { name: "دجاج مشوي",        category: "وجبات جاهزة",     sub_category: "مشويات", source: "recipes",    price: 165, unit: "وجبة" },
  cleaner:         { name: "منظف أرضيات",        category: "أدوات منزلية",    sub_category: "تنظيف", source: "supermarket", price: 45, unit: "زجاجة" },
  shampoo:         { name: "شامبو للشعر",        category: "العناية الشخصية", sub_category: "عناية بالشعر", source: "pharmacy", price: 85, unit: "زجاجة 400مل", brand: "هيد آند شولدرز" },
  diapers:         { name: "حفاضات أطفال",       category: "أطفال",            sub_category: "حفاضات", source: "supermarket", price: 220, unit: "عبوة كبيرة", brand: "بامبرز" },
  medicine:        { name: "باراسيتامول 500",    category: "صيدلية",           sub_category: "أدوية", source: "pharmacy",   price: 25, unit: "شريط" },
  petfood:         { name: "طعام قطط جاف",       category: "أغذية الحيوانات", sub_category: "قطط",   source: "supermarket", price: 180, unit: "كيس 1.5كجم", brand: "ويسكاس" },
  book:            { name: "كتاب قصص للأطفال",   category: "كتب ومجلات",       sub_category: "أطفال", source: "library",    price: 75, unit: "نسخة" },
  notebook:        { name: "كشكول 100 ورقة",     category: "أدوات مكتبية",    sub_category: "كشاكيل", source: "library",    price: 35, unit: "قطعة" },
  pens:            { name: "أقلام جاف (12 لون)", category: "أدوات مكتبية",    sub_category: "أقلام", source: "library",    price: 45, unit: "علبة" },
  stationery:      { name: "طقم أدوات هندسية",   category: "أدوات مكتبية",    sub_category: "أدوات", source: "library",    price: 65, unit: "طقم" },
  bowl:            { name: "طقم أطباق سيراميك",  category: "أدوات منزلية",    sub_category: "مطبخ",  source: "homegoods",  price: 280, unit: "طقم 6 قطع" },
  utensils:        { name: "طقم أدوات مائدة",    category: "أدوات منزلية",    sub_category: "مطبخ",  source: "homegoods",  price: 195, unit: "طقم 24 قطعة" },
};

const ctype = (ext: string) =>
  ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

async function main() {
  const files = readdirSync(IMG_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  console.log(`📂 Read ${files.length} image files`);

  // Step 1: upload images
  let uploaded = 0;
  const urlByFile: Record<string, string> = {};
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const slug = basename(file, ext).replace(/^p-/, "");
    const path = `seed/${slug}${ext}`;
    const bytes = readFileSync(join(IMG_DIR, file));
    const up = await sb.storage.from(BUCKET).upload(path, bytes, {
      contentType: ctype(ext),
      upsert: true,
      cacheControl: "31536000",
    });
    if (up.error) {
      console.error(`  ❌ upload ${file}:`, up.error.message);
      continue;
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    urlByFile[file] = data.publicUrl;
    uploaded++;
  }
  console.log(`☁️  Uploaded ${uploaded}/${files.length} images`);

  // Step 2: build rows
  const now = new Date().toISOString();
  const rows = files
    .map((file) => {
      const slug = basename(file, extname(file)).replace(/^p-/, "");
      const meta = META[slug];
      if (!meta) {
        console.warn(`  ⚠️  no meta for slug "${slug}" — skipped`);
        return null;
      }
      const url = urlByFile[file] ?? null;
      return {
        id: `seed-${slug}`,
        name: meta.name,
        brand: meta.brand ?? null,
        unit: meta.unit,
        price: meta.price,
        old_price: Math.round(meta.price * 1.15),
        image: url,
        image_url: url,
        image_path: url ? `seed/${slug}${extname(file).toLowerCase()}` : null,
        rating: 4.5,
        category: meta.category,
        sub_category: meta.sub_category,
        source: meta.source,
        badge: null,
        stock: 100,
        is_active: true,
        sort_order: 0,
        perishable: ["produce", "meat", "dairy"].includes(meta.source),
        fulfillment_type: "internal_stock",
        created_at: now,
        updated_at: now,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`📦 Built ${rows.length} product rows`);

  // Step 3: batch upsert
  const { data, error } = await sb
    .from("products")
    .upsert(rows, { onConflict: "id" })
    .select("id");
  if (error) {
    console.error("❌ upsert error:", error.message);
    process.exit(1);
  }
  console.log(`✅ Upserted ${data?.length ?? 0} rows into products`);

  console.log("\n=== TELEMETRY ===");
  console.log(`Images on disk:  ${files.length}`);
  console.log(`Images uploaded: ${uploaded}`);
  console.log(`Rows built:      ${rows.length}`);
  console.log(`Rows upserted:   ${data?.length ?? 0}`);
}

void main();
