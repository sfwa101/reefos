# Section Layout Manager — Architectural Blueprint

> **Wave R-3 · Reconnaissance Document**
> Author: Principal SDUI Architect
> Status: READ-ONLY blueprint. No source code modified. Implementation pending Emperor's go-signal.

---

## 0. Mission

Empower the admin to **reorder, hide, configure, and publish** the mobile/storefront section stack (Crepes, Ice Cream, Mega Offers, Bundles, Hero Banners, …) entirely from the Admin ERP — **zero frontend code changes, zero deploys**.

The runtime (`LayoutFactory` / SDUI engine) already consumes a `section_order` + `section_config` contract from `ui_layouts`. This blueprint defines the **richer, block-level layout schema** stored alongside it in `app_settings`, and the **drag-and-drop Admin UI** that authors it.

---

## 1. SDUI Schema — `mobile_home_layout_v1`

### 1.1 Top-Level Document

```ts
// src/lib/section-manager.types.ts  (to be created in implementation phase)

export type LayoutBlockKind =
  | "hero_banner"      // single full-width banner
  | "carousel"         // horizontal product/category rail
  | "grid"             // n-column product/category grid
  | "category_strip"   // story-circle style category row
  | "mega_offer"       // featured offer block w/ countdown
  | "bundle_rail"      // curated bundles
  | "section_ref"      // pointer to a registered SectionKey (legacy bridge)
  | "spacer"           // vertical rhythm
  | "html_note";       // admin-authored notice (sanitized)

export type EntityRef =
  | { kind: "category"; slug: string }
  | { kind: "product"; id: string }
  | { kind: "bundle"; id: string }
  | { kind: "offer"; id: string }
  | { kind: "section"; key: string };   // SectionKey from sdui-engine/types

export interface LayoutBlock {
  id: string;                    // ULID — stable across reorders
  kind: LayoutBlockKind;
  title?: string;                // Arabic display title
  subtitle?: string;
  is_active: boolean;            // hide without deleting
  sort_order: number;            // 0-based, dense, unique within document
  config?: {
    variant?: string;            // kind-specific variant token
    padding?: "sm" | "md" | "lg";
    tone?: "primary" | "accent" | "info" | "success" | "warning" | "teal";
    columns?: 2 | 3 | 4;         // for grid
    autoplay_ms?: number;        // for carousel/hero
    show_timer?: boolean;        // for mega_offer
    density?: "compact" | "comfortable" | "spacious";
  };
  entity_refs?: EntityRef[];     // what data the block pulls

  /**
   * Target Zones — "Manage Once, Reflect Everywhere".
   * A single block document drives ALL three surfaces. Each flag is
   * independent; a block may appear in any combination of zones.
   * Defaults (when omitted): home_feed = true, stories = false, grid = true.
   */
  display_in_stories: boolean;   // top horizontal Story Bar (circular bubbles)
  display_in_grid: boolean;      // dedicated Categories screen (full grid/list)
  display_in_home_feed: boolean; // vertical scrollable block on Home

  /** Optional per-zone overrides (icon/cover/sort) when one asset isn't enough. */
  zone_overrides?: {
    stories?:   { icon_url?: string; label?: string; sort_order?: number };
    grid?:      { cover_url?: string; label?: string; sort_order?: number };
    home_feed?: { sort_order?: number };
  };

  visibility?: {
    min_tier?: "guest" | "registered" | "amanah" | "vip";
    platforms?: Array<"web" | "ios" | "android">;
    starts_at?: string;          // ISO
    ends_at?: string;            // ISO
  };
}

export interface MobileHomeLayoutV1 {
  __v: 1;                        // schema version (per RUNTIME_SCHEMA_SPEC §6)
  page_key: "mobile_home";
  updated_at: string;            // ISO
  updated_by: string;            // admin user_id
  blocks: LayoutBlock[];
  draft?: LayoutBlock[];         // optional unpublished draft
}
```

### 1.2 Validation Rules (Zod, enforced at gateway boundary)

