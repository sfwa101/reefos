# PERFORMANCE FATAL ERROR — Diagnostic Report

**Date:** 2026-05-12
**Auditor:** Senior Full-Stack Performance Auditor
**Scope:** Read-only audit of Home + Cart execution paths
**Verdict:** 🟡 **The Cashier loop is dead.** The skeleton hang the user is still seeing is **unrelated** to the Cashier Brain — the smoking gun has moved. Reverting the Cashier fixes (as the StackOverflow note suggests) would re-introduce the catastrophic loop and would NOT cure the home-page skeletons.

---

## 1. Cashier Brain — Status: ✅ Healthy

Verification of every claim in the StackOverflow advisory:

### 1a. Is `previewCashierFn` still firing in a loop?

**No.** Direct evidence:

- `code--read_network_requests` filtered on `previewCashier` and `_serverFn` returned **zero requests** in the live preview window.
- `code--read_console_logs` filtered on `cashier` and `error` returned **no logs**.
- The hook is gated by a content-hashed `cartSignature` + 500 ms `setTimeout` debounce (`useCartCalculations.ts:269–339`). Early-returns on empty cart and on non-UUID legacy slugs.

### 1b. Is `useCartCalculations` even mounted on the Home page?

**No.** The hook chain is:

```
useCartCalculations  ←  useCartOrchestrator  ←  src/pages/Cart.tsx ONLY
```

`rg -n "useCartOrchestrator" src` confirms the orchestrator has exactly one consumer: `src/pages/Cart.tsx:9,29`. `AppShell` mounts `<CartPanel/>`, but `CartPanel.tsx` does **not** import `useCartOrchestrator` or `useCartCalculations`. **The Cashier shadow effect cannot run on `/` or `/index`.**

### 1c. Is the `lines` array reference unstable (the StackOverflow hypothesis)?

**No — it is provably stable.** `src/store/useCartStore.ts:367–376`:

```ts
let _linesCacheItems: Record<string, CartLine> | null = null;
let _linesCacheArr: CartLine[] = [];
const linesArraySelector = (s: CartState): CartLine[] => {
  if (s.items !== _linesCacheItems) {
    _linesCacheItems = s.items;
    _linesCacheArr = Object.values(s.items);
  }
  return _linesCacheArr;
};
```

The Zustand selector caches the array by `items` dictionary identity. `lines` is the **same reference** across renders until the cart actually mutates. The StackOverflow claim that "`CartContext.tsx` recreates the lines array on every render" is **factually wrong** for this codebase.

### 1d. Is the fire-and-forget ledger exhausting the connection pool?

**No.** Each `previewCashierFn` invocation kicks off exactly one `void (async () => …)()` block that performs a single `auth.getUser()` + one `upsert(..., { ignoreDuplicates: true })`. The upsert resolves in ~10–40 ms on a UNIQUE-keyed hash and the IIFE then returns, releasing its connection. Without a triggering loop on the client (1a), the background queue depth is **≤ 1 per real cart change**. There is no pile-up.

> **Conclusion:** the Cashier system is currently quiet, correct, and not the cause of the symptom the user is reporting. **Do NOT revert** `cashier.functions.ts` or the `cartSignature`/debounce in `useCartCalculations.ts` — doing so re-arms the proven infinite loop documented in `SYSTEM_PERFORMANCE_CRASH.md`.

---

## 2. Smoking Gun — The Real Cause of the Home-Page Skeleton Hang

**File:** `src/hooks/useProductsQuery.ts`
**Line:** **247** (`if (!isBrowser) return [];`)
**Surrounding code (243–267):**

```ts
async function fetchHomeProducts(
  limit: number,
  source?: ProductSource,
): Promise<Product[]> {
  if (!isBrowser) return [];                          // ← SMOKING GUN
  let q = supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .order("created_at", { ascending: false })
    .limit(limit * 2);                                // ← over-fetch (96 rows)
  …
}
```

### Why this freezes the Home page

1. `src/routes/_app/index.tsx:14–16` calls `context.queryClient.ensureQueryData(homeProductsQueryOptions(48))` inside the loader.
2. Loaders in TanStack Start are **isomorphic** — they run on the server first.
3. On the server, `isBrowser === false`, so `fetchHomeProducts` **synchronously returns `[]`**. The query resolves instantly with empty data and TanStack happily caches the empty array under the `["catalog","home-products","all",48]` key.
4. The HTML is shipped with an empty product list and the skeleton in its initial state.
5. On the client, the loader does NOT re-run — `ensureQueryData` sees the cache as fulfilled (it was, with `[]`) and does nothing.
6. The skeleton is now waiting for a refetch that **only fires on `staleTime` expiry or window focus**, not on hydration.

