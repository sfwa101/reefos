// React Query options for the User Account Gateway (Phase D-1).
import { queryOptions } from "@tanstack/react-query";
import {
  getHakimInsightsFn,
  getHakimSnapshotFn,
  getMyAccountHubFn,
  getMyProfileFn,
  listMyAddressesFn,
  listMyNotificationsFn,
} from "@/core/identity/user.functions";

export const userKeys = {
  all: ["user"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
  addresses: () => [...userKeys.all, "addresses"] as const,
  notifications: () => [...userKeys.all, "notifications"] as const,
  accountHub: () => [...userKeys.all, "account-hub"] as const,
  hakimInsights: (workspaceId: string | null) =>
    [...userKeys.all, "hakim", "insights", workspaceId ?? "all"] as const,
  hakimSnapshot: (days: number) =>
    [...userKeys.all, "hakim", "snapshot", days] as const,
};

export const profileQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: userKeys.profile(),
    queryFn: () => getMyProfileFn(),
    enabled,
    staleTime: 30_000,
  });

export const addressesQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: userKeys.addresses(),
    queryFn: () => listMyAddressesFn(),
    enabled,
    staleTime: 30_000,
  });

export const notificationsQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: userKeys.notifications(),
    queryFn: () => listMyNotificationsFn(),
    enabled,
    staleTime: 30_000,
  });

export const accountHubQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: userKeys.accountHub(),
    queryFn: () => getMyAccountHubFn(),
    enabled,
    staleTime: 30_000,
  });

export const hakimInsightsQueryOptions = (
  enabled: boolean,
  workspaceId: string | null,
) =>
  queryOptions({
    queryKey: userKeys.hakimInsights(workspaceId),
    queryFn: () => getHakimInsightsFn({ data: { workspaceId } }),
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 60_000 : false,
  });

export const hakimSnapshotQueryOptions = (enabled: boolean, days = 30) =>
  queryOptions({
    queryKey: userKeys.hakimSnapshot(days),
    queryFn: () => getHakimSnapshotFn({ data: { days } }),
    enabled,
    staleTime: 60_000,
  });
