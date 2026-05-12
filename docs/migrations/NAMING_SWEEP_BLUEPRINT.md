# Naming Sweep Blueprint — Wave P-E (C5 Eradication)

**Status:** RECONNAISSANCE COMPLETE — execution gated on user approval.
**Authority:** Article 3a — *No vertical/domain noun may appear in folder, file, class, or symbol names. Names must be capability-driven.*
**Scope:** Pure rename + import-rewrite. No behavioural code changes.

---

## 1 · Inventory & Target Map

### 1.1 Vertical feature folders → Capability folders

| Current path                                                  | Capability target                                              | Rationale |
|---------------------------------------------------------------|----------------------------------------------------------------|-----------|
| `src/apps/reef-al-madina/features/meat/`                      | `src/apps/reef-al-madina/features/weighed-prep/`               | Weight × prep × addons pattern (cuts, cleaning, mince). |
| `src/apps/reef-al-madina/features/sweets/`                    | `src/apps/reef-al-madina/features/custom-fulfillment/`         | Made-fresh / pre-order with deposit & booking. |
| `src/apps/reef-al-madina/features/pharmacy/`                  | `src/apps/reef-al-madina/features/regulated-goods/`            | Rx + cold-chain + age-gate compliance flow. |
| `src/apps/reef-al-madina/features/baskets/`                   | `src/apps/reef-al-madina/features/composed-bundles/`           | Composed multi-SKU bundle builder. |
| `src/apps/reef-al-madina/features/library/`                   | `src/apps/reef-al-madina/features/borrow-and-print/`           | Borrow + print-on-demand fulfillment. |
| `src/apps/reef-al-madina/features/recipes/`                   | `src/apps/reef-al-madina/features/guided-assembly/`            | Step-driven assembled SKU lists. |
| `src/apps/reef-al-madina/features/restaurants/`               | `src/apps/reef-al-madina/features/prepared-meals/`             | Prepared-meal vendors with kitchen lead time. |
| `src/apps/reef-al-madina/features/wholesale/`                 | `src/apps/reef-al-madina/features/bulk-tier-pricing/`          | Tier-break + volume-deal pricing surface. |
| `src/apps/reef-al-madina/features/subscriptions/`             | `src/apps/reef-al-madina/features/recurring-fulfillment/`      | Recurring scheduled fulfillment. |

### 1.2 Strategy classes — `src/core/engine/pricing/strategies/`

| Current                          | Target                              | Rationale |
|----------------------------------|-------------------------------------|-----------|
| `MeatPricingStrategy.ts`         | `WeighedPricingStrategy.ts`         | Weight factor + prep delta. |
| `SweetsPricingStrategy.ts`       | `CustomFulfillmentPricingStrategy.ts` | Booking + deposit pipeline. |
| `WholesalePricingStrategy.ts`    | `BulkTierPricingStrategy.ts`        | Tier breaks + volume bundles. |

Class names rename in lockstep:
- `MeatPricingStrategy`           → `WeighedPricingStrategy`
- `MeatSelection`                 → `WeighedSelection`
- `SweetsPricingStrategy`         → `CustomFulfillmentPricingStrategy`
- `SweetsSelection / SweetsAddon / SweetsBooking` → `CustomFulfillmentSelection / FulfillmentAddon / FulfillmentBooking`
- `WholesalePricingStrategy`      → `BulkTierPricingStrategy`
- `WholesaleSelection / WholesaleTierBreak` → `BulkTierSelection / TierBreak`

### 1.3 Lib data modules — `src/lib/`

| Current                  | Target                              | Rationale |
|--------------------------|-------------------------------------|-----------|
| `baskets.ts`             | `composed-bundles.ts`               | Bundle composition data. |
| `butcheryPrep.ts`        | `weighed-prep-rules.ts`             | Weight/prep/addon rule resolver. |
| `kitchenMenu.ts`         | `prepared-menu.ts`                  | Kitchen-prepared menu metadata. |
| `library.ts`             | `borrow-catalog.ts`                 | Borrowable + printable catalog data. |
| `library.functions.ts`   | `borrow-catalog.functions.ts`       | Server-fn gateway. |
| `library.queries.ts`     | `borrow-catalog.queries.ts`         | TanStack Query options. |
| `restaurants.ts`         | `prepared-meal-vendors.ts`          | Prepared-meal vendor registry. |
| `savedBaskets.ts`        | `saved-bundles.ts`                  | User-saved composed bundles. |
| `sweetsFulfillment.ts`   | `custom-fulfillment-rules.ts`       | Fulfillment-type A/B/C rules. |
| `villageMeta.ts`         | `origin-meta.ts`                    | Source-origin descriptors (was "village"). |

---

## 2 · Blast Radius

`rg` reports **37 source files** with imports targeting the paths above. Distribution:

- `src/apps/reef-al-madina/features/**` — 12 imports (cart, recipes, library, meat, baskets, offers, product-detail).
- `src/core/runtime-ui/blocks/**` — 12 imports (product cards/sheets, commerce blocks).
- `src/core/engine/pricing/strategies/**` — 2 self-references (MeatPricingStrategy, SweetsPricingStrategy import legacy lib helpers).
- `src/pages/**`, `src/hooks/**`, `src/components/**`, `src/modules/**` — 11 imports.

No `tsconfig` path-alias rewrite is required: every consumer uses `@/...` aliases that resolve directly to the renamed file.

---

## 3 · Execution Strategy

### 3.1 Tooling (per rename)

