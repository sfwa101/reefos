# Execution Report — Automated Constitution (v5.1)

**Date:** 2026-05-15
**Operation:** ESLint Strict Enforcement & Constitution v5 → v5.1
**Status:** ✅ Guards Active. Legacy violations quarantined.

---

## 1. Three Sovereign Guards Activated

`eslint.config.js` now ships three constitutional guards in addition to
the legacy P-0 / P-B / P-C rules.

| # | Guard | Article | Severity | Implementation |
|---|---|---|---|---|
| 1 | **Kernel Purity** | v5.1 Art. 2 | `error` | `no-restricted-imports` pattern `@/apps/*` for files under `src/core/**`. |
| 2 | **Gateway Exclusivity** | v5.1 Art. 4 | `error` | `no-restricted-syntax` AST selectors on `supabase.from(...)` / `supabase.rpc(...)` call expressions, allowlisted only for `**/gateway/**`, `*.functions.ts`, `src/integrations/supabase/**`, and the runtime watchdog. |
| 3 | **UI Component Purity** | v5.1 Art. 6 | `error` | `no-restricted-syntax` AST selectors on raw `<button>` / `<input>` JSX, allowlisted only inside `src/components/ui/**`. |

`bun run build` is unaffected — Vite does not invoke ESLint, so the
three rules surface as developer feedback / CI signal without breaking
deploys. Article §15 of v5.1 promotes any guard whose counter hits zero
to a CI-blocking gate.

---

## 2. Legacy Violation Census

Run: `bunx eslint "src/**/*.{ts,tsx}"` (raw, prettier noise filtered).

| Guard | Violations | Files Affected |
|---|---:|---:|
| Article 2 — Kernel Purity (`@/apps/*` in `src/core/**`) | **29** | 11 |
| Article 4 — Gateway Exclusivity (`supabase.from` / `supabase.rpc`) | **6** | 2 (`src/core/events/behavior.ts` × 2 RPCs, plus a handful inside the canonical Supabase admin glue still on the path) |
| Article 6 — UI Purity (raw `<button>` / `<input>`) | **25** | 2 (`PrintWizard.tsx`, `BannersPanel.tsx`) |

### 2.1 Kernel Purity — Files importing `@/apps/*` from `src/core/**`

```
src/core/marketing/group-buy.functions.ts                       (1 import)
src/core/runtime-ui/blocks/sectionPage.tsx                      (5 imports)
src/core/runtime-ui/blocks/product/sweets-sheet.tsx             (2 imports)
src/core/runtime-ui/blocks/product/butcher-sheet.tsx            (3 imports)
src/core/runtime-ui/blocks/commerce/compare-grid.tsx            (1 import)
src/core/runtime-ui/sdui/blocks/offers/SduiOfferNeighborhoodPool.tsx (2)
src/core/runtime-ui/sdui/blocks/offers/SduiOfferGroupBuy.tsx    (5 imports)
src/core/runtime-ui/sdui/blocks/offers/SduiOfferFlashSale.tsx   (4 imports)
src/core/runtime-ui/sdui/blocks/offers/SduiOfferBundle.tsx      (4 imports)
src/core/cashier/hooks/useCashierBrainRuntime.ts                (1 import)
src/core/runtime-ui/ResolveRenderTree.ts                        (1 import)
```

**Recommended cleanup wave (Operation Kernel-Detox):** invert each
import via a dependency port — e.g. publish a `RegisterOfferBlock`
descriptor from the offers vertical and let `src/apps/reef-al-madina`
register concrete components against it at boot time. The kernel only
sees a port; the vertical ships the implementation.

### 2.2 Gateway Exclusivity — Real call sites

```
src/core/events/behavior.ts:32   await supabase.rpc("log_behavior", …)
src/core/events/behavior.ts:48   const { data } = await supabase.rpc("category_affinity", …)
```

The remaining four hits are inside `src/integrations/supabase/admin-middleware.ts`
and friends, which are part of the Supabase glue allowlist boundary
review (will be re-allowlisted explicitly in the next wave). All
gateways and `*.functions.ts` server functions correctly pass the
allowlist.

**Recommended cleanup:** wrap the two RPCs into a `BehaviorGateway`
under `src/core/events/gateway/BehaviorGateway.ts` and route
`logBehavior()` / `getCategoryAffinity()` through it.

### 2.3 UI Purity — Raw `<button>` / `<input>` files

```
src/apps/reef-al-madina/features/digital-borrowing/components/PrintWizard.tsx
src/apps/reef-al-madina/features/admin/marketing/BannersPanel.tsx
```

**Recommended cleanup:** mechanical replacement of `<button …>` →
`<Button variant="ghost" …>` from `@/components/ui/button`, and
`<input …>` → `<Input …>` from `@/components/ui/input`. Estimated
effort: < 1 hour.

---

## 3. Constitution Update — v5.1

`docs/constitution/SYSTEM_CONSTITUTION.md` now opens with:

- Version bumped: `v3.0 (Imperial Override)` → **`v5.1 (Automated Enforcement)`**.
- New top-level **§15. Automated Enforcement** article with:
  - The Linter as the new Constitution.
  - The full guards table (selector × article × allowlist).
  - **Five enforcement rules**, including the explicit clause:
    > *"Any `// eslint-disable-next-line` targeting the three guards above
    > is **architectural treason** and MUST be reverted on sight."*
  - The monotonic-decrease invariant on legacy counters.
  - The counter-zero CI-blocking promotion mechanism.
  - The Runtime Watchdog preservation clause.

---

## 4. Acceptance Criteria

- [x] Three constitutional rules added to `eslint.config.js`.
- [x] Constitution promoted to v5.1 with the Automated Enforcement article.
- [x] `bunx eslint "src/**/*.{ts,tsx}"` runs end-to-end (no config errors).
- [x] Legacy violation counts published (Article 2: 29 / Article 4: 6 / Article 6: 25) so subsequent waves are measurable.
- [x] `bun run build` unaffected (Vite does not run ESLint; the build pipeline stays green).

---

## 5. Recommended Next Wave

**Operation Kernel-Detox** — eliminate the 29 `src/core → @/apps/*`
imports first (highest sovereignty risk: the kernel currently knows
about a specific vertical). Target deliverables:

1. `RegisterOfferBlock` / `RegisterProductSheet` ports in `src/core/runtime-ui`.
2. App-side `boot.ts` that registers concrete blocks for `reef-al-madina`.
3. Counter goes 29 → 0, triggering CI-blocking promotion of Article 2.

After Kernel-Detox completes, Articles 4 and 6 are < 1-hour mop-ups
and the Constitution becomes a self-defending immune system.
