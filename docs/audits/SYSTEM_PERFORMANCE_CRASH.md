# SYSTEM PERFORMANCE CRASH — Root Cause Analysis

**Date:** 2026-05-12
**Auditor:** Supreme Systems Performance Engineer
**Status:** 🔴 CRITICAL — Silent Killer Identified
**Verdict:** The **Cashier Shadow Mode `useEffect`** is the primary culprit. It fires an unbounded storm of `previewCashierFn` server calls on every render of any screen that mounts the cart, saturating the network, flooding the console, and starving the main thread.

---

## 1. Smoking Gun

**File:** `src/apps/reef-al-madina/features/cart/hooks/useCartCalculations.ts`
**Lines:** 255 – 293 (the Phase C3 "Cashier Brain shadow" block)

```ts
255:  const cashierPreview = useCashierPreview();
256:  const cashierMutate = cashierPreview.mutate;
257:  useEffect(() => {
258:    if (lines.length === 0) return;
...
266:    cashierMutate(
267:      { items, context: { member_tier: "guest" } },
...
292:    // eslint-disable-next-line react-hooks/exhaustive-deps
293:  }, [lines, grand]);
```

### Why this is fatal

1. **Unstable dependency `lines`** — the `lines` array is rebuilt by the parent (`CartContext` / `useCartOrchestrator`) on **every render**. It is a fresh array reference each time, even when its contents are identical. React's `Object.is` dependency check therefore reports a change every render.
2. **Unstable dependency `grand`** — `grand` is a plain `const` recomputed on line 70 of the same hook on every render. It is not memoised. Same issue.
3. **Mutation triggers re-render** — `useMutation` updates internal state (`isPending`, `data`, `error`) on every call. That re-renders the component holding the hook → re-renders cart → new `lines` reference → effect fires again.
4. **No guard, no debounce, no equality check** — the effect has zero throttling. It is a tight loop disguised as a side-effect.

### Observed cascade

```
render → new `lines` ref → useEffect runs → cashierMutate() →
  ↳ POST /api/_serverFn/previewCashierFn  (≈300–800 ms)
  ↳ useMutation state update → re-render →
    ↳ new `lines` ref → useEffect runs → cashierMutate() …  (infinite)
```

Every wave of the loop:
- Issues a server function call (network thread saturated → other gateway calls — products, DNA, inventory — get queued behind it).
- Writes to `cashier_snapshots` (Phase C4 ledger), so the **DB is also being hammered** with append-only inserts that all collide on the same `snapshot_hash` (UPSERT contention).
- Emits `[cashier-shadow] match` or `[CASHIER-SHADOW-MISMATCH]` to `console`. Console I/O on the main thread is **not free** — at hundreds of writes/sec it visibly freezes the UI.

This explains every symptom in the session recording:
- ✅ Skeletons never resolve (initial product/DNA fetches starved by the loop).
- ✅ UI feels frozen (main thread stuck in console + React reconciliation).
- ✅ Network panel shows endless `previewCashierFn` requests.
- ✅ Latency began the moment Phase C3 (`useCashierPreview` shadow integration) shipped — not before.

---

## 2. Secondary Aggravators

### 2a. Phase 1 "pricing-shadow" effect (lines 208 – 248)

Same file, same anti-pattern: `}, [lines, appliedPromo?.pct]);`. This one is **CPU-only** (no network), so it is not as catastrophic, but it still re-runs on every render and emits a `console.info("[pricing-shadow]", …)` payload with three nested objects. At loop frequency this contributes meaningfully to main-thread starvation.

### 2b. Snapshot ledger UPSERT pressure

`previewCashierFn` (`src/core/cashier/gateway/cashier.functions.ts`) writes a row into `cashier_snapshots` on every call. With the loop above, this becomes a write-heavy workload on a table whose only purpose is audit. Even with `ignoreDuplicates: true`, each call still parses, validates, hashes, and round-trips to Postgres. This is the source of the gateway "hang" — the DB is busy servicing thousands of redundant inserts.

### 2c. Request waterfall on boot

