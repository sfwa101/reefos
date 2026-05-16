/**
 * Khalil — Home page (composition-only).
 *
 * Reads a descriptor tree from the server orchestrator and renders via
 * the shared RuntimeRenderer. No bespoke logic, no per-block branching.
 * Per p1-composable-dashboard.md.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RuntimeRenderer, type RenderDescriptor } from "@/core/runtime-ui";
import { composeKhalilHomeFn, khalilKeys, kt } from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilLoading, KhalilError } from "../primitives/StateViews";

export function KhalilHomePage() {
  const { user } = useAuth();
  const composeHome = useServerFn(composeKhalilHomeFn);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: khalilKeys.homeCompose(user?.id ?? null),
    queryFn: () => composeHome(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const descriptor = data?.descriptor as unknown as RenderDescriptor | undefined;

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {kt("khalil.brand.name")}
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.brand.tagline")}
        </h1>
      </header>

      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}
      {descriptor && <RuntimeRenderer descriptor={descriptor} />}
    </div>
  );
}