1. `blocks[].id` must be unique, ULID-shaped (`/^[0-9A-HJKMNP-TV-Z]{26}$/`).
2. `sort_order` values must be **dense** (`0..n-1`) and unique — gateway re-normalizes on save.
3. `entity_refs` shape must match `kind` (e.g. `carousel` requires ≥1 ref).
4. `visibility.starts_at < ends_at` when both present.
5. `config.columns ∈ {2,3,4}`; other enums validated against allow-lists from `sdui-engine/types`.
6. Total blocks ≤ **40** (DoS guard).
7. Total document size ≤ **64 KB** serialized (matches `app_settings.value` JSONB sanity bound).
8. **At least one** `display_in_*` flag must be `true` per block — orphan blocks (invisible everywhere) are rejected with `block_orphaned:<id>`.
9. `display_in_stories = true` requires either `zone_overrides.stories.icon_url` or a derivable icon from `entity_refs[0]` (category cover) — enforced at save.
10. `display_in_grid = true` requires a label (block `title` or `zone_overrides.grid.label`) — enforced at save.
11. Per-zone `sort_order` (when present in `zone_overrides`) must be unique within that zone; gateway re-normalizes.

Any violation → reject with `invalid_layout:<reason>`. **Never persist a half-valid document.**

---

## 2. Storage Strategy

### 2.1 Persistence Target

Reuse the existing **`public.app_settings`** key/value JSONB store via the already-sanctioned **`admin-settings.functions.ts`** gateway. **No new table, no new migration.**

| Key | Purpose |
|---|---|
| `mobile_home_layout_v1` | Published layout (live to clients) |
| `mobile_home_layout_v1_draft` | Optional draft buffer (admin preview only) |

### 2.2 Gateway Extension (implementation phase)

Add `mobile_home_layout_v1` and `mobile_home_layout_v1_draft` to the `ALLOWED_KEYS` set in `src/lib/admin-settings.functions.ts`. Add a dedicated branch inside `upsertAppSettingFn` that runs the Zod validator from §1.2 when `key.startsWith("mobile_home_layout_")`.

**No new server functions required.** Reuse `getAppSettingsFn` / `upsertAppSettingFn`. This keeps the gateway surface minimal and the audit trail unified.

### 2.3 Client Read Path — "Manage Once, Reflect Everywhere"

A **single document** drives all three surfaces. Three thin selector hooks read the same cached payload and project it onto each zone:

| Hook | Surface | Selection |
|---|---|---|
| `useHomeFeedLayout()` | Home vertical scroll | `blocks.filter(b => b.is_active && b.display_in_home_feed)` sorted by `sort_order` |
| `useHomeStoryBar()` | Top circular Story Bar | `blocks.filter(b => b.is_active && b.display_in_stories)` sorted by `zone_overrides.stories.sort_order ?? sort_order` |
| `useCategoriesGridLayout()` | Dedicated Categories screen | `blocks.filter(b => b.is_active && b.display_in_grid)` sorted by `zone_overrides.grid.sort_order ?? sort_order` |

All three share a single TanStack Query key (`['mobile_home_layout_v1']`) — one network round-trip, three projections. Toggling a flag in the admin propagates to **every** surface on the next cache invalidation.

Each hook falls back to `DEFAULT_MOBILE_HOME_LAYOUT` so no surface ever renders blank. Cache: 1h `staleTime` (matches existing SDUI cache policy).

### 2.4 RLS Posture

- **Read of `mobile_home_layout_v1`** (published): `select` allowed to `anon` for that single key only (via `policy USING (key = 'mobile_home_layout_v1')`), or fronted by an unauthenticated server fn — decided at implementation time after security review.
- **Read of `*_draft` and write of all keys**: admin-only, already enforced by `requireAdmin` middleware.

### 2.4 RLS Posture

- **Read of `mobile_home_layout_v1`** (published): `select` allowed to `anon` for that single key only (via `policy USING (key = 'mobile_home_layout_v1')`), or fronted by an unauthenticated server fn — decided at implementation time after security review.
- **Read of `*_draft` and write of all keys**: admin-only, already enforced by `requireAdmin` middleware.

---

## 3. Admin UI Architecture — `src/pages/admin/SectionManager.tsx`

