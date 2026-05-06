/**
 * AdminTableEngine — server-paginated, virtualized table for any entity.
 *
 * - `useEntityList` does Supabase `.range()` (zero client-side filtering).
 * - `@tanstack/react-virtual` virtualizes rows so 1M rows render at 60fps.
 * - Columns are SDUI blocks (table_column / computed_column) read from
 *   the active `list` schema, OR auto-derived from entity_attributes.
 */
import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEntityDefinition } from "../hooks/useEntityDefinition";
import { useEntityList, type EntityListFilters } from "../hooks/useEntityList";
import { AdminBlockRenderer } from "../components/AdminBlockRenderer";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { parseAdminBlocks, type AdminBlock, type TableColumnBlock } from "../schemas";
import type { EntityAttributeRow } from "../hooks/useEntityDefinition";

const ROW_HEIGHT = 56;

interface Props {
  entityKey: string;
  filters?: EntityListFilters;
  locale?: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}

function autoColumnsFromAttributes(
  attrs: EntityAttributeRow[] | undefined,
): AdminBlock[] {
  if (!attrs) return [];
  return attrs.slice(0, 6).map<TableColumnBlock>((a) => ({
    type: "table_column",
    id: `col-${a.key}`,
    props: {
      key: a.key,
      label_i18n: a.label_i18n,
      data_type: (a.data_type as TableColumnBlock["props"]["data_type"]) ?? "text",
      sortable: false,
      filterable: false,
      formatter: "text",
    },
  }));
}

export function AdminTableEngine({ entityKey, filters, locale = "ar", onRowClick }: Props) {
  const def = useEntityDefinition(entityKey);
  const tableName = def.data?.definition.table_name;
  const list = useEntityList(entityKey, tableName, filters);

  const columns = useMemo<AdminBlock[]>(() => {
    const listSchema = def.data?.formSchemas.find((s) => s.mode === "list");
    if (listSchema) {
      const parsed = parseAdminBlocks(listSchema.blocks);
      const cols = parsed.filter(
        (b) => b.type === "table_column" || b.type === "computed_column",
      );
      if (cols.length > 0) return cols;
    }
    return autoColumnsFromAttributes(def.data?.attributes);
  }, [def.data]);

  const rows = useMemo(
    () => list.data?.pages.flatMap((p) => p.rows) ?? [],
    [list.data],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  // Auto-fetch next page when bottom is near. Depend only on stable
  // primitives (rows.length + paging flags) — never on getVirtualItems()
  // (returns a new array each render → infinite effect loop).
  const hasNextPage = list.hasNextPage;
  const isFetchingNextPage = list.isFetchingNextPage;
  const fetchNextPage = list.fetchNextPage;
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    const last = items[items.length - 1];
    if (!last) return;
    if (last.index >= rows.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [rows.length, hasNextPage, isFetchingNextPage, fetchNextPage, virtualizer]);

  if (def.isLoading) {
    return <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 p-8 animate-pulse">…</div>;
  }
  if (!def.data) {
    return <AdminEmptyState title="كيان غير معرّف" hint={entityKey} />;
  }
  if (!list.isLoading && rows.length === 0) {
    return <AdminEmptyState title="لا توجد سجلات" />;
  }

  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 shadow-soft overflow-hidden">
      {/* Header */}
      <div
        className="grid items-center px-6 py-3 border-b border-border/40 text-[12px] font-semibold text-foreground/60 uppercase tracking-wide"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((c) => {
          const lbl = (c.props as { label_i18n: Record<string, string> }).label_i18n;
          return <div key={c.id}>{lbl[locale] ?? lbl.ar}</div>;
        })}
      </div>

      {/* Virtual body */}
      <div ref={parentRef} className="overflow-auto" style={{ height: "min(70vh, 720px)" }}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            return (
              <div
                key={vi.key}
                onClick={() => onRowClick?.(row)}
                className="grid items-center px-6 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: vi.size, transform: `translateY(${vi.start}px)`,
                  gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
                }}
              >
                {columns.map((c) => (
                  <AdminBlockRenderer key={c.id} block={c} ctx={{ record: row, locale }} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-border/40 text-[11px] text-foreground/50 flex justify-between">
        <span>{rows.length.toLocaleString("ar-SA")} من {(list.data?.pages[0]?.total ?? 0).toLocaleString("ar-SA")}</span>
        {list.isFetchingNextPage && <span>تحميل…</span>}
      </div>
    </div>
  );
}
