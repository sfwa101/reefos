# Product Engine Chaos Map — Pre-Build Reconnaissance

**Status:** Read-only audit · No code mutated
**Auditor:** Supreme Constitutional Auditor
**Reference:** Constitution v2.0 — Article 8.1 (Human Veto), Article 12.2 (Vision Cortex)
**Date:** 2026-05-13
**Scope:** Admin Product Panel · Asset creation flow · Hakim Vision Cortex schema

---

## 1. Executive Summary

The "Product Engine" is fragmented across **three coexisting surfaces** that
each present a different "Add Product" affordance:

1. `UsaLedger` (`/admin/assets`) — the canonical sovereign asset grid.
2. `SmartProductComposer` — a **Dialog/modal** masquerading as a route
   (`/admin/products/new` mounts the dialog inside a near-empty page).
3. `VisionGenesisUploader` — embedded co-pilot inside the composer.

All three carry their own buttons, their own image-upload UI, and their own
mental model of "a product". The sovereign minting path
(`vision.functions.ts → mint_universal_asset`) is correct, but the **client
chrome around it is non-sovereign**: modals, forced rear-camera, and a
schema that captures only the bare skeleton of an asset.

The Vision Cortex schema is the deepest chokepoint: even if we clean up the
UI, Hakim today returns only `{name, description, asset_type, traits[], skus[{sku_code, attributes}], financial_contract{pricing_model, base_price, currency}}` —
no structured nutrition, no weight, no barcode, no modifiers, no media,
no SEO. The DB columns exist; the AI never fills them.

Verdict: **Phase V-1 is mostly UI surgery + one prompt/schema upgrade.**
The sovereign gateway, ledger, and Human Veto stay untouched.

---

## 2. Inventory of Surfaces

### 2.1 Routes

| Route file | Page component | Notes |
|---|---|---|
| `src/routes/admin.assets.tsx` | `pages/admin/UsaLedger.tsx` | Canonical asset list. Uses `UniversalAdminGrid`. "+ جديد" opens `USAEditor`. |
| `src/routes/admin.products.new.tsx` | inline `NewProductRoute` | **Hosts a Dialog as a page.** Renders `<SmartProductComposer open={true} />` inside `min-h-[60vh]`; closing the dialog navigates to `/admin`. Pure modal-as-route anti-pattern. |
| `src/routes/admin.product-batches.tsx` / `.product-units.tsx` | legacy pages | Out of Phase V-1 scope but contribute "messy buttons" in admin nav. |

There is **no** `/admin/assets/new` route. Asset creation goes through
either (a) the `USAEditor` modal launched by `UsaLedger`, or (b) the
`SmartProductComposer` dialog launched from `SmartActionComposer` quick
actions / `/admin/products/new` deep link.

### 2.2 Editors / Composers

| Component | Path | LoC | Role | Chrome |
|---|---|---|---|---|
| `UsaLedger` | `pages/admin/UsaLedger.tsx` | 281 | Grid, metrics, edit/create entry points | Page |
| `USAEditor` | `apps/.../usa-editor/USAEditor.tsx` | 490 | Edit / create a single USA record | **Dialog** |
| `InventoryMatrixPanel` | same dir | 183 | SKU × location matrix | Subpanel inside USAEditor |
| `SmartProductComposer` | `apps/.../product-editor/SmartProductComposer.tsx` | 595 | "AI-first" creation with image slots + Hakim co-pilot | **Dialog** |
| `VisionGenesisUploader` | `apps/.../product-editor/VisionGenesisUploader.tsx` | 460 | Drop image → call `vision_genesis` → review board → mint via `useMintUSA` | Embedded |
| `BasicInfoForm`, `OptionsBuilder`, `PricingAndInventory`, `SmartTagSuggester`, `SpecsForm` | same dir | 67–205 each | Sub-forms slotted into composer | — |

**Source of "messy buttons":** `SmartProductComposer` (modal) and
`USAEditor` (modal) ship with their own dialog headers, footers, and
action bars; they are not part of an admin shell and cannot share a
toolbar with the grid. Quick-action launchers in `SmartActionComposer`
expose them as separate CTAs, doubling the entry-point surface.

---

## 3. The Camera Trap 📷

`<input type="file" capture="environment">` instructs mobile browsers to
**bypass the gallery and open the rear camera directly**. We have it in
three places:

| File | Line | Surface | Effect |
|---|---|---|---|
| `SmartProductComposer.tsx` | **482** | `PrimarySlot` (main product image) | Forces camera, no gallery. |
| `SmartProductComposer.tsx` | **538** | `SecondarySlot` (additional images) | Same. |
| `VisionGenesisUploader.tsx` | **297** | `cameraInputRef` | OK — paired with a separate `fileInputRef` (line 286-292) without `capture`, exposing both "Gallery" and "Camera" buttons. |

