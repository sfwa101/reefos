// React Query options for the Library Gateway (Phase D-4).
import { queryOptions } from "@tanstack/react-query";
import { getMyKycStatusFn } from "./library.functions";

export const libraryKeys = {
  all: ["library"] as const,
  kyc: () => [...libraryKeys.all, "kyc"] as const,
};

export const myKycStatusQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: libraryKeys.kyc(),
    queryFn: () => getMyKycStatusFn(),
    enabled,
    staleTime: 5 * 60_000,
  });
