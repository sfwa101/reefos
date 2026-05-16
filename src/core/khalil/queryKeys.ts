/**
 * Khalil — React Query key factory.
 *
 * Single namespace `["khalil", ...]` so domain invalidation is one call:
 *   queryClient.invalidateQueries({ queryKey: khalilKeys.all });
 *
 * Locked by p1-state-management.md. No global stores. Server is the truth.
 */
export const khalilKeys = {
  all: ["khalil"] as const,

  home: () => [...khalilKeys.all, "home"] as const,
  homeCompose: (userId: string | null) =>
    [...khalilKeys.home(), "compose", userId] as const,

  identity: (userId: string | null) =>
    [...khalilKeys.all, "identity", userId] as const,

  prayer: (userId: string | null, date: string) =>
    [...khalilKeys.all, "prayer", userId, date] as const,

  habits: (userId: string | null, date: string) =>
    [...khalilKeys.all, "habits", userId, date] as const,

  workout: (userId: string | null) =>
    [...khalilKeys.all, "workout", userId] as const,

  weight: (userId: string | null, window: "7d" | "30d" | "90d") =>
    [...khalilKeys.all, "weight", userId, window] as const,

  recovery: (userId: string | null) =>
    [...khalilKeys.all, "recovery", userId] as const,

  analytics: (userId: string | null, window: "7d" | "30d" | "90d") =>
    [...khalilKeys.all, "analytics", userId, window] as const,

  coach: (userId: string | null) =>
    [...khalilKeys.all, "coach", userId] as const,
} as const;
