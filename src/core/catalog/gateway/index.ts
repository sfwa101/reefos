/**
 * Wave Cleanup-B — Catalog Gateway barrel.
 *
 * Single sovereign source: `SovereignCatalogGateway`. The legacy
 * `catalogGateway` facade, TanStack query options, cache helpers, and
 * the CommerceEntity-shaped `CatalogGateway` are all re-exported from
 * one module.
 */
export {
  catalogGateway,
  type CatalogGatewayFacade,
  type ListSectionParams,
  catalogKeys,
  sectionsQuery,
  sectionQuery,
  sectionListQuery,
  productDetailsQuery,
  productRelationsQuery,
  trendingQuery,
  offersQuery,
  catalogCache,
  CatalogGateway,
  type CatalogGatewayType,
  type ListSectionEntitiesParams,
} from "./SovereignCatalogGateway";
