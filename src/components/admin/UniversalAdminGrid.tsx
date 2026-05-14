import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, ChevronLeft, Inbox, Rows3, Rows2, type LucideIcon } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdminGridFn } from "@/core/runtime-ui/admin/admin-grid.functions";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

type Density = "compact" | "comfortable";
const DENSITY_ROW: Record<Density, string> = {
  compact: "px-3 lg:px-4 py-1.5",
  comfortable: "px-4 lg:px-5 py-3",
};
const DENSITY_HEIGHT: Record<Density, number> = { compact: 44, comfortable: 64 };

/**
 * UniversalAdminGrid — Phase 26.1 OOM-safe rewrite.
 * --------------------------------------------------
 * • Server-paginated when `dataSource.table` is present (Supabase `.range()`).
 * • Server-side search via `.ilike` / `.or` when `searchKeys` are provided.
 * • Virtualized rows via @tanstack/react-virtual (no DOM blow-up at 10k+ rows).
 * • Backward compatible with `fetcher` (client-side mode, still virtualized).
 * The legacy `limit: 200` ceiling and full-array client filtering are gone.
 */

// -------- Types --------

export type BentoTone =
  | "primary" | "info" | "success" | "warning" | "accent" | "purple" | "pink" | "teal" | "indigo";

/**
 * BentoMetric — Wave P-10 generic migration.
 * `TRow` defaults to `unknown`, so callers that don't care about row shape
 * still typecheck. Callers that pass `<UniversalAdminGrid<MyRow>` get
 * fully-typed `compute`/`urgent` callbacks via contextual inference.
 */
export interface BentoMetric<TRow = unknown> {
  key: string;
  label: string;
  icon: LucideIcon;
  tone?: BentoTone;
  /** Method shorthand for bivariant params — accepts narrower row arrays. */
  compute?(rows: TRow[]): string | number;
  urgent?(rows: TRow[]): boolean;
  to?: string;
}

export type Column<T = unknown> = {
  key: string;
  label?: string;
  render?: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
};

export type RowAction<T = unknown> = {
  label: string;
  onClick: (row: T) => void;
  icon?: LucideIcon;
  tone?: "default" | "destructive" | "success";
};

export type DataSource<T = unknown> = {
  table?: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  /** Page size for server pagination. Default 50. */
  limit?: number;
  fetcher?: () => Promise<T[]>;
  searchKeys?: (keyof T | string)[];
  map?: (row: unknown) => T;
};

export type EmptyState = {
  icon?: LucideIcon;
  title: string;
  hint?: string;
};

export type UniversalAdminGridProps<T = unknown> = {
  title: string;
  subtitle?: string;
  metrics?: BentoMetric<T>[];
  columns?: Column<T>[];
  dataSource: DataSource<T>;
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: RowAction<T>[];
  searchPlaceholder?: string;
  empty?: EmptyState;
  topSlot?: ReactNode;
  renderList?: (rows: T[]) => ReactNode;
};

// -------- Tone palette --------

const TONE: Record<BentoTone, string> = {
  primary: "from-primary to-primary-glow",
  info: "from-[hsl(var(--info))] to-[hsl(var(--indigo))]",
  success: "from-[hsl(var(--success))] to-[hsl(var(--teal))]",
  warning: "from-[hsl(var(--accent))] to-[hsl(20_100%_55%)]",
  accent: "from-[hsl(var(--accent))] to-[hsl(20_100%_55%)]",
  purple: "from-[hsl(var(--purple))] to-[hsl(var(--pink))]",
  pink: "from-[hsl(var(--pink))] to-[hsl(var(--purple))]",
  teal: "from-[hsl(var(--teal))] to-[hsl(var(--info))]",
  indigo: "from-[hsl(var(--indigo))] to-[hsl(var(--info))]",
};

// -------- Bento tile --------

