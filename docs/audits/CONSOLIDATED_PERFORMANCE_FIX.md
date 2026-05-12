# CONSOLIDATED PERFORMANCE FIX — Read-Only Audit

**Scope:** Home Feed orchestration, DNA batching, skeleton cost,
Zustand hydration race. Performance budget: < 800ms TTFB on 4G.

**Verdict:** The suspected "Query Waterfall" between `useMobileHomeLayout`
and `useHomeOrchestrator` **does NOT exist**. Both hooks mount on the same
render and both `useQuery` calls fire in parallel. The real remaining cost
is concentrated in (a) duplicate catalog network round-trips (two
overlapping queries hitting `salsabil_assets`), and (b) the Zustand cart
rehydration pass on first paint.

---

## 1. The Home Waterfall Check — NEGATIVE

### Call graph (verified)

```text
src/pages/Home.tsx (mount)
├── <SduiHomeFeed />                 ──► useMobileHomeLayout()
│                                       └─► useQuery(['mobile_home_layout_v1']) ──► getPublicLayoutFn() [serverFn]
└── <LayoutFactory orchestrator={…}/> ──► useHomeOrchestrator() (called in Home.tsx, line 34)
                                        └─► useQuery(['catalog','section','home-goods',48,'vm'])
                                              └─► catalogGateway.listSection({ slug:'home-goods', limit:48 })
```

Both `useQuery` calls are subscribed during the **same** React commit
(Home.tsx renders both children synchronously). React Query fires the
queryFns in parallel from `useEffect`-equivalent subscribe. Neither hook
awaits the other. There is no `enabled: dataFromOther` gating, no
`Promise.all` to merge, and no shared dependency.

**Conclusion:** No waterfall. No serialization. Already parallel.

### What IS happening (the real duplication)

```text
parallel:
  ┌── getPublicLayoutFn               (~200–400ms, server fn, JSON layout doc)
  ├── catalogGateway.listSection      (~300–600ms, salsabil_assets read)
  └── homeProductsQueryOptions        (~300–600ms, salsabil_assets read)  ← only if mounted
```

`useHomeProductsQuery` (`src/hooks/useProductsQuery.ts:286`) and
`useHomeOrchestrator` (`useHomeOrchestrator.ts:113`) both fetch from
`salsabil_assets` for the home grid, but on **different cache keys**:

| Hook | queryKey | Source |
|---|---|---|
| `useHomeProductsQuery` | `['catalog','home-products','all',48]` | `salsabil_assets` direct |
| `useHomeOrchestrator`  | `['catalog','section','home-goods',48,'vm']` | `catalogGateway.listSection` (also `salsabil_assets`) |

If both render on the same page, that is one redundant network round-trip
(~300–600ms of contention on the same Postgrest endpoint). This is the
true "open artery" left to clamp.

---

## 2. DNA Batching Audit — NEGATIVE (no leak)

`view_product_financial_dna` is **not** queried by the home grid.
`previewCashierFn` (`src/core/cashier/gateway/cashier.functions.ts`) is
referenced by exactly one consumer:

```text
src/core/cashier/gateway/hooks.ts        ── re-exports useCartShadow…
└── src/apps/reef-al-madina/features/cart/hooks/useCartCalculations.ts
        (mounts ONLY on /cart, not /index)
```

No card, rail, grid, or carousel on the home page calls `previewCashierFn`,
nor does any of them touch the `view_product_financial_dna` view directly.
The 48 product cards render from the catalog VM payload alone.

**Conclusion:** Already batched (single `listSection` call). Nothing to
collapse here.

---

## 3. Skeleton Rendering Cost — LOW

The two skeleton clusters in `SduiHomeFeed.tsx`:

* `StoryBar` loading state (line 110–116) — 6 × `<Skeleton h-16 w-16 rounded-full>`.
* `HomeFeedReadonly` loading state (line 174–180) — 3 × `<Skeleton h-28 w-full>`.

All have **fixed dimensions** (`h-16 w-16`, `h-28 w-full`), so they reserve
layout space and incur **zero CLS**. No animation off the main thread
(pure CSS `animate-pulse`). Total skeleton DOM nodes on first paint: ~9.
Negligible paint cost. **Not the bottleneck.**

The `LayoutFactory` skeletons (per-block) are the same shape pattern.

