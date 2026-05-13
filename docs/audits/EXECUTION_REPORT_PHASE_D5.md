# Phase D-5 — Dimensional UI (Tag Graph Builder)

**Status:** ✅ Complete
**Constraint honored:** UI only. Zero direct DB writes from the component. Persistence deferred to D-6.

## Deliverables

### 1. `TagsGateway` (`src/core/commerce/gateway/TagsGateway.ts`)
Read-only façade for Phase D-5:
- `listAll()` → active vocabulary, ordered by axis then sort_order then value (cap 2000).
- `listLinksFor(assetId)` → resolved links (joined with tag) for hydration in edit mode.
- Conforms to `SUPABASE_SOVEREIGNTY.md` — UI imports the gateway, never `supabase.from()`.

### 2. `DimensionalTagSelector` (`src/components/commerce/assets/DimensionalTagSelector.tsx`)
Pure controlled component (`value` / `onChange` over `AssetTagDraft[]`).

**Speed-optimized UX (≤ 3-second tagging target):**
- Axis quick-pills at top (department · campaign · diet · velocity · …) — single click switches the active axis.
- Single combobox input with TWO modes:
  - Plain text → searches existing vocab on the active axis (fuzzy across `tag_value` + `label_i18n.ar` + `label_i18n.en`).
  - `axis:value` shorthand → overrides axis on the fly (e.g. `campaign:ramadan_2026`).
- **Enter key:** picks first suggestion if available, else creates the typed draft.
- **Backspace on empty input:** removes the last selected tag.
- Already-selected tags are filtered out of suggestions.
- New (un-persisted) drafts render with an emerald "جديد" badge so the Emperor can spot what will be created on save.

**Visual grouping:** selected tags cluster into per-axis cards (`Network` icon header, count chip, removable `Hash`-prefixed pill chips).

**Icons used:** `Tags`, `Network`, `Hash`, `Plus`, `X`, `Sparkles`, `Loader2`, `AlertCircle`.

### 3. `USAEditor` integration
- New tab **"الأبعاد"** (between Packaging and Inventory) with `Network` icon.
- TabsList expanded `grid-cols-5` → `grid-cols-6`.
- Toggle pattern mirrors Packaging: `classificationEnabled` chip in the tab header. Off-toggle clears local drafts.
- On asset hydrate:
  - Detects `CAP.MULTI_CLASSIFICATION` in `traits` to pre-flip the toggle.
  - Calls `TagsGateway.listLinksFor(asset.id)` and seeds `tagDrafts`. If links exist, force-enables the toggle even if the trait flag is missing (resilient).
- State (`tagDrafts`) is lifted in the editor; **no DB writes happen here.** D-6 will add a `TagsGateway.syncLinks()` writer + `persistTags(assetId)` call alongside `persistPackaging`.

## Type Safety
`bunx tsc --noEmit` → exit 0. No new errors.

## Next (Phase D-6, deferred per constraint)
1. Add `TagsGateway.upsertVocabulary(drafts)` + `TagsGateway.syncLinks(assetId, tags)`.
2. Wire `persistTags(assetId)` into `handleSave` after `persistPackaging`.
3. Stamp `CAP.MULTI_CLASSIFICATION` into asset `traits` on save when `classificationEnabled`.

---
**Phase D-5 Complete. The Dimensional UI is active. Salsabil assets can now exist across multiple dimensions simultaneously.**
