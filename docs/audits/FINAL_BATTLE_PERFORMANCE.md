# FINAL BATTLE PERFORMANCE AUDIT — Home → Cart

**Date:** 2026-05-12  
**Mode:** Read-only audit. No application code was modified.  
**Scope:** State hydration, home query orchestration, Hakim workers, Zustand selector churn, catalog payload size.

---

## Executive verdict

### The CPU Killer

**Primary killer: Network + payload hydration, not a JavaScript infinite loop.**

Browser performance profiling on the real home route (`/`) showed:

- JS heap used: ~18 MB
- DOM nodes: ~385
- Script duration: ~283 ms cumulative
- Task duration: ~1.34 s cumulative
- CPU profile over ~10 s: no hot function above single-digit milliseconds; no render-loop signature

The network trace, however, showed two large catalog fetches on the home path:

1. `salsabil_assets ... limit=96` — **~1.93 s**
2. `salsabil_assets ... limit=2000` — **~2.16 s**

Both fetch the same heavy `SOVEREIGN_SELECT` shape, including `media`. The response body confirms `media` contains inline `data:image/png;base64,...` blobs. Direct database measurement found only **9 active physical assets**, but their `media` column alone weighs **~5.2 MB**. Since the home path fetches this payload twice, cold load can hydrate/parse roughly **10 MB of base64 media JSON** before the UI becomes useful.

This is the smoking gun for the perceived skeleton/blank hang.

### The State Bloat

**Cart localStorage is architecturally bloated and dangerous, but the live freeze is currently dominated by catalog payload.**

`src/store/useCartStore.ts` uses Zustand `persist` with key `reef-cart-v2` and partializes:

```ts
partialize: (s) => ({ items: s.items, productIndex: s.productIndex })
```

Each `CartLine` still persists the deprecated bridge field:

```ts
product: Product
```

That `Product` can include `image` and `metadata`, and product images are currently coming from huge inline base64 `media` values. So every cart item can copy a large base64 image into synchronous `localStorage`. Rehydration then synchronously parses the whole `reef-cart-v2` JSON payload and runs:

- `migrateLegacyCartShape(state.items)`
- `buildIndex(state.items)`

This is not the primary issue with an empty/small cart, but with a cart containing several base64-image products it becomes a main-thread boot lock.

---

## Mandatory checklist findings

## 1. State Hydration Audit

### `src/store/useCartStore.ts`

Findings:

- Uses Zustand `persist` + `createJSONStorage`.
- Storage key: `reef-cart-v2`.
- Storage reads are synchronous via `localStorage.getItem(key)` during store hydration.
- Persisted payload includes `items` and `productIndex`.
- `items` contains full `CartLine` objects.
- `CartLine` still includes full deprecated `product: Product`.
- The store captures thin fields (`productId`, `capturedPrice`, `capturedName`, `capturedImage`) but does **not** prune the full `product` bridge from persisted storage.

Payload risk:

- Current active `salsabil_assets.media` payload: **~5.2 MB across 9 active physical assets**.
- If those base64 images are copied into cart products, `reef-cart-v2` can become multi-megabyte localStorage.
- Large localStorage JSON parsing is synchronous and can block hydration on mobile.

Verdict:

- **State bloat exists as a latent hydration lock.**
- It becomes severe when the cart has products with inline base64 images.
- It is not proven as the only live killer, but it must be pruned.

### `src/routes/_app.tsx`

Findings:

- No heavy mount effect.
- Only wraps `AppShell` in `LocationOpsProvider`.

Verdict:

- `_app.tsx` is not the CPU killer.

### `src/components/AppShell.tsx`

Findings:

- Subscribes to cart lines at top level via `useCartLines()`.
- Computes a memoized signature:

```ts
cartLines.map((l) => `${l.product.id}x${l.qty}`).join("|")
```

- When signature changes, maps again to build Hakim cart items.
- Runs `useHakimEdgeWorker({ getCart })` globally.

Verdict:

- O(n) over cart lines, now memoized and not a boot-time killer for a small cart.
- Still unnecessary top-level cart coupling: every cart change touches the whole app shell.
- With a bloated cart, this amplifies the persisted-state problem.

### Root-level effects

`src/routes/__root.tsx` contains:

- Inline theme bootstrap reading `reef-mode`, `reef-color`, `reef-locale` from localStorage.
- Service worker unregister effect.
- Referral code parse/persist effect.

Verdict:

- These are not the skeleton hang source.

---

## 2. Query Orchestration Scan

### `src/routes/_app/index.tsx`

Current loader:

