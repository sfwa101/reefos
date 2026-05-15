/**
 * GlassTable — Steel Glass data display cell.
 *
 * Pure presentation wrapper around shadcn `Table` primitives. Accepts a
 * generic `data` array and a `columns` definition; consumers stay free
 * to compose custom cell renderers without touching the styling.
 *
 * Constitution v5.1: zero data fetching, zero supabase calls. All scroll
 * concerns are handled via overflow-x-auto for mobile screens.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type GlassTableColumn<T> = {
  /** Stable column identifier (also used as React key). */
  id: string;
  /** Header label rendered in the column head. */
  header: ReactNode;
  /** Cell renderer; receives the row + index. */
  cell: (row: T, index: number) => ReactNode;
  /** Optional alignment helper. Default: start. */
  align?: "start" | "center" | "end";
  /** Tailwind width class (e.g. "w-32"). */
  width?: string;
  /** Hide on small screens (still scrollable). */
  hideOnMobile?: boolean;
};

export type GlassTableProps<T> = {
  data: ReadonlyArray<T>;
  columns: ReadonlyArray<GlassTableColumn<T>>;
  /** Stable row key extractor. */
  rowKey: (row: T, index: number) => string;
  /** Optional row click handler — visual hover state always applies. */
  onRowClick?: (row: T, index: number) => void;
  loading?: boolean;
  loadingRows?: number;
  /** Element rendered when `data` is empty and not loading. */
  emptyState?: ReactNode;
  caption?: ReactNode;
  className?: string;
};

const ALIGN: Record<NonNullable<GlassTableColumn<unknown>["align"]>, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

export function GlassTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  loading = false,
  loadingRows = 5,
  emptyState,
  caption,
  className,
}: GlassTableProps<T>) {
  const isEmpty = !loading && data.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={cn(
        "glass-steel relative overflow-hidden rounded-3xl border border-white/40 shadow-elevated",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          {caption ? (
            <caption className="px-4 pt-3 text-start text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              {caption}
            </caption>
          ) : null}

          <TableHeader>
            <TableRow className="border-white/40 bg-white/40 hover:bg-white/40">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(
                    "h-11 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground",
                    ALIGN[col.align ?? "start"],
                    col.width,
                    col.hideOnMobile && "hidden md:table-cell",
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: loadingRows }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-white/40">
                    {columns.map((col) => (
                      <TableCell
                        key={col.id}
                        className={cn(col.hideOnMobile && "hidden md:table-cell")}
                      >
                        <Skeleton className="h-4 w-full max-w-[160px] rounded-md" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : isEmpty
                ? null
                : data.map((row, i) => (
                    <TableRow
                      key={rowKey(row, i)}
                      onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                      className={cn(
                        "border-white/40 transition hover:bg-white/60",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {columns.map((col) => (
                        <TableCell
                          key={col.id}
                          className={cn(
                            "py-3 text-[12.5px] font-medium text-foreground/90",
                            ALIGN[col.align ?? "start"],
                            col.hideOnMobile && "hidden md:table-cell",
                          )}
                        >
                          {col.cell(row, i)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </div>

      {isEmpty && emptyState ? <div className="p-4">{emptyState}</div> : null}
    </motion.div>
  );
}

export default GlassTable;