**Fix surface (Phase V-1):** Remove `capture="environment"` from
`SmartProductComposer` slots; if camera UX is desired, follow the
`VisionGenesisUploader` pattern — two inputs (one with capture, one
without) and let the user choose.

---

## 4. Hakim Vision Cortex Schema Gap

**Pipeline:**
`SmartProductComposer` / `VisionGenesisUploader` → `useInferEntity` (`src/core/vision/gateway/hooks.ts`) → `inferEntityFn` (`src/core/vision/gateway/vision.functions.ts`) → invokes edge fn `supabase/functions/vision_genesis/index.ts` → returns sanitized payload → audit row in `vision_inferences` (state `pending`) → `approveInferenceFn` calls `mint_universal_asset` RPC.

**Current AI tool schema** (edge fn `vision_genesis/index.ts`, lines 80-138):
```
asset:        { name, description, asset_type, traits[] }
skus[]:       { sku_code, attributes (free-form) }
financial_contract: { pricing_model, base_price, currency, contract_rules }
```

**Gaps vs. what the DB and product reality require:**

| Concern | DB field | In AI schema? | Notes |
|---|---|:---:|---|
| Long marketing description | `salsabil_assets.description` | partial | One short field, no rich/section split |
| Category path | `salsabil_assets.category_path` | ❌ | Hakim never suggests a category |
| Media (multiple images) | `salsabil_assets.media` jsonb[] | ❌ | Composer uploads images outside the AI flow |
| Traits (typed) | `salsabil_assets.traits` jsonb | partial | Free strings only — no nutrition keys, no allergens, no shelf life |
| Nutrition facts | (lives in `traits`) | ❌ | No `nutrition: {kcal, protein, fat, carbs, sodium, sugar...}` |
| Net weight / unit | (lives in `traits`/`attributes`) | ❌ | No `net_weight`, `weight_unit`, `volume`, `pack_size` |
| Barcode (EAN/UPC) | `salsabil_skus.barcode` (UNIQUE) | ❌ | Hakim cannot read the barcode it sees |
| Variant axes / modifiers | SKU attributes + modifier engine | partial | `attributes` is free-form blob; no axis declaration (size, flavor, color) |
| SEO (slug, keywords) | derived | ❌ | Not requested |
| Brand / supplier hint | derived | ❌ | Not requested |
| Origin country / Halal flag | traits | ❌ | High-value for ريف المدينة catalog |
| Storage / handling traits | traits | partial | Only inferred as free strings |
| Pricing tiers / wholesale | `contract_rules` | ❌ schema-less | Free `additionalProperties: true` — no shape contract |

**Architectural gap:** the edge fn's tool schema is the single point that
gates everything Hakim can give us. Even with a stronger model, the
forced tool call (`tool_choice: generate_usa_payload`) prevents emergent
fields. Phase V-1 must **expand the schema and the system prompt** in
lockstep.

---

## 5. Sovereign Asset Boundary

There is **no** `src/apps/reef-al-madina/features/catalog/domain/SovereignCatalog.ts`
in the tree (legacy reference; was removed during the USA migration).
The live boundary is the database itself plus generated types:

- `salsabil_assets`: `id, name, description, category_path, asset_type, traits jsonb, media jsonb, is_active, semantic_embedding, deleted_at, ...`
- `salsabil_skus`: `id, asset_id, sku_code, barcode (UNIQUE), attributes jsonb, sort_order, deleted_at, ...`
- `salsabil_financial_contracts`: pricing model + base price + rules per SKU.
- `salsabil_inventory_matrix`: SKU × location stock.
- `vision_inferences`: append-only audit ledger (Article 12.2).

**Fields ALREADY present in DB but unused by the AI:** `category_path`,
`media`, `barcode`, structured `attributes`, `semantic_embedding`. The
DB is over-built; the AI under-fills it.

**Fields NOT yet in DB (would need a migration in a later phase, NOT V-1):**
none required — `traits` jsonb is the proper home for nutrition,
weight, allergens, origin, halal flag, etc. Phase V-1 can land entirely
in jsonb without a schema migration.

---

## 6. Constitutional Compliance Snapshot

| Article | State | Note |
|---|---|---|
| 8.1 Human Veto | ✅ | `approveInferenceFn` mints only after explicit click; nothing auto-persists. |
| 12.2 Vision Cortex | ⚠️ | Cortex exists and audits, but model tool-schema is a strict subset of business reality. |
| Domain boundaries | ⚠️ | `SmartProductComposer` couples capture, AI, image upload, SKU edit, and minting in a 595-LoC dialog. |
| Modal-as-route | ❌ | `/admin/products/new` mounts a Dialog inside an empty page; not a real full-screen route. |

