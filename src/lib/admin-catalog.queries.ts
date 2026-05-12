// React Query options for the Admin Catalog Master-Data Gateway (Phase D-6).
import { queryOptions } from "@tanstack/react-query";
import {
  listBranchesFn,
  listCategoriesFn,
  listStoresFn,
  listSuppliersFn,
} from "./admin-catalog.functions";

export const adminCatalogKeys = {
  all: ["admin-catalog"] as const,
  categories: () => [...adminCatalogKeys.all, "categories"] as const,
  stores: () => [...adminCatalogKeys.all, "stores"] as const,
  branches: () => [...adminCatalogKeys.all, "branches"] as const,
  suppliers: () => [...adminCatalogKeys.all, "suppliers"] as const,
};

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: adminCatalogKeys.categories(),
    queryFn: () => listCategoriesFn(),
    staleTime: 30_000,
  });

export const storesQueryOptions = () =>
  queryOptions({
    queryKey: adminCatalogKeys.stores(),
    queryFn: () => listStoresFn(),
    staleTime: 30_000,
  });

export const branchesQueryOptions = () =>
  queryOptions({
    queryKey: adminCatalogKeys.branches(),
    queryFn: () => listBranchesFn(),
    staleTime: 30_000,
  });

export const suppliersQueryOptions = () =>
  queryOptions({
    queryKey: adminCatalogKeys.suppliers(),
    queryFn: () => listSuppliersFn(),
    staleTime: 60_000,
  });