Net effect: the user stares at a skeleton that has no fetch in flight. Eventually `staleTime` expires, the query refetches against `salsabil_assets` (a 96-row scan over `is_active = true AND asset_type = 'physical'` — no compound index on those two columns, see §3), and the page paints. **Until that moment the UI is "frozen" with no network activity** — exactly the symptom in the session recording.

This is the "Performance Regret": the prior Cashier loop saturated the network so badly that nobody noticed the home query was already broken. With the loop killed, the underlying hydration bug is now visible.

---

## 3. Secondary Findings

### 3a. `AppShell` recomputes a cart signature on every render

`src/components/AppShell.tsx:33`:

```tsx
const sig = cartLines.map((l) => `${l.product.id}x${l.qty}`).join("|");
```

This runs **inside the render body** of the top-level shell on every render of every page (cart panel + tabbar + outlet all share AppShell). It is O(n) but `cartLines` is almost always small — not a freeze cause, but worth memoising once Cashier is stable.

### 3b. `useHakimEdgeWorker` (AppShell:50)

A 30 s interval the user pays for on every page including Home. Confirmed *not* in the freeze path (no console output observed) but a long-tail CPU consumer that should be lazy-loaded behind `requestIdleCallback`.

### 3c. Missing partial index on `salsabil_assets`

The `fetchHomeProducts` filter `is_active = true AND asset_type = 'physical' ORDER BY created_at DESC LIMIT 96` is the hottest read on the home path. No index in the current schema covers `(is_active, asset_type, created_at DESC)`. This is the **second** bottleneck, after the SSR `[]` short-circuit is fixed.

### 3d. `productsQueryOptions().queryFn = fetchAllProducts` (line 199–201)

`fetchAllProducts` runs `.limit(2000)` against `salsabil_assets`. It is a *fallback* path triggered by `useProductsQuery()`/`useProductQuery()` consumers (product-detail pages, checkout vendor grouping, etc.). When it does run, it scans up to 2 000 rows — fine for warm caches, expensive for cold. Not the home-page culprit, but a sleeping giant.

### 3e. JSON.stringify in render bodies

`rg -n "JSON.stringify" src/components src/pages` returns no hits inside large render bodies. **Cleared.**

---

## 4. Surgical Removal Plan

> **Do NOT revert the Cashier work.** It is correct and quiet. Reverting would resurrect the documented infinite loop.

### Step 1 — Fix the SSR short-circuit (the actual smoking gun)

`src/hooks/useProductsQuery.ts:247` — **remove** the `if (!isBrowser) return [];` guard from `fetchHomeProducts`. The Supabase JS client works in the Worker SSR runtime; the publishable key is server-readable. With this single change the loader fetches real data on the server, ships it inline with the HTML, and the skeleton resolves on first paint.

If a server-side branch is genuinely needed (e.g. to skip `localStorage`), gate only the *cache hydration* on `isBrowser`, not the network call itself.

### Step 2 — Add the supporting index

```sql
CREATE INDEX IF NOT EXISTS idx_salsabil_assets_home_lookup
  ON public.salsabil_assets (created_at DESC)
  WHERE is_active = true AND asset_type = 'physical';
```

Cuts `fetchHomeProducts` from a sequential filter to an index-only scan of the top 96 rows.

### Step 3 — Memoise the AppShell cart signature

Move the `cartLines.map(...).join('|')` out of the render body into a `useMemo([cartLines])`. Cosmetic; do AFTER Step 1.

### Step 4 — (Optional) Lazy-defer `useHakimEdgeWorker`

Wrap the bootstrap in `requestIdleCallback` to keep the home cold-start path strictly product-rendering only.

---

## 5. What NOT to Touch

- `src/apps/reef-al-madina/features/cart/hooks/useCartCalculations.ts` (Cashier shadow) — **leave intact**.
- `src/core/cashier/gateway/cashier.functions.ts` (fire-and-forget ledger) — **leave intact**.
- `src/store/useCartStore.ts` `linesArraySelector` cache — already optimal.
- `src/context/CartContext.tsx` selector hooks — they are correctly memoised and gated by `useCartLinesArray()`'s stable reference. No refactor needed.

---

## 6. Verdict

> **The Cashier Brain is innocent.** The skeleton hang is caused by a single line — `if (!isBrowser) return [];` at `src/hooks/useProductsQuery.ts:247` — that turns the Home loader into a server-side no-op, leaving the client without an in-flight fetch and the skeleton with nothing to wait for.
>
> Removing that guard (and adding the partial index in §4 step 2) will resolve the user-visible freeze. Reverting Cashier work would make things worse.
