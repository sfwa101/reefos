// React Query options for the HR Gateway (Phase D-5).
import { queryOptions } from "@tanstack/react-query";
import {
  getEmployeeHubFn,
  listAdvanceRequestsFn,
} from "./hr.functions";

export const hrKeys = {
  all: ["hr"] as const,
  employeeHub: () => [...hrKeys.all, "employee-hub"] as const,
  advanceRequests: (filter: "pending" | "all") =>
    [...hrKeys.all, "advance-requests", filter] as const,
};

export const employeeHubQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: hrKeys.employeeHub(),
    queryFn: () => getEmployeeHubFn(),
    enabled,
    staleTime: 15_000,
  });

export const advanceRequestsQueryOptions = (
  filter: "pending" | "all",
  enabled: boolean,
) =>
  queryOptions({
    queryKey: hrKeys.advanceRequests(filter),
    queryFn: () => listAdvanceRequestsFn({ data: { filter } }),
    enabled,
    staleTime: 15_000,
  });
