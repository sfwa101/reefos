# ADR-0006 — Deprecate `usa_products` Compatibility Layer

| Field | Value |
|---|---|
| Status | **Implemented** |
| Date | 2026-05-22 |
| Sponsor | Salsabil Architecture Council |
| Phase | N-2 "Bury the Ghost" |
| Related | ADR-0001 (legacy catalog deprecation), ADR-0005 (asset-section bridge — pending) |

## Context

After Phase N-1 the storefront read exclusively from `salsabil_assets ⨝ salsabil_skus ⨝ salsabil_financial_contracts`, yet the runtime still carried a private adapter (`assetRowToProductRow`) and four dependent files (`ProductTransformers`, `ProductRuntimeEngine`, `ProductHydrationPipeline`, `ProductViewModelFactory`, `ProductCapabilityResolver`) whose sole purpose was to fabricate `Row<"usa_products">` shapes so a deprecated normalization pipeline could keep running. The Ghost Storefront incident (2026-05-13) and the N-2 audit confirmed this chain was dead runtime code with only one in-domain consumer.

## Decision

Delete the five compatibility files from `src/core/catalog/**` and inline the single remaining caller (`normalizeRelation` in `catalog.functions.ts`) directly against the `product_relations` row shape. No replacement abstraction, wrapper, or adapter was introduced. All cross-domain consumers (`legacyProduct.types.ts`, `legacyRuntime.ts`, `projectProductDNA.ts`) are explicitly deferred to **N-2.1** because their blast radius (50+ files in `src/apps/**` and `src/components/**`) exceeds the scope of N-2's "kill the type ghost" objective.

## Consequences

**Positive**
- `usa_products` no longer appears in any catalog runtime file under `src/core/catalog/`.
- One fewer indirection layer in the catalog read path.
- `bunx tsc --noEmit` → 0 errors.
- Future drop of the physical `usa_products` TABLE will only require deleting the wider ghost (N-2.1) + regenerating `src/integrations/supabase/types.ts`.

**Negative / Deferred**
- `legacyProduct.types.ts`, `legacyRuntime.ts`, `projectProductDNA.ts` and 50+ UI consumers still reference the legacy `Product` shape — scheduled for N-2.1.
- `src/integrations/supabase/types.ts` still lists `usa_products` — auto-regenerated; will disappear when the table is dropped (separate future migration).

## Files removed

- `src/core/catalog/runtime/ProductTransformers.ts`
- `src/core/catalog/runtime/ProductRuntimeEngine.ts`
- `src/core/catalog/runtime/ProductHydrationPipeline.ts`
- `src/core/catalog/runtime/ProductViewModelFactory.ts`
- `src/core/catalog/resolvers/ProductCapabilityResolver.ts`

## Files modified

- `src/core/catalog/service/catalog.functions.ts` — dropped `normalizeRelation` import, inlined the 3-line mapping, scrubbed `usa_products` comment references.
- `src/core/commerce/inventory/types.ts` — comment swapped `usa_products.stock_qty` → `salsabil_skus.stock_qty`.

## Verification

- `rg "usa_products" src/` outside `integrations/supabase/types.ts` (auto-generated) → 0 hits.
- `bunx tsc --noEmit` → ✅ 0 errors.
- No file outside `src/core/catalog/**` was modified (constraint #4 honored).