```ts
loader: ({ context }) => {
  void context.queryClient.ensureQueryData(homeProductsQueryOptions(48));
}
```

Findings:

- There is only one `ensureQueryData` call.
- No sequential chain exists inside this route loader.
- It is fired-and-forgotten, so it does not block route transition.

Verdict:

- Route loader orchestration is **not** the CPU killer.
- But it prefetches `homeProductsQueryOptions(48)` while the rendered home page uses a different catalog path, creating duplication.

### Query key stability

`homeProductsQueryOptions` uses:

```ts
queryKey: ["catalog", "home-products", source ?? "all", limit] as const
```

`useHomeOrchestrator` uses:

```ts
queryKey: ["catalog", "section", slug, 48, "vm"]
```

Verdict:

- Query keys are stable primitive arrays.
- There is no query-key instability causing infinite refetch.
- The issue is duplicated, heavy query families—not unstable keys.

### Home data fan-out

Home renders:

- `SduiHomeFeed` → `useMobileHomeLayout()` → server/public layout fetch + capability fetch
- `LayoutFactory` → `useUiLayout("reef_home")`
- `useHomeOrchestrator()` → `catalogGateway.listSection({ slug: "home-goods", limit: 48 })`
- Route loader prefetch → `homeProductsQueryOptions(48)`
- Observed full catalog fetch → `useProductsQuery()` / `productsQueryOptions()` path

Observed network duplication:

- Two `salsabil_assets` reads fired on home:
  - `limit=96`
  - `limit=2000`
- Multiple `app_settings` keys were fetched twice (`greeting_subline`, `neighborhood_pulse`).

Verdict:

- Home is over-orchestrated: route prefetch + orchestrator + SDUI blocks + legacy rails can fetch overlapping catalog/settings data.
- This is network/payload contention, not sequential `ensureQueryData` blocking.

---

## 3. Hakim Worker Check

### `src/apps/reef-al-madina/features/admin/hakim/hooks/useHakimExecutor.ts`

Findings:

- No interval.
- No automatic background writes.
- Executes only inside a mutation.
- Mints suggested assets sequentially in a `for ... of` loop when explicitly triggered.

Verdict:

- `useHakimExecutor` is not involved in home/cart skeleton hang.

### `src/core-os/hakim-ai/hooks/useHakimEdgeWorker.ts`

Findings:

- Mounted globally by `AppShell`.
- Interval: `30_000 ms`.
- Warmup timeout: `5_000 ms`.
- DB writes only when anomaly conditions fire:
  - cart abandoned after 15 minutes
  - sales spike
  - runtime error / promise rejection
  - console error in production only
- Console monkey-patch is skipped in dev:

```ts
if (!import.meta.env.DEV) patchGlobals();
```

Verdict:

- Hakim Edge Worker is not firing too frequently.
- It is not the boot-time skeleton hang source.
- It should still be kept off the critical home path if the goal is a minimal first paint.

### `src/features/hakim/hooks/useHakimPulse.ts`

Findings:

- Admin-only pulse hook.
- Polls every `60_000 ms`.
- Initial anomaly/pulse load is parallelized with `Promise.all`.

Verdict:

- Not relevant to customer home/cart path.

---

## 4. Zustand Selector Churn

### Store selectors

`src/store/useCartStore.ts` exports mostly granular selector hooks:

- `useCartActions()` with shallow action selection
- `useCartLineQty(productId)` O(1)
- `useCartTotalItems()`
- `useCartLinesArray()` with memoized `Object.values(s.items)` cache

No broad top-level `useCartStore()` subscription was found in app components.

### Churn amplifiers

Top-level/customer shell consumers:

- `AppShell` subscribes to `useCartLines()` globally.
- `TopBar` subscribes to `useCartTotal()` globally.
- `TabBar` subscribes to `useCartCount()` globally.
- `CartPanel` calls aggregate `useCart()` even though the rendered `<aside>` is hidden on mobile by CSS.

The hidden mobile `CartPanel` is important: the component still renders and subscribes before CSS hides it, so cart totals and line arrays are computed on mobile home screens.

Verdict:

- No entire-store subscription smoking gun.
- There is avoidable shell-level cart churn.
- This becomes expensive only when cart lines carry bloated product payloads or when cart math becomes complex.

---

## 5. Asset Metadata Payload

### Current select shape

`src/hooks/useProductsQuery.ts` uses:

```sql
id, name, description, category_path, traits, media,
salsabil_skus (
  id, sku_code, attributes, sort_order, is_active,
  salsabil_financial_contracts ( base_price, currency ),
  salsabil_inventory_matrix ( availability_data )
)
```

