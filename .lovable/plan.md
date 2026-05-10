
# Audit (current state)

Legacy product paths still wired into UI:

- `src/lib/products.ts` — legacy `Product` type + direct `supabase.from('products')`.
- `src/lib/sovereignCatalog.ts` — secondary catalog reader.
- `src/hooks/useProductsQuery.ts`, `useInfiniteCatalog`, `useBuyAgainProducts`, `useFeaturedCategories` — all hit legacy tables.
- `useHomeOrchestrator` → `productToHGView(Product)` → `HGProduct` → `ProductsGrid/ProductCard` (storefront/home).
- 17 section pages in `src/pages/store/*` each rendering its own list.
- Multiple ProductCard implementations (storefront/home, pharmacy, components/ProductCard.tsx, ProductCarousel).
- Detail sheet: `DetailSheet.tsx` + `pages/ProductDetail.tsx` (direct supabase).
- New `usa_products` schema + `CatalogService` exists but **zero UI consumes it** yet.

Dual source of truth = `products` (legacy) vs `usa_products` (new). Migrating all 17 pages + every rail in one go is high risk and will break the live storefront.

# Strategy

Audit-first, incremental. Build the runtime spine completely (gateway, feeds, blocks, search, media), migrate **one pilot section** end-to-end through it (Home Goods), then roll the remaining 16 sections behind a feature flag. No legacy file is deleted in this wave — they are quarantined and replaced page-by-page in Wave 2.D.

Stem-cell discipline enforced by:
- single `catalogGateway` is the only allowed import for product reads outside `src/core/catalog/`
- ESLint `no-restricted-imports` blocks `@/lib/products`, `supabase.from('products'|'usa_products')` from `src/pages/**`, `src/components/**`, `src/apps/**/storefront/**`
- block visibility derived from capabilities, never section slug

# Wave 2.B — Data Plane + Gateway + Blocks

### Step 1 — Seed capabilities + sections (DB)
One migration:
- 12 rows into `capability_registry` (keys from `CAP` constants)
- 24 rows into `sections` with `metadata` JSON (tone, cardStyle, sortStrategy, badgeStrategy, interactionPattern)
- ~40 rows into `section_capabilities` linking each section to its caps
- Idempotent (`ON CONFLICT DO UPDATE`)

### Step 2 — Catalog Gateway
New `src/core/catalog/gateway/`:
```
catalogGateway.ts     // single facade — list/details/search/recos/offers/trending/related
catalogQueries.ts     // queryOptions (TanStack Query keys + fns calling CatalogService)
catalogCache.ts       // invalidation helpers, prefetch helpers
```
All UI hooks (next step) import only from `gateway`.

### Step 3 — Feed Runtime
New `src/core/feeds/`:
```
types.ts              // FeedDescriptor { source, params, sort, capabilities }
FeedRuntime.ts        // resolveFeed(descriptor) -> ProductCardVM[]
sources/
  homeFeed.ts
  sectionFeed.ts
  offersFeed.ts
  recommendationsFeed.ts
  trendingFeed.ts
  searchFeed.ts
```
Each source is a function `(params) => Promise<ProductCardVM[]>`. Zero section-specific branching — driven by the descriptor.

### Step 4 — Block Registry (capability-driven)
Register in `src/core/runtime-ui/blocks/`:
- `section.header`, `product.grid`, `product.list`, `product.gallery`
- `product.heading`, `product.price`, `product.variants`, `product.addons`
- `product.description`, `product.nutrition`, `product.diet_flags`, `product.relations`
- `commerce.add_to_cart`, `commerce.quick_buy_bar`, `commerce.subscribe_cta`

Each block reads its slice of `ProductCardVM`/`ProductDetailsVM`. Visibility resolved by `ResolveRenderTree` from `capabilities`, never `section.slug`.

### Step 5 — Pilot migration: Home Goods
- Replace `useHomeOrchestrator`'s data source with `gateway.listSection({slug:'home-goods'})`
- Page renders via `<RuntimeRenderer descriptor={resolveListTree(...)} />`
- Old `ProductCard`/`DetailSheet` kept as registered block implementations (adapter wraps them around VM)
- All 16 other sections continue using legacy path (untouched) — feature flag `USE_RUNTIME_STOREFRONT` per-section

# Wave 2.C — Search + Media + Enforcement

### Step 6 — Search foundation
`src/core/search/`:
```
SearchRegistry.ts          // pluggable providers
providers/PostgresSearch.ts // current default — uses pg_trgm/tsvector on usa_products
filters/                    // schema + capability-driven filter resolvers
types.ts                    // SearchQuery, SearchFacet, SearchResult
```
No section branching. Filters declared from capabilities.

### Step 7 — Media pipeline
`src/core/media/`:
```
MediaResolver.ts        // hero/gallery selection from MediaRefVM[]
ResponsiveSrcSet.ts     // srcset/sizes generation from CDN url
BlurHash.tsx            // tiny placeholder component
LazyImage.tsx           // IntersectionObserver-based lazy
```
Drop-in for `product.grid` / `product.gallery` blocks.

### Step 8 — Architecture enforcement
- ESLint config additions:
  - `no-restricted-imports` on `@/lib/products`, `@/lib/sovereignCatalog`, `@/hooks/useProductsQuery` from `src/pages/**`, `src/components/**`, `src/apps/**`
  - `no-restricted-syntax` against `supabase.from('products'|'usa_products')` outside `src/core/catalog/**`
- Dev-only runtime assertion in `RuntimeRenderer` warning when a block reads non-VM shapes
- Architectural README in each new folder

# Out of scope (this wave)

- Migrating remaining 16 section pages — Wave 2.D
- Deleting `lib/products.ts` / legacy hooks — Wave 2.E (once all pages migrated)
- Generating 120 products + AI images — Wave 2.F
- Vector search — future

# Risks & mitigations

| Risk | Mitigation |
|---|---|
| Live storefront breaks during migration | Pilot only Home Goods; feature flag; legacy untouched |
| Empty `usa_products` table → empty UI | Pilot page shows runtime empty state; user can run seed before flipping flag |
| TS strict failures on block props | All blocks consume strongly-typed VM slices; `tsc` after each step |
| ESLint rules break unrelated code | Scope rules to UI dirs only; legacy core libs allowed |

# Acceptance

- `bun run build:dev` green after each step
- Home Goods page rendered fully via `RuntimeRenderer` with zero `supabase.from()` in component tree
- Adding a new capability row + linking it to a section makes a new block appear with **zero code change**
- Adding a new section row makes it queryable through `gateway.listSection(slug)` with **zero code change**

# Execution order

1. DB migration (caps + sections + links) — needs your approval
2. Gateway + queries + cache (no UI change)
3. Feed runtime + sources
4. Block registry + 15 blocks
5. Pilot Home Goods migration behind flag
6. Search foundation
7. Media pipeline
8. ESLint guards + dev assertions

I will pause for your approval after step 1 (DB migration) and after step 5 (pilot live), so you can verify before I touch the remaining sections in Wave 2.D.
