# Product Cortex Gap Analysis — Vision Genesis Pre-Build Audit

**Status:** Read-only · No code mutated
**Auditor:** Supreme Commerce Intelligence Architect
**Reference:** Constitution v2.0 — Article 8.1 (Human Veto), Article 12.2 (Vision Cortex)
**Date:** 2026-05-13
**Scope:** Admin asset creation UI · Image capture inputs · Hakim Vision tool schema

---

## 1. Executive Summary

The current Admin Product surface is stuck in a **Sensory Layer**: it sees
pixels, mints rows, and stops there. Three concrete gaps block the leap to a
**Product Cortex**:

1. **The Camera Trap** — `capture="environment"` hard-wires the rear camera
   on mobile, denying gallery/library access.
2. **The Modal Trap** — `/admin/products/new` is a Dialog wrapped in an empty
   page, not a true full-screen route.
3. **The DNA Gap** — Hakim's tool schema captures only `{name, description,
   asset_type, traits[], skus, financial_contract}` — no nutrition, no
   barcode, no weight, no category, no marketing copy.

All three are surgical, additive, and require **zero database migration**
(jsonb columns already exist for the missing richness).

---

## 2. Finding #1 — The Camera Trap 📷

`<input type="file" capture="environment">` instructs mobile browsers to
**bypass the photo gallery** and open the rear camera directly. The user
cannot pick an existing photo.

| File | Line | Surface | Effect |
|---|---|---|---|
| `src/apps/reef-al-madina/features/admin/product-editor/SmartProductComposer.tsx` | **482** | `PrimarySlot` (main image) | Forces camera, no gallery. |
| `src/apps/reef-al-madina/features/admin/product-editor/SmartProductComposer.tsx` | **538** | `SecondarySlot` (extra images) | Same. |
| `src/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader.tsx` | 297 | `cameraInputRef` | ✅ Acceptable — paired with a separate gallery input (line 286-292) so the user can choose. |

**Unchain pattern (already proven in `VisionGenesisUploader`):**
- One `<input type="file" accept="image/*">` → "من المعرض" (Gallery).
- One `<input type="file" accept="image/*" capture="environment">` → "كاميرا".
- Two visible buttons; user picks.

**Fix surface:** delete `capture="environment"` on lines 482 & 538 of
`SmartProductComposer.tsx`, or migrate both slots to the dual-input pattern.

---

## 3. Finding #2 — The Modal Trap (UI Chaos)

Routes & entry points to "Add Product":

| Route file | Page | Chrome | Verdict |
|---|---|---|---|
| `src/routes/admin.assets.tsx` → `pages/admin/UsaLedger.tsx` | Grid + "+ جديد" | Opens `USAEditor` **Dialog** (490 LoC) | Modal |
| `src/routes/admin.products.new.tsx` | Inline `NewProductRoute` | Renders `<SmartProductComposer open={true} />` (a Dialog) inside an empty page | **Modal-as-route anti-pattern** |
| `SmartActionComposer` quick actions | Various | Trigger the same Dialogs | Modal |

**There is no full-screen creation route.** Every path lands in a `Dialog`
which on mobile (375px viewport — the user's current viewport) crops the
content into a cramped sheet, hides the keyboard behind the modal, and
fights with iOS Safari's URL bar.

**Replacement plan:**

| New full-screen route | File to create | Hosts |
|---|---|---|
| `/admin/assets/genesis` | `src/routes/admin.assets.genesis.tsx` | New `<AssetGenesisPage>` — AI-first uploader + Hakim review board + Human Veto bar |
| `/admin/assets/new` | `src/routes/admin.assets.new.tsx` | Manual full-screen composer (decomposed `SmartProductComposer`) |
| `/admin/assets/$assetId/edit` | `src/routes/admin.assets.$assetId.edit.tsx` | Full-screen edit (replaces `USAEditor` Dialog usage) |

Repoint `UsaLedger`'s "+ جديد" and `SmartActionComposer` quick actions to
`<Link to="/admin/assets/genesis">`. Redirect the legacy
`/admin/products/new` to the new genesis route.

The 595-LoC `SmartProductComposer` should be decomposed inside the
full-screen route into:
`<AssetGenesisHeader>` · `<AssetMediaGallery>` · `<HakimDraftPanel>` ·
`<AssetIdentityForm>` · `<AssetCommerceForm>` · `<AssetVariantsBuilder>` ·
`<HumanVetoActionBar>` (sticky footer: Reject / Edit / Approve & Mint).

---

## 4. Finding #3 — The DNA Gap (Hakim's Vision Schema)

**Pipeline:** UI → `useInferEntity` → `inferEntityFn`
(`src/core/vision/gateway/vision.functions.ts`) → edge fn
`supabase/functions/vision_genesis/index.ts` → `vision_inferences` audit row
→ `approveInferenceFn` → `mint_universal_asset` RPC.

**Current tool schema** (edge fn `vision_genesis/index.ts`, lines 80-138):

```ts
asset:              { name, description, asset_type, traits[] }
skus[]:             { sku_code, attributes (free-form) }
financial_contract: { pricing_model, base_price, currency, contract_rules }
```

**Gap matrix vs. true Product DNA:**

| DNA Pillar | Field | DB ready? | In schema? |
|---|---|:---:|:---:|
| **Identity** | name | ✅ `assets.name` | ✅ |
| | category_path | ✅ `assets.category_path` | ❌ |
| | brand | ✅ `assets.traits` | ❌ |
| | barcode (EAN/UPC) | ✅ `skus.barcode` UNIQUE | ❌ |
| | variant axes (size/color/flavor) | ✅ `skus.attributes` | ⚠️ free blob, no axis declaration |
| | net weight / volume / pack size | ✅ `assets.traits` | ❌ |
| | origin country / halal flag | ✅ `assets.traits` | ❌ |
| **Financial** | suggested base price | ✅ contract | ✅ |
| | cost / margin | ✅ `assets.traits` | ❌ |
| | tier / wholesale rules | ✅ `contract_rules` | ⚠️ schemaless |
| | per-SKU price override | ✅ contracts | ❌ |
| **Nutritional** | kcal, protein, fat, carbs, sugar, sodium | ✅ `assets.traits` | ❌ |
| | allergens | ✅ `assets.traits` | ❌ |
| | shelf life / storage | ✅ `assets.traits` | ❌ |
| **Marketing** | rich description | ✅ `assets.description` | ⚠️ short |
| | SEO slug + keywords | derived | ❌ |
| | media slot hints + alt text | ✅ `assets.media` | ❌ |
| | handling traits (cold_chain, fragile) | ✅ `assets.traits` | ⚠️ free strings only |

**Architectural chokepoint:** the edge fn forces
`tool_choice: { name: "generate_usa_payload" }`, so the model **cannot
emit fields outside the declared schema**. Expanding the tool schema and
the system prompt is the single highest-leverage move.

---

## 5. Constitutional Compliance Snapshot

| Article | State | Note |
|---|---|---|
| 8.1 Human Veto | ✅ | `approveInferenceFn` mints only on explicit user action. |
| 12.2 Vision Cortex | ⚠️ | Audited & gated, but the tool schema is a strict subset of business reality. |
| Domain boundaries | ⚠️ | `SmartProductComposer` couples capture + AI + image upload + SKU edit + minting in 595 LoC. |
| Modal-as-route | ❌ | `/admin/products/new` mounts a Dialog inside an empty page. |

---

## 6. Phase V-1 Plan — *Vision Genesis*

Three ordered, reversible commits. **No DB migration required.**

### V-1.A — Unchain the Camera (≤10 lines)
Delete `capture="environment"` on `SmartProductComposer.tsx:482, 538`, or
migrate to the dual-input gallery+camera pattern already used by
`VisionGenesisUploader`. **Risk: zero.**

### V-1.B — Supercharge the Vision Cortex Schema (the DNA upgrade)
1. Edge fn `supabase/functions/vision_genesis/index.ts` — extend
   `generate_usa_payload` to include:
   ```
   asset.category_path: string
   asset.brand?: string
   asset.origin_country?: string
   asset.halal?: boolean
   asset.marketing: { short, long, seo_slug, seo_keywords[] }
   asset.nutrition?: { kcal, protein_g, fat_g, carbs_g, sugar_g, sodium_mg, fiber_g }
   asset.physical?: { net_weight, weight_unit, volume_ml, pack_size }
   asset.handling_traits: string[]   // cold_chain, fragile, halal_certified...
   asset.allergens?: string[]
   asset.cost_estimate?: number
   skus[].barcode?: string
   skus[].variant_axes: { size?, color?, flavor?, pack? }
   skus[].pricing_override?: { base_price?, currency? }
   media_hints: [{ slot, alt_text }]
   ```
2. Upgrade the system prompt to enumerate every field with an explicit
   "fill what you see, leave null otherwise" rule (Arabic guidance).
3. Bump `LEGACY_PROMPT_VERSION → "v1-rich-dna"` in
   `src/core/vision/gateway/vision.functions.ts` so the
   `vision_inferences` ledger can A/B compare prompt eras.
4. Mirror the schema in a Zod validator inside `inferEntityFn` for
   defense-in-depth (the edge fn already sanitizes — double-check).
5. Pass the richer `traits` / `attributes` / `media` blobs through
   `mint_universal_asset` unchanged (DB accepts arbitrary jsonb).

**Risk:** medium — prompt regression possible. Mitigation: permissive
sanitizer (missing → null), audit ledger keeps every inference reviewable.

### V-1.C — Build the Full-Screen Genesis Route (Human Veto stage)
1. Create `src/routes/admin.assets.genesis.tsx` — full page, mobile-first,
   no Dialog. Sections:
   - **Capture** — gallery + camera buttons, multi-image dropzone.
   - **Hakim Draft** — live progress card, then a structured DNA review
     board (Identity · Financial · Nutrition · Marketing tabs).
   - **Human Veto Action Bar** (sticky bottom): `رفض` · `تعديل` ·
     `اعتماد ونشر` → calls `useApproveInference`.
2. Create `src/routes/admin.assets.new.tsx` (manual mode, decomposed).
3. Create `src/routes/admin.assets.$assetId.edit.tsx` (replaces USAEditor
   Dialog).
4. Repoint `UsaLedger` "+ جديد" → `<Link to="/admin/assets/genesis">`.
5. Redirect `/admin/products/new` → `/admin/assets/genesis`.
6. Decompose `SmartProductComposer` into ≤150-LoC components.

**Risk:** medium — largest commit. Old Dialog entry points stay until the
new routes are validated; revert is one import swap.

---

## 7. Recommended Sequencing

1. **V-1.A** (camera unchain) — single commit, ship immediately.
2. **V-1.B** (DNA schema + prompt upgrade) — second commit, validates
   richer payloads inside the existing modal **before** the chrome moves.
3. **V-1.C** (full-screen Genesis route + decomposition) — third commit,
   ships once Hakim is producing rich DNA payloads.

---

## 8. Zero-Breakage Checklist

- ✅ DB schema unchanged; all richness lands in existing `jsonb` columns.
- ✅ `mint_universal_asset` RPC and Human Veto preserved.
- ✅ Modal removal is additive — old Dialog entry points stay until cutover.
- ✅ Camera unchain is a 2-line deletion.
- ✅ Prompt/schema upgrade is versioned via `prompt_version` — rollback by
  reverting the edge fn.

---

**Audit complete. The Cortex Gap is mapped. Awaiting the Emperor's order to execute Phase V-1: Vision Genesis, beginning with V-1.A (Unchain the Camera).**
