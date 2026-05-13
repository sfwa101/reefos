# ATOMIC MELTDOWN REPORT — Core Disconnect Audit
_Read-only diagnostic. No code modified._

## TL;DR
Three independent regressions, one shared root cause: **the catalog runtime is a hybrid skeleton stuck between two ledgers**. The storefront still reads `usa_products` (legacy DNA, fully soft-deleted), while every new write — Vision Genesis, the Assets Ledger UI, and SC-1 morphing — targets `salsabil_assets` (USA). The bridge between the two ledgers does not exist.

---

## 1. Vision Crash — `useVisionGenesis` ⚠️

**Symptom:** "فشل تحليل الصورة" thrown immediately after the dual-image upgrade.

**Diagnosis:**
- `src/core-os/hakim-ai/hooks/useVisionGenesis.ts` (`fileToBase64`, line 54) reads each `File` via `FileReader.readAsDataURL` and ships the **raw, unbounded base64** for both `primaryFile` AND `secondaryFile` in a single `supabase.functions.invoke` body (line 81).
- A modern phone photo is 3-6 MB → ~5-8 MB base64. Two of them stack into a **10–16 MB JSON body**, well beyond Supabase Edge's effective ~6 MB request ceiling and Lovable AI Gateway's preferred payload size. The function returns a non-2xx envelope with no JSON; `data` is `null` and `error.message` surfaces only as the generic toast.
- Contributing factors:
  1. **No client-side downscale.** Files are sent at native resolution.
  2. **`error` branch loses context** (`useVisionGenesis.ts:90-94`) — when `data` is `null`, the code maps to `"unknown"` and throws an opaque error code; UI translates it to "فشل تحليل الصورة".
  3. **No edge-side log** — `supabase__edge_function_logs vision_genesis` returns empty: the request body is rejected at the runtime boundary before `Deno.serve` even runs (`vision_genesis/index.ts:54`). This proves the failure is transport-layer, not AI-layer.

**Files implicated:**
- `src/core-os/hakim-ai/hooks/useVisionGenesis.ts:54-89`
- `src/routes/admin.assets.genesis.tsx` (caller, not at fault)
- `supabase/functions/vision_genesis/index.ts` (innocent — never reached)

---

## 2. Ghost Storefront — 0 Products on Every Section 👻

**Symptom:** Every storefront category renders an empty grid.

**Diagnosis (DB-confirmed):**
- `salsabil_assets` (the new USA Ledger): **12 rows, all `physical`**, with `category_path` strings like `produce/fruits`, `supermarket/snacks`. **Not joined to any section_id.**
- `usa_products` (the legacy DNA the storefront actually queries): **207 rows, all `is_active=false` AND `deleted_at IS NOT NULL`** (wiped on 2026-05-13).
- Storefront pipeline reads **only** the wiped table:
  ```
  src/core/catalog/service/catalog.functions.ts:60-65
    supabase.from("usa_products")
      .select("*", { count: "exact" })
      .eq("section_id", section.id)
      .eq("is_active", true)
      .is("deleted_at", null);
  ```
  Every filter passes; result set is empty by construction.
- Section linkage SQL confirms the meltdown:
  ```
  SELECT s.slug, count(p.id)
  FROM sections s LEFT JOIN usa_products p
    ON p.section_id=s.id AND p.is_active=true AND p.deleted_at IS NULL
  GROUP BY s.slug;
  -- ALL 24 sections return count=0.
  ```
- The newly-minted `salsabil_assets` rows have **no `section_id` column at all** (schema in `docs/migrations-staging/20260507_salsabil_universal_engine.sql:46-71`). They use `category_path` as a free-text taxonomy. There is **no resolver, no view, no FK** mapping `category_path → sections.slug`.

**Hardwired-to-legacy files (must be re-pointed at USA):**
- `src/core/catalog/service/catalog.functions.ts` — `listProductsBySectionFn`, `getProductDetailsFn`, related-product reads. Every `.from("usa_products")` is a target.
- `src/core/catalog/runtime/ProductRuntimeEngine.ts` — `buildCardsBatch` / `buildDetails` consume `UsaProductRow`-shaped objects.
- `src/core/dna/projectors/projectProductDNA.ts` — types model the legacy row.
- `src/hooks/useProductsQuery.ts:196,263` — already reads `salsabil_assets` (good reference for the cutover shape).
- `src/lib/sovereignCatalog.ts` (8 hits) — already on `salsabil_assets`; this is the canonical surface to consolidate around.