`src/lib/sovereignCatalog.ts` uses a similar `SOVEREIGN_SELECT`, adding `is_active`, SKU `barcode`, and `contract_rules` in some paths.

### Payload measurements

Database measurement:

- Active physical assets: **9**
- `media` column total: **~5235 kB**
- `traits` column total: **~511 bytes**
- `description` column total: **~903 bytes**
- Active `usa_products` full-row payload: **207 rows / ~290 kB**

Browser network response evidence:

- `salsabil_assets` response includes inline `data:image/png;base64,...` media.
- One `media` value in the response is extremely large and includes image/profile metadata.

Verdict:

- `metadata` / `raw_output` are not the problem on this path.
- The real payload bloat is `salsabil_assets.media` containing inline base64 images.
- The legacy/sovereign product mapping copies those media values into `Product.image`, which then risks being persisted into cart localStorage.

---

## Preview route caveat

The user preview route was `/index`. In this TanStack route tree, `/index` is not the home route and renders the app 404 page. The real home route is `/` through `/_app/`.

This matters because a recording on `/index` may show a non-home failure mode. The home performance audit above was performed against `/`.

---

## Execution Plan — exact pruning steps

### Phase 1 — Cut the payload artery

1. **Stop storing inline base64 images in `salsabil_assets.media`.**
   - Move images to file storage/CDN URLs.
   - Store only `{ url, alt, width, height }` in `media`.

2. **Create a lightweight home/catalog select.**
   - For cards, fetch only:
     - id
     - name
     - category_path
     - minimal image URL
     - price
     - compare-at price
     - sale unit
     - stock summary if needed
   - Do not fetch full `media`, full SKU `attributes`, full `availability_data`, or financial `contract_rules` for the home grid.

3. **Deduplicate home catalog paths.**
   - Pick one home catalog source:
     - either `homeProductsQueryOptions(48)`
     - or `catalogGateway.listSection({ slug: "home-goods", limit: 48 })`
   - Remove the unused route prefetch or make the component consume exactly the prefetched query.

4. **Remove the full `limit=2000` catalog fetch from first paint.**
   - Defer Buy Again / legacy rails until after first paint and only when the user is authenticated.
   - Never run `useProductsQuery()` unconditionally on anonymous home boot.

### Phase 2 — Defuse cart hydration bloat

5. **Change persisted cart shape to identity-only.**
   - Persist only:
     - line key
     - productId
     - variantId
     - qty
     - capturedPrice
     - capturedName
     - capturedImage URL only
     - capturedAt
     - small meta fields
   - Do not persist full `product`.

6. **Add a cart persist migration that drops `line.product.media`, base64 `line.product.image`, and large metadata.**
   - If `capturedImage` starts with `data:image/`, replace with fallback or hosted URL.
   - Keep the deprecated runtime bridge in memory only until consumers migrate.

7. **Add a payload guard before localStorage writes.**
   - If serialized cart exceeds a hard budget, prune optional fields before write.
   - Suggested budget: under 100 KB for cart storage.

### Phase 3 — Reduce shell churn

8. **Do not mount desktop `CartPanel` on mobile.**
   - Gate by viewport/media query or route/layout condition before calling `useCart()`.
   - CSS `hidden` is not enough because hooks still run.

9. **Move Hakim cart observation below first paint or behind an idle callback.**
   - Keep the 30s interval, but mount after the home content is interactive.

10. **Keep shell selectors primitive.**
   - `TopBar`: subscribe to precomputed total or count, not full pricing selectors.
   - `AppShell`: avoid `useCartLines()` unless the worker is enabled and needed.

### Phase 4 — Remove duplicate settings reads

11. **Batch home app settings.**
   - `greeting_subline` and `neighborhood_pulse` were observed twice.
   - Load them through one query or a shared keyed hook.

12. **Prime SDUI layout once.**
   - Avoid separate layout document reads for `SduiHomeFeed` and `LayoutFactory` if both are required on the same viewport.

---

## Final smoking gun

The system is not currently stuck because of a Cashier shadow loop, Hakim interval, or unstable React Query key.

The dominant failure is **payload obesity**:

> Home fetches catalog rows whose `media` field contains multi-megabyte inline base64 images, and it does so through more than one catalog path. That heavy JSON is then mapped into product objects and can be persisted into cart localStorage, turning network bloat into state-hydration bloat.

Fixing indexes or debouncing effects cannot solve this. The fat must be pruned at the data contract boundary.