1. **`git mv <old> <new>`** — preserves history.
2. **Global import rewrite** (single-file): `rg -l "<old-import-path>" src | xargs sed -i '' "s|<old>|<new>|g"` (BSD/macOS) or GNU equivalent.
3. **Class/type identifier rewrite** for strategies: ripgrep for the exact PascalCase symbol (`MeatPricingStrategy`, `MeatSelection`, …) and replace project-wide.
4. **Verification:** `tsc --noEmit` after each phase. Phase fails if non-zero.

### 3.2 Safe-rename rules

- **One phase = one logical group.** Never mix folder rename with class rename in the same commit.
- **No barrel side effects.** If a folder has an `index.ts`, it travels with the folder; downstream imports of `@/.../<folder>` resolve unchanged after the directory rename, only the path segment changes.
- **String literals stay.** Rename touches only file paths and identifiers — leave Arabic copy, telemetry event names, and DB column names untouched (those live under their own constitutions).
- **Aliases first if blast radius >25 files.** For groups exceeding the threshold, optionally add a temporary `tsconfig.json` `paths` alias mapping the old path → new path, ship the rename, then remove the alias in a follow-up PR. Not required for the current 37-file footprint.

---

## 4 · Phased Plan (build green between every phase)

| Phase | Group | Files moved | Symbols renamed | Verification |
|-------|-------|-------------|-----------------|--------------|
| **E-1** | `src/lib/*` data modules | 10 lib files (§1.3) | none (kebab-case file rename only; named exports unchanged) | `tsc --noEmit` |
| **E-2** | Pricing strategy files + classes | 3 strategy files (§1.2) | 9 class/type identifiers | `tsc --noEmit` + pricing engine smoke (`initPricingEngine()` test) |
| **E-3** | Feature folders — leaf domains first | `meat`, `sweets`, `pharmacy` → capability names | none (folder rename only) | `tsc --noEmit` |
| **E-4** | Feature folders — composed/borrow domains | `baskets`, `library`, `recipes` → capability names | none | `tsc --noEmit` |
| **E-5** | Feature folders — vendor/recurring domains | `restaurants`, `wholesale`, `subscriptions` → capability names | none | `tsc --noEmit` |
| **E-6** | Cleanup sweep | Search for residual `meat|sweets|pharmacy|...` tokens in identifiers, comments-only allowed | residual identifiers | `tsc --noEmit` + `rg` audit returns 0 vertical tokens in code paths |
| **E-7** | Baseline ratchet | none | none | Append PURIFICATION_BASELINE.md row: C5 → 0; declare Wave P-E COMPLETE |

### 4.1 Per-phase recipe

```bash
# 1. Move
git mv src/lib/butcheryPrep.ts src/lib/weighed-prep-rules.ts

# 2. Rewrite imports (all consumers in one shot)
rg -l "@/lib/butcheryPrep" src | xargs sed -i 's|@/lib/butcheryPrep|@/lib/weighed-prep-rules|g'

# 3. Verify
bunx tsc --noEmit

# 4. Commit
git commit -m "P-E E-1: rename butcheryPrep → weighed-prep-rules"
```

Folder rename variant:

```bash
git mv src/apps/reef-al-madina/features/meat \
       src/apps/reef-al-madina/features/weighed-prep
rg -l "features/meat" src | xargs sed -i 's|features/meat|features/weighed-prep|g'
bunx tsc --noEmit
```

### 4.2 Strategy identifier sweep (phase E-2 detail)

```bash
# After git mv MeatPricingStrategy.ts WeighedPricingStrategy.ts:
rg -l "MeatPricingStrategy|MeatSelection" src | xargs sed -i \
  -e 's/MeatPricingStrategy/WeighedPricingStrategy/g' \
  -e 's/MeatSelection/WeighedSelection/g'
bunx tsc --noEmit
```

Repeat for Sweets → CustomFulfillment and Wholesale → BulkTier triplets.

---

## 5 · Risk Matrix

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missed import path (case-sensitive FS) | Med | Run `rg -i "old-token"` after each phase; CI on Linux (case-sensitive) catches drift Windows/macOS hide. |
| Circular import surfaced by rename | Low | Phases are folder-scoped; if `tsc` reports a cycle, revert phase and split. |
| Pricing strategy registration order changes | Low | `bootstrap.ts` references classes by import — registration order untouched; only identifier changes. |
| Telemetry event name regressions | None | Event-bus payload literals are NOT renamed (Article 3a applies to code identifiers, not analytics keys). |
| DB / RPC name regressions | None | No DB object touched. |
| Long-running PRs | Med | Phases E-1…E-5 are independently shippable; can land over multiple commits. |

---

## 6 · Acceptance Criteria

- `rg -n "\b(meat|sweets|pharmacy|baskets|library|recipes|restaurants|wholesale|subscriptions)\b" src --type ts --type tsx` returns **only** matches inside string literals (Arabic copy, telemetry keys, DB column references) — zero matches in identifiers, paths, or class names.
- `tsc --noEmit` exits 0.
- Pricing engine bootstrap test passes (`initPricingEngine()` registers 4 strategies).
- `PURIFICATION_BASELINE.md §4` records C5: 9 → 0 and marks Wave P-E COMPLETE.

---

## 7 · Out of Scope

- DB column / RPC / event-name renames (separate constitution, separate wave).
- Arabic UI copy (presentational, non-normative).
- `src/apps/reef-al-madina` itself — vertical *brand* names at app-shell level are exempt by Article 3a footnote (brand ≠ capability).
- Behavioural refactors. This wave is rename-only; logic stays byte-identical.