**Sidecar tables still legacy-shaped:** `product_media`, `product_variants_v2`, `product_addons`, `product_nutrition`, `product_relations` all key on `product_id` (legacy `usa_products.id`). Genesis-minted assets have **zero rows in any of these**, so even if we re-pointed `from(...)` to `salsabil_assets`, hero media/nutrition/variants would still render blank without a joined-write path during minting.

---

## 3. Admin UI Pollution — Dual Catalog Surfaces 🪞

**Symptom:** Sidebar shows both legacy "المنتجات" and sovereign "الأصول".

**Diagnosis:**
- `src/components/admin/nav/workspaceNav.ts:50` declares the legacy entry:
  ```ts
  { to: "/admin/product-units", icon: Package, label: "المنتجات" },
  ```
- The sovereign Assets Ledger is mounted at `/admin/assets` (`src/pages/admin/UsaLedger.tsx`), but no nav entry surfaces it inside `REEF` — users currently reach it only via deep-link or the floating SmartActionComposer.
- Result: legacy CRUD UI (`/admin/product-units`) coexists with the new ledger, yet both lists are de-facto empty (legacy is wiped, USA has no UI link in the sidebar).

---

## Constitutional Verdict
- **Article 5.1 (Everything is an entity):** ❌ violated by the persistence split — assets live in `salsabil_assets`, but consumers read a different ledger.
- **Article 12.2 (Vision Cortex):** Partial — the cortex exists (`src/core/vision/gateway/vision.functions.ts`) but the UI still calls the legacy `useVisionGenesis` hook, which the cortex marks `@deprecated`. The dual-image payload makes the deprecation lethal.
- **Article 15.1 (Stem Cell):** Already restored at the layout layer (Phase SC-1), but the blocks it stamps out have no fuel because the catalog read targets a dead table.

---

## Surgical Plan — Phase N-1 (proposed, NOT executed)

### N-1.1 — Re-source the Storefront on USA
1. Introduce `assetsToCardVMs(rows)` in `src/lib/sovereignCatalog.ts`, projecting `salsabil_assets + salsabil_skus + salsabil_financial_contracts + salsabil_inventory_matrix` into `ProductCardVM`.
2. Replace **every** `from("usa_products")` in `src/core/catalog/service/catalog.functions.ts` with a `salsabil_assets` query. Map section → assets via `category_path LIKE '<section.slug>/%'` until a proper `section_id` column or `asset_section_links` join table exists.
3. Migrate sidecar reads (`product_media`, `product_nutrition`, `product_variants_v2`, `product_addons`, `product_relations`) to read from `salsabil_assets.media` JSONB and a new `asset_nutrition` view (or just `traits`), or — preferred — extend the Genesis mint path to also write the legacy sidecars during the cutover window.
4. Drop the dead `usa_products` rows in a migration once the cutover is verified.

### N-1.2 — Vision Payload Surgery
1. Add a client-side downscaler: pre-render each File onto an `OffscreenCanvas` capped at **1280px** longest edge, JPEG quality 0.82, before base64 encoding. (Cuts payload by ~85%.)
2. Switch `useVisionGenesis` to **upload to Storage first** (`vision-uploads` bucket, signed URL), then send only the URL pair to the edge function. Removes the JSON-payload limit entirely.
3. Surface the real error: when `data` is null, fall back to `error.message ?? error.context?.body` so the toast shows the actual rejection instead of "unknown".
4. Migrate callers from `useVisionGenesis` → `useInferEntity` (Vision Cortex) so the audit ledger is populated automatically.

### N-1.3 — Admin Nav Cleanup
1. Remove `{ to: "/admin/product-units", icon: Package, label: "المنتجات" }` from `workspaceNav.ts`.
2. Insert the sovereign entry: `{ to: "/admin/assets", icon: Package, label: "الأصول" }` in the same group.
3. Optionally redirect `/admin/product-units → /admin/assets` for stale bookmarks.

### Verification Gate
- `tsc --noEmit` green.
- `psql -c "SELECT count(*) FROM salsabil_assets WHERE is_active;"` matches storefront grid count for `produce` slug.
- Manual: capture a single-image and a dual-image Genesis run; both succeed; trace appears in `vision_inferences`.

---

**Audit complete. Ready for Phase N-1 nuclear cleanup on the Emperor's signal.**
