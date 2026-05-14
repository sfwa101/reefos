// React Query options for the Catalog Gateway (Phase D-4).
import { queryOptions } from "@tanstack/react-query";
import { listProductReviewsFn, listProductUnitsFn } from "@/core/catalog/catalog.functions";

export const catalogKeys = {
  all: ["catalog"] as const,
  reviews: (productId: string) =>
    [...catalogKeys.all, "reviews", productId] as const,
  units: (productId: string) =>
    [...catalogKeys.all, "units", productId] as const,
};

export const productReviewsQueryOptions = (productId: string | null) =>
  queryOptions({
    queryKey: catalogKeys.reviews(productId ?? ""),
    queryFn: () => listProductReviewsFn({ data: { productId: productId! } }),
    enabled: !!productId,
    staleTime: 60_000,
  });

export const productUnitsQueryOptions = (productId: string | null) =>
  queryOptions({
    queryKey: catalogKeys.units(productId ?? ""),
    queryFn: () => listProductUnitsFn({ data: { productId: productId! } }),
    enabled: !!productId,
    staleTime: 5 * 60_000,
  });