### 3.1 Layout (3-column workbench)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header:  [محرر ترتيب الأقسام]  [Draft|Published]  [حفظ مسودة]  [نشر]        │
├──────────────┬─────────────────────────────────────────┬─────────────────────┤
│ Block        │  Canvas — Tabs: [الكل] [Home] [Stories] │  Inspector          │
│ Palette      │                  [Categories Grid]      │                     │
│              │                                         │  Selected block:    │
│ • Hero       │  ▦ Hero Banner          🏠 ⭕ ▦  [⋮]    │  ─ id, kind         │
│ • Carousel   │  ▦ Story Circles        ·  ⭕ ·  [⋮]    │  ─ title / subtitle │
│ • Grid       │  ▦ Mega Offer           🏠 ·  ▦  [⋮]    │  ─ config           │
│ • Mega Offer │  ▦ Crepes Carousel      🏠 ⭕ ▦  [⋮]    │  ─ entity_refs      │
│ • Bundles    │  ▦ Ice Cream Grid       🏠 ⭕ ▦  [⋮]    │  ─ visibility       │
│ • Spacer     │  ▦ + Add block                          │                     │
│              │                                         │  ▼ Target Zones     │
│              │  Legend: 🏠 Home Feed  ⭕ Stories  ▦ Grid│   ⬜ display_in_…   │
│              │                                         │     home_feed       │
│              │                                         │   ⬜ display_in_…   │
│              │                                         │     stories         │
│              │                                         │   ⬜ display_in_…   │
│              │                                         │     grid            │
│              │                                         │                     │
│              │                                         │  ▼ Zone Overrides   │
│              │                                         │   stories.icon_url  │
│              │                                         │   grid.cover_url    │
│              │                                         │   per-zone sort     │
│              │                                         │                     │
│              │                                         │  [حذف الكتلة]       │
└──────────────┴─────────────────────────────────────────┴─────────────────────┘
```

**Canvas Zone Tabs** — the canvas can be filtered to a single zone. Reordering inside a zone tab updates that zone's `zone_overrides.<zone>.sort_order`; reordering inside the **الكل** tab updates the canonical `sort_order`. This gives the admin precise per-surface control without losing the global stack.

**Inline Zone Chips on each Block Card** — the three glyphs (🏠 ⭕ ▦) are clickable toggles for `display_in_home_feed`, `display_in_stories`, `display_in_grid` respectively. One click flips the flag; the chip dims when off. This is the fastest path to "Manage Once, Reflect Everywhere".

### 3.2 Library Choice

**`@dnd-kit/core` + `@dnd-kit/sortable`** — chosen over native HTML5 DnD because:

- Already common in the React ecosystem; predictable touch + keyboard support (a11y).
- No global drag-image styling battles.
- Composable with our existing Tailwind design tokens.

If `@dnd-kit` is not yet installed it will be added via `bun add @dnd-kit/core @dnd-kit/sortable` during implementation.

### 3.3 Component Decomposition

```
src/pages/admin/SectionManager.tsx          // page shell, draft/publish toolbar
src/components/admin/section-manager/
  ├─ BlockPalette.tsx                       // left rail, "drag to add"
  ├─ LayoutCanvas.tsx                       // <DndContext><SortableContext> + zone tabs
  ├─ ZoneTabs.tsx                           // [All|Home|Stories|Grid] filter
  ├─ BlockCard.tsx                          // sortable item; inline zone chips 🏠⭕▦
  ├─ BlockInspector.tsx                     // right panel, controlled form
  ├─ ZoneTogglePanel.tsx                    // 3 switches + zone_overrides editor
  ├─ EntityRefPicker.tsx                    // category/product/bundle search
  ├─ VisibilityWindowEditor.tsx             // tier + date range
  └─ useSectionManagerStore.ts              // Zustand local draft state
src/lib/section-manager.types.ts            // schema + Zod validators
src/lib/section-manager.functions.ts        // (optional) thin wrappers around
                                            //   getAppSettingsFn/upsert for typing
```

### 3.4 State Machine (Zustand)

```text
loaded ──edit──▶ dirty ──saveDraft──▶ draftSaved ──publish──▶ published
   ▲                │                                         │
   └────── discard ─┘◀──────────── reset ───────────────────────┘
