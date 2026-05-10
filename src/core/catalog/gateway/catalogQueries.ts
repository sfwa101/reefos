/**
 * TanStack Query options — مفاتيح موحدة لكل قراءات الكتالوج.
 * UI لا تلمس queryClient.fetchQuery مباشرة — تستهلك queryOptions من هنا.
 */
import { queryOptions } from "@tanstack/react-query";
import { catalogGateway, type ListSectionParams } from "./catalogGateway";

export const catalogKeys = {
  all: ["catalog"] as const,
  sections: () => [...catalogKeys.all, "sections"] as const,
  section: (slug: string) => [...catalogKeys.all, "section", slug] as const,
  list: (p: ListSectionParams) =>
    [...catalogKeys.all, "list", p.slug, p.sort ?? "popularity", p.limit ?? 24, p.offset ?? 0] as const,
  details: (slug: string) => [...catalogKeys.all, "details", slug] as const,
  relations: (id: string) => [...catalogKeys.all, "relations", id] as const,
  trending: (slug: string, limit = 12) => [...catalogKeys.all, "trending", slug, limit] as const,
  offers: (slug: string, limit = 12) => [...catalogKeys.all, "offers", slug, limit] as const,
};

export const sectionsQuery = () =>
  queryOptions({
    queryKey: catalogKeys.sections(),
    queryFn: () => catalogGateway.listSections(),
    staleTime: 5 * 60_000,
  });

export const sectionQuery = (slug: string) =>
  queryOptions({
    queryKey: catalogKeys.section(slug),
    queryFn: () => catalogGateway.getSection(slug),
    staleTime: 5 * 60_000,
  });

export const sectionListQuery = (params: ListSectionParams) =>
  queryOptions({
    queryKey: catalogKeys.list(params),
    queryFn: () => catalogGateway.listSection(params),
    staleTime: 60_000,
  });

export const productDetailsQuery = (slug: string) =>
  queryOptions({
    queryKey: catalogKeys.details(slug),
    queryFn: () => catalogGateway.getDetails(slug),
    staleTime: 60_000,
  });

export const productRelationsQuery = (productId: string) =>
  queryOptions({
    queryKey: catalogKeys.relations(productId),
    queryFn: () => catalogGateway.getRelations(productId),
    staleTime: 5 * 60_000,
  });

export const trendingQuery = (slug: string, limit = 12) =>
  queryOptions({
    queryKey: catalogKeys.trending(slug, limit),
    queryFn: () => catalogGateway.trending(slug, limit),
    staleTime: 60_000,
  });

export const offersQuery = (slug: string, limit = 12) =>
  queryOptions({
    queryKey: catalogKeys.offers(slug, limit),
    queryFn: () => catalogGateway.offers(slug, limit),
    staleTime: 60_000,
  });