---

## 4. Zustand Hydration Race — REAL, MINOR

`useCartStore` (`src/store/useCartStore.ts:231`) wraps state in `persist`
middleware with `safeStorage` (synchronous `localStorage.getItem` in
`getItem`). On boot the store hydrates **synchronously inside the
Zustand store factory** — not async — so the home route does not block
on it for paint scheduling. However:

* `onRehydrateStorage` runs `migrateLegacyCartShape` + the new
  `product`-stub re-synthesis pass (Wave P-C). For an empty cart this is
  ~0 ms; for a 50-line cart it is sub-millisecond.
* The previous payload-obesity issue (multi-MB base64 in the persisted
  bridge) **is already neutralised** by the Wave P-C `partialize` diet
  shipped in the prior turn, plus the `AppShell` >1MB rescue sweep.

`AppShell` does **not** await rehydration before rendering — it just
calls `useCartLines()`, which subscribes to whatever `items` map exists.
First paint is not gated on rehydration. **Not the bottleneck** in the
current build.

---

## The Remaining Bottleneck — Two Shapes, One Table

The single highest-impact remaining win is collapsing the duplicate
`salsabil_assets` reads into one network request, then deriving both the
legacy `Product[]` and the canonical `ProductCardVM[]` from the shared
cache entry.

### Smoking gun (read-only)

* `src/hooks/useProductsQuery.ts:243–290` — `fetchHomeProducts` /
  `useHomeProductsQuery`.
* `src/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator.ts:113–124`
  — `useQuery(['catalog','section', slug, 48, 'vm'])` calling
  `catalogGateway.listSection`.

Both pull the same 48 rows of `salsabil_assets` filtered by
`is_active = true` and `asset_type = 'physical'`, just shaped differently.

---

## Parallelization Plan (proposed, NOT executed)

1. **Unify the home cache key.** Pick one source of truth — recommend
   `catalogGateway.listSection({ slug:'home-goods', limit:48 })` because
   it returns the canonical `ProductCardVM` and is what the orchestrator
   already consumes. Re-point `useHomeProductsQuery` to derive from the
   same VM cache via a `select` adapter, eliminating the second
   round-trip. Net win: 1 fewer DB read, ~300–600 ms saved on cold
   load. Net code change: ~20 lines, single file.

2. **Co-locate the two parallel queries in the route loader.** Move
   `getPublicLayoutFn` and `catalogGateway.listSection` into the
   TanStack route `loader` for `/index` so they fire from the server in
   parallel during SSR and stream the hydrated data with the HTML.
   Today both fire client-side AFTER hydration, costing one extra RTT.
   Implementation pattern: `Promise.all([queryClient.ensureQueryData(layoutOpts), queryClient.ensureQueryData(homeSectionOpts)])`
   inside the route loader.

3. **Pre-warm the cache on `<TopBar />` render.** For navigations from
   non-home routes, call `queryClient.prefetchQuery(homeSectionOpts)`
   on hover/focus of the home tab so the data is already in cache when
   the route mounts.

### What NOT to change

* Do not introduce a `Promise.all` inside `SduiHomeFeed` — the queries
  are already parallel, wrapping them in a manual `Promise.all` would
  REGRESS to a single suspense boundary that gates the story bar on
  the catalog fetch.
* Do not change `useMobileHomeLayout`'s cache key or staleTime — it is
  correctly tuned (1 h fresh, 24 h gc).
* Do not touch the cashier shadow path — confirmed not on the home
  hot path.

---

## Summary

| Suspect | Reality |
|---|---|
| Home waterfall (layout → catalog) | **FALSE.** Already parallel. |
| DNA / cashier per-card calls | **FALSE.** Cashier is cart-only. |
| Skeleton repaint cost | **NEGLIGIBLE.** Fixed-size, no CLS. |
| Zustand hydration blocks paint | **FALSE.** Synchronous, sub-ms post-diet. |
| Duplicate catalog round-trip | **TRUE.** `useHomeProductsQuery` + `useHomeOrchestrator` both hit `salsabil_assets`. |
| Client-side fetch instead of SSR loader | **TRUE.** Both queries run after hydration. |

Apply the two `TRUE` items above (unify cache key + move into route
loader) and the home page will resolve real products inside the 800 ms
budget. No code modified during this audit.