```

- All edits mutate **local store only**; nothing hits the network until `حفظ مسودة` or `نشر`.
- `نشر` runs the Zod validator client-side first → on pass, calls `upsertAppSettingFn({ key: 'mobile_home_layout_v1', value })`.
- Optimistic update + toast; on error, store rolls back.

### 3.5 Constitutional Guarantees

- **C-1 compliance**: Zero direct `@/integrations/supabase/client` imports. All I/O routes through `useServerFn(...)` wrappers.
- **RUNTIME_SCHEMA_SPEC §3**: Every block descriptor is Zod-validated **before** save and **before** render. No rumors run.
- **EVENT_SYSTEM**: On publish, emit `admin.layout.published` so observability + cache invalidators react uniformly.
- **AI_GOVERNANCE**: AI-suggested block arrangements (future) must pass the same validator + capability gate; no silent injection.

---

## 4. Step-by-Step Implementation Guide

| # | Step | Files Touched | Verification |
|---|------|---------------|--------------|
| 1 | Define types + Zod validators | `src/lib/section-manager.types.ts` (new) | `tsc --noEmit` |
| 2 | Extend `ALLOWED_KEYS` + add layout-validation branch in `upsertAppSettingFn` | `src/lib/admin-settings.functions.ts` | unit test invalid payload rejected |
| 3 | Add public read path (`getPublicLayoutFn` **or** narrow RLS policy) for `mobile_home_layout_v1` | `src/lib/section-manager.functions.ts` (new) + optional migration | anon `select` returns only that key |
| 4 | Install DnD library | `package.json` | `bun add @dnd-kit/core @dnd-kit/sortable` |
| 5 | Build Zustand store + types | `useSectionManagerStore.ts` | local DnD reorder works in isolation |
| 6 | Build presentational components (Palette, Canvas, Card, Inspector, Pickers) | `src/components/admin/section-manager/*` | Storybook-style smoke render |
| 7 | Compose page shell with draft/publish toolbar | `src/pages/admin/SectionManager.tsx` | route `/admin/section-manager` renders |
| 8 | Register route | `src/routes/admin.section-manager.tsx` (new) | nav link works |
| 9 | Wire client `useMobileHomeLayout()` + integrate into a single sandboxed storefront page first | `src/hooks/useMobileHomeLayout.ts` (new) | layout swap reflected on reload |
| 10 | Roll out to full mobile home; deprecate legacy `section_order` rows where superseded | `LayoutFactory` adapter | green build + manual QA |
| 11 | Add audit log + `admin.layout.published` event | gateway + event bus | event observed |
| 12 | Documentation + ADR | `docs/adr/00XX-section-layout-manager.md` | merged |

Each step is a Micro-Prompt boundary. **Halt gracefully between steps**; never bundle 3+ rows into one batch.

---

## 5. Out of Scope (explicit deferrals)

- A/B testing of layouts (future: add `experiment_id` to block).
- Per-user personalization (future: derive from `mobile_home_layout_v1` × user signals).
- Rich-content blocks (video, AR) — phase 2.
- Cross-page layout editor (currently scoped to `mobile_home`; the schema is page-key agnostic, so generalization is a label change, not a rewrite).

---

## 6. Risk Register

| Risk | Mitigation |
|---|---|
| Admin publishes broken JSON | Client + server Zod validation; reject before write |
| Anon read leaks other `app_settings` keys | Either dedicated RLS policy filtered to one key, or a thin `getPublicLayoutFn` that hard-codes the key |
| Schema drift vs. legacy `ui_layouts` | `section_ref` block kind bridges the two during migration window |
| DnD performance on long lists | Cap at 40 blocks (§1.2 rule 6); virtualization not needed |
| Lost edits | Auto-save draft to `localStorage` every 5s in addition to explicit `حفظ مسودة` |

---

## 7. Acknowledgement

Reconnaissance complete. The Section Layout Manager is **architecturally cleared for construction**. Awaiting Emperor's go-signal to begin **Step 1** (types + Zod validators) as the next Micro-Prompt.

— *Principal SDUI Architect*