---

## 7. Phase V-1 Surgical Plan — *Kill Modals · Unchain Camera · Supercharge Hakim*

Three small, ordered, reversible cuts. No DB migration required.

### V-1.A — Unchain the Camera (10-line patch)
1. `SmartProductComposer.tsx`: delete `capture="environment"` on lines **482** and **538**.
2. Optionally adopt the `VisionGenesisUploader` two-input pattern: one
   plain `<input type="file">` (gallery) and one `capture="environment"`
   triggered by a "كاميرا" button.
3. Verify `VisionGenesisUploader` already gives the user the choice — leave it alone.

**Risk:** zero. Removes a hard restriction.

### V-1.B — Kill the Modal-as-Route (full-screen routes)
1. New route `src/routes/admin.assets.new.tsx` — full page, not a Dialog,
   hosting a refactored `<AssetComposerPage>`.
2. New route `src/routes/admin.assets.$assetId.edit.tsx` — full page hosting
   the editor (replacing the `USAEditor` Dialog usage from `UsaLedger`).
3. Repoint `UsaLedger`'s "+ جديد" and row "تعديل" actions to `Link`s into
   the new routes; keep `USAEditor` as the body component (not Dialog).
4. Repoint `/admin/products/new` to redirect → `/admin/assets/new` (or
   delete after a deprecation window).
5. `SmartActionComposer` quick-action targets switch from `setOpen(true)`
   to `navigate({ to: "/admin/assets/new" })`.

Decompose `SmartProductComposer` (595 LoC) along the way:
- `<AssetComposerHeader>` (sticky top: status + Hakim badge + actions)
- `<AssetMediaGallery>` (multi-image, drag/drop, gallery + camera buttons)
- `<HakimDraftPanel>` (collapsible review board for the inference trace)
- `<AssetIdentityForm>` (name, category, description, traits)
- `<AssetCommerceForm>` (pricing, units, weight, barcode)
- `<AssetVariantsBuilder>` (SKU axes, modifiers)

Each component ≤ 150 LoC, all rendered inside the new full-screen route.

### V-1.C — Supercharge Hakim's Vision Cortex
1. **Edge fn `vision_genesis/index.ts`**: extend the `generate_usa_payload`
   tool schema to include:
   ```
   asset.category_path: string
   asset.brand: string?
   asset.origin_country: string?
   asset.halal: boolean?
   asset.seo: { slug, keywords[] }?
   asset.nutrition: { kcal, protein_g, fat_g, carbs_g, sugar_g, sodium_mg, ... }?
   asset.physical: { net_weight, weight_unit, volume_ml, pack_size }?
   asset.handling_traits: string[]   // cold_chain, fragile, ...
   skus[].barcode: string?
   skus[].variant_axes: { size?, color?, flavor?, pack? }
   skus[].pricing_override: { base_price?, currency? }?
   modifiers: [{ key, label, options[{label, price_delta}] }]?
   media_hints: [{ slot, alt_text }]
   ```
2. Upgrade the system prompt to explicitly enumerate every field, with
   Arabic guidance and a strict "fill what you see, leave null what you
   don't" rule.
3. Bump `LEGACY_PROMPT_VERSION` → `v1-rich` in `vision.functions.ts` so the
   `vision_inferences` audit ledger can later A/B-compare prompt eras.
4. Mirror the schema in a Zod parser inside `inferEntityFn` for
   server-side defense-in-depth (the edge fn already sanitizes; double-check).
5. Update `mint_universal_asset` consumers to pass the richer
   `traits`/`attributes`/`media` blobs through unchanged — DB already
   accepts arbitrary jsonb.

**Risk:** medium — prompt regression possible. Mitigation: keep the
sanitizer permissive (missing fields → null/skip), and the audit ledger
makes every inference reviewable.

---

## 8. Risk & Zero-Breakage Checklist

- ✅ DB schema unchanged. All new richness lands in existing jsonb columns.
- ✅ `mint_universal_asset` RPC and `approveInferenceFn` Human Veto preserved.
- ✅ Modal removal is additive: new routes ship, old `Dialog`-based entry
  points are repointed; can be reverted with a one-line import swap.
- ✅ Camera unchain is a 2-line deletion.
- ✅ Prompt/schema upgrade is versioned via `prompt_version` — rollback by
  reverting the edge fn.

---

## 9. Recommendation

Proceed in this order:

1. **V-1.A** (camera unchain) — single commit, ship today.
2. **V-1.C** (Hakim schema) — second commit, validates richer payloads in
   the existing modal before the chrome changes.
3. **V-1.B** (full-screen routes + decomposition) — third commit, the
   largest of the three, lands once Hakim is producing the new payload.

**Awaiting the Emperor's order to begin V-1.A.**