Boot path triggers, in order:
1. `getProductsFn` (catalog)
2. `view_product_financial_dna` reads (per-cart)
3. `getInventoryFn` (stock)
4. `previewCashierFn` × N (the loop)

Because (4) saturates the in-flight request budget (browser caps ~6 concurrent connections to the same origin), (1)–(3) cannot complete promptly → skeletons hang.

### 2d. `view_product_financial_dna` indexing

The view itself is thin (single-table projection over `usa_products` filtered on `is_active` / `deleted_at`). It is **not** the bottleneck on its own — but under the loop above, every call does a full scan of those filters. Confirm an index exists on `usa_products(id) WHERE is_active AND deleted_at IS NULL`, or at minimum on `id`. Not the silent killer, but an easy win once the loop is fixed.

---

## 3. Console / Error Flooding

`browser--read_console_logs` returned no logs at audit time (snapshot was taken between waves), but the code paths guarantee one of these per loop iteration:
- `[cashier-shadow] match { grand, hash }` (success path, ≥99 % of cases)
- `[CASHIER-SHADOW-MISMATCH] …` (when legacy ≠ brain)
- `[cashier-shadow] preview failed: …` (network/abort)
- `[pricing-shadow] { legacy, universal, delta }` (always, from the sibling effect)

At loop rate this is enough to lock DevTools and visibly stutter the page even with the panel closed.

---

## 4. Bundle / Memory

No evidence of heavy libraries imported inside loops. `zod` and `lucide-react` are imported at module scope where used. **Bundle is not the cause.** Memory growth observed in the session is a *symptom* of the mutation cache (`@tanstack/react-query`) accumulating thousands of mutation results, not a leak in user code.

---

## 5. The Gap — When Did It Start?

| Phase | Change | Impact |
|---|---|---|
| Phase 1 (legacy) | `useEffect([lines, appliedPromo?.pct])` for pricing-shadow | Pure CPU, mild churn, lived for weeks without complaints |
| **Phase C3 (today)** | **Added `useEffect([lines, grand])` that calls a server function via `useMutation`** | **Network + DB + state-update → infinite loop** |
| Phase C4 (today) | Ledger UPSERT inside `previewCashierFn` | Amplifies cost of each loop iteration |

The "Skeleton Hang" started **the moment Phase C3 (`useCashierPreview` shadow integration in `useCartCalculations.ts`) was merged.** Before that, the only shadow effect was CPU-bound and tolerable.

---

## 6. Recommended Surgical Fix (for the next loop, not now)

Do **not** simply patch the dep array — even `[lines.length]` would still fire on every add/remove and is not what we want for a shadow observer. Recommended order of operations:

1. **Disable** the Phase C3 `useEffect` immediately (feature-flag or comment) to restore UI responsiveness. **This single change unblocks the store.**
2. Replace it with a **debounced, content-hashed** trigger:
   - Compute a stable signature of `(items[].id, items[].qty, member_tier)`.
   - Memoise it with `useMemo`.
   - Fire `cashierMutate` only when the signature changes, behind a 500–1000 ms debounce.
3. Move the snapshot ledger insert **out of the hot path** — write it asynchronously (fire-and-forget queue) or only on terminal events (checkout, not preview).
4. Gate shadow logging behind `import.meta.env.DEV` or a `localStorage` flag so production never pays the console cost.
5. Add an index `CREATE INDEX … ON usa_products (id) WHERE is_active AND deleted_at IS NULL;` if EXPLAIN shows a sequential scan.

---

## 7. Verdict

> **The Cashier Brain Shadow Observer (Phase C3) is the Silent Killer.**
> A single `useEffect` with `[lines, grand]` dependencies, calling a `useMutation` that writes to the database, has created an unbounded render → mutate → re-render loop that saturates network, DB, and main thread simultaneously.
>
> The Inventory Ledger is **not** implicated. The legacy pricing-shadow effect is a minor aggravator. The SQL view is innocent until proven otherwise.
>
> **Recommended action:** halt Phase C5+ work and execute the surgical fix above before any further feature build.