function BentoTile({
  metric, value, urgent,
}: { metric: BentoMetric<unknown>; value: string | number; urgent?: boolean }) {
  const Icon = metric.icon;
  const tone = TONE[metric.tone ?? "primary"];
  const className = cn(
    "group relative overflow-hidden rounded-3xl p-4 bg-card border shadow-soft transition-all press",
    urgent ? "border-[hsl(var(--accent))]/40" : "border-border/50",
    metric.to ? "hover:shadow-tile hover:-translate-y-0.5" : "",
  );
  const inner = (
    <>
      <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-3 shadow-sm", tone)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] text-foreground-tertiary leading-tight">{metric.label}</p>
      <p className="font-display text-[20px] num leading-tight mt-0.5">{value}</p>
      {urgent && <span className="absolute top-3 left-3 h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />}
    </>
  );
  if (metric.to) {
    // Admin metric `to` strings are runtime route paths; bypass Link's
    // compile-time route-union constraint here only.
    return (
      <Link to={metric.to as never} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

// -------- Debounce hook --------

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// (escapeIlike now lives in admin-grid.functions; client side has nothing to escape.)

// -------- Main component --------

export function UniversalAdminGrid<T = any>({
  title, subtitle, metrics, columns, dataSource, rowKey,
  onRowClick, rowActions, searchPlaceholder, empty, topSlot, renderList,
}: UniversalAdminGridProps<T>) {
  const [q, setQ] = useState("");
  const [density, setDensity] = useState<Density>("comfortable");
  const debouncedQ = useDebounced(q.trim(), 250);

  const limit = dataSource.limit ?? 50;
  const useServer = !!dataSource.table && !dataSource.fetcher;
  const searchKeys = (dataSource.searchKeys ?? []) as string[];
  const fetchGrid = useServerFn(listAdminGridFn);

  // ---- Server-paginated mode ----
  const infinite = useInfiniteQuery({
    enabled: useServer,
    queryKey: [
      "admin-grid",
      dataSource.table,
      dataSource.select ?? "*",
      dataSource.orderBy?.column ?? "",
      dataSource.orderBy?.ascending ?? false,
      debouncedQ,
      searchKeys.join(","),
      limit,
    ] as const,
    initialPageParam: 0 as number,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const page = await fetchGrid({
        data: {
          table: dataSource.table!,
          select: dataSource.select ?? "*",
          orderBy: dataSource.orderBy
            ? { column: dataSource.orderBy.column, ascending: !!dataSource.orderBy.ascending }
            : undefined,
          offset,
          limit,
          search: debouncedQ || null,
          searchKeys,
        },
      });
      return {
        items: page.items,
        nextOffset: page.hasMore ? offset + limit : null,
      };
    },
    getNextPageParam: (last: { nextOffset: number | null }) => last.nextOffset,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // ---- Client (fetcher) mode ----
  const [clientRows, setClientRows] = useState<any[]>([]);
  const [clientLoading, setClientLoading] = useState(!useServer);
  useEffect(() => {
    if (useServer || !dataSource.fetcher) return;
    let cancelled = false;
    setClientLoading(true);
    dataSource.fetcher()
      .then((data) => { if (!cancelled) setClientRows(data ?? []); })
      .catch(() => { if (!cancelled) setClientRows([]); })
      .finally(() => { if (!cancelled) setClientLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useServer, dataSource.fetcher]);

  // ---- Unified rows ----
  const rawRows = useMemo<unknown[]>(() => {
    if (useServer) {
      const pages = infinite.data?.pages as Array<{ items: unknown[] }> | undefined;
      return pages?.flatMap((p) => p.items) ?? [];
    }
    return clientRows;
  }, [useServer, infinite.data, clientRows]);

  const mapped = useMemo<T[]>(
    () => (dataSource.map ? rawRows.map(dataSource.map) : (rawRows as T[])),
    [rawRows, dataSource.map],
  );

  // Client-side filter only in fetcher mode (server mode pushes search to DB).
  const filtered = useMemo<T[]>(() => {
    if (useServer) return mapped;
    if (!debouncedQ || searchKeys.length === 0) return mapped;
    const needle = debouncedQ.toLowerCase();
    return mapped.filter((row) =>
      searchKeys.some((k) => String((row as Record<string, unknown>)?.[k] ?? "").toLowerCase().includes(needle)),
    );
  }, [useServer, mapped, debouncedQ, searchKeys]);

  const loading = useServer ? infinite.isLoading : clientLoading;
  const EmptyIcon = empty?.icon ?? Inbox;

  // ---- Virtualization ----
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowHeight = DENSITY_HEIGHT[density];
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  // Auto-fetch next page when nearing bottom (server mode).
  const items = virtualizer.getVirtualItems();
  useEffect(() => {
    if (!useServer || !infinite.hasNextPage || infinite.isFetchingNextPage) return;
    const last = items[items.length - 1];
    if (!last) return;
    if (last.index >= filtered.length - 5) {
      void infinite.fetchNextPage();
    }
  }, [items, useServer, infinite, filtered.length]);

  return (
    <>
      <MobileTopbar title={title} />

      <div className="hidden lg:block px-6 pt-8 pb-3 max-w-[1400px] mx-auto">
        <h1 className="font-display text-[30px] tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-foreground-secondary mt-1">{subtitle}</p>}
      </div>

      <div className="px-4 lg:px-6 pt-3 pb-10 max-w-[1400px] mx-auto space-y-5">
        {metrics && metrics.length > 0 && (
          <BentoMetricsRow metrics={metrics} filtered={filtered} />
        )}

        {topSlot}

        {searchKeys.length || !renderList ? (
          <div className="sticky top-[56px] lg:top-2 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 py-2 glass-strong rounded-none lg:rounded-2xl flex items-center gap-2">
            {searchKeys.length ? (
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchPlaceholder ?? "بحث..."}
                  className="w-full bg-card/70 border border-border/50 rounded-2xl pr-10 pl-4 py-2.5 text-[13.5px] outline-none focus:border-primary/50 transition"
                />
              </div>
            ) : <div className="flex-1" />}
            <div className="hidden md:flex items-center rounded-2xl border border-border/50 bg-card/70 p-0.5" role="group" aria-label="كثافة العرض">
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                aria-pressed={density === "comfortable"}
                title="عرض موسّع"
                className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center transition press",
                  density === "comfortable" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground-tertiary hover:text-foreground",
                )}
              >
                <Rows2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                aria-pressed={density === "compact"}
                title="عرض مكثّف"
                className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center transition press",
                  density === "compact" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground-tertiary hover:text-foreground",
                )}
              >
                <Rows3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        <section className="bg-surface rounded-3xl border border-border/50 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyIcon className="h-10 w-10 mx-auto mb-2 text-foreground-tertiary opacity-50" />
              <p className="font-display text-[15px]">{empty?.title ?? "لا توجد بيانات"}</p>
              {empty?.hint && <p className="text-[12px] text-foreground-tertiary mt-1">{empty.hint}</p>}
            </div>
          ) : renderList ? (
            renderList(filtered)
          ) : (
            <div
              ref={scrollRef}
              className="divide-y divide-border/40 overflow-auto"
              style={{ maxHeight: "min(72vh, 800px)" }}
            >
              <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                {items.map((vi) => {
                  const row = filtered[vi.index] as T;
                  const rowRecord = row as Record<string, unknown>;
                  const key = rowKey ? rowKey(row) : ((rowRecord?.id as string | number | undefined) ?? vi.index);
                  return (
                    <div
                      key={key}
                      data-index={vi.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${vi.start}px)`,
                      }}
                      role={onRowClick ? "button" : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        DENSITY_ROW[density],
                        "flex items-center gap-3 transition text-right group/row hover:bg-surface-muted/60 hover:shadow-[inset_2px_0_0_hsl(var(--primary))] border-b border-border/40",
                        onRowClick && "cursor-pointer press",
                      )}
                    >
                      {columns?.map((col) => (
                        <div
                          key={col.key}
                          className={cn(
                            "min-w-0",
                            col.hideOnMobile && "hidden md:block",
                            col.className ?? "flex-1",
                          )}
                        >
                          {col.render ? col.render(row) : <span className="text-[13.5px]">{String(rowRecord?.[col.key] ?? "—")}</span>}
                        </div>
                      ))}
                      {rowActions?.length ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {rowActions.map((a) => {
                            const AIcon = a.icon;
                            return (
                              <button
                                key={a.label}
                                onClick={(e) => { e.stopPropagation(); a.onClick(row); }}
                                className={cn(
                                  "h-8 px-3 rounded-xl text-[12px] font-semibold press border",
                                  a.tone === "destructive" && "bg-destructive/10 text-destructive border-destructive/20",
                                  a.tone === "success" && "bg-success/10 text-success border-success/20",
                                  (!a.tone || a.tone === "default") && "bg-primary-soft text-primary border-primary/20",
                                )}
                              >
                                {AIcon && <AIcon className="h-3.5 w-3.5 inline -mt-0.5 ml-1" />}
                                {a.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : onRowClick ? (
                        <ChevronLeft className="h-4 w-4 text-foreground-tertiary shrink-0" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {useServer && infinite.isFetchingNextPage && (
                <div className="p-3 text-center text-[12px] text-foreground-tertiary">جاري التحميل…</div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * Phase U — Memoized Bento metrics row.
 * Computes m.compute(filtered) ONCE per [metrics, filtered] tuple instead of
 * on every virtualizer scroll re-render of the parent grid.
 */
function BentoMetricsRowImpl<T>({
  metrics,
  filtered,
}: {
  metrics: BentoMetric<T>[];
  filtered: T[];
}) {
  const computed = useMemo(
    () =>
      metrics.map((m) => ({
        metric: m,
        value: m.compute ? m.compute(filtered) : fmtNum(filtered.length),
        urgent: m.urgent?.(filtered),
      })),
    [metrics, filtered],
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
      {computed.map(({ metric, value, urgent }) => (
        <BentoTile key={metric.key} metric={metric} value={value} urgent={urgent} />
      ))}
    </div>
  );
}
/**
 * Phase U — Memoized Bento metrics row.
 * `memo` strips generics — re-cast to the generic impl so callers get
 * fully-typed `BentoMetric<T>[]` props.
 */
const BentoMetricsRow = memo(BentoMetricsRowImpl) as typeof BentoMetricsRowImpl;

export default UniversalAdminGrid;
