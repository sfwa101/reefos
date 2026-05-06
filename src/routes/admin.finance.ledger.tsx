import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ArrowLeft, BookOpenCheck, Search } from "lucide-react";
import { useLedgerQuery, type LedgerEntry } from "@/hooks/useTayseer";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import TransferForm from "@/pages/admin/finance/TransferForm";

function TayseerLedgerPage() {
  const [walletId, setWalletId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = useMemo(
    () => ({
      walletId: walletId.trim() || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      pageSize: 100,
    }),
    [walletId, from, to],
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useLedgerQuery(filters);

  const rows: LedgerEntry[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.rows),
    [data],
  );
  const total = data?.pages?.[0]?.total ?? 0;

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  // Auto-fetch next page when scrolled near bottom
  const items = rowVirtualizer.getVirtualItems();
  const last = items[items.length - 1];
  if (last && hasNextPage && !isFetchingNextPage && last.index >= rows.length - 10) {
    void fetchNextPage();
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Link to="/admin/finance" className="p-2 -ml-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-primary" />
            Tayseer Ledger
          </h1>
          <p className="text-[11px] text-foreground-tertiary">
            {fmtNum(total)} entries · double-entry oversight
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-2 bg-card/40 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <Input
            placeholder="Wallet ID (uuid)"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="pl-9 font-mono text-xs"
          />
        </div>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {/* Column header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-foreground-tertiary border-b border-border/30 bg-background/60 sticky top-[57px] z-10">
        <div className="col-span-3 hidden md:block">Wallet</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-1">Cur</div>
        <div className="col-span-3 hidden md:block">Description</div>
        <div className="col-span-3">Group / Time</div>
      </div>

      {/* Virtualized list */}
      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-foreground-tertiary">
          <BookOpenCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No ledger entries match these filters.
        </div>
      ) : (
        <div ref={parentRef} className="overflow-auto" style={{ height: "calc(100dvh - 180px)" }}>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {items.map((vRow) => {
              const r = rows[vRow.index];
              const isCredit = r.amount > 0;
              return (
                <div
                  key={r.id}
                  className="absolute top-0 left-0 w-full grid grid-cols-12 gap-2 items-center px-4 border-b border-border/30 hover:bg-muted/40 text-sm"
                  style={{
                    transform: `translateY(${vRow.start}px)`,
                    height: `${vRow.size}px`,
                  }}
                >
                  <div className="col-span-3 hidden md:block font-mono text-[11px] truncate">
                    {r.wallet_id}
                  </div>
                  <div
                    className={cn(
                      "col-span-2 font-display num font-semibold",
                      isCredit ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {isCredit ? "+" : ""}
                    {fmtNum(r.amount)}
                  </div>
                  <div className="col-span-1 text-xs text-foreground-tertiary">{r.currency}</div>
                  <div className="col-span-3 hidden md:block truncate text-foreground-secondary">
                    {r.description ?? "—"}
                  </div>
                  <div className="col-span-3 text-[11px] text-foreground-tertiary">
                    <div className="font-mono truncate">{r.transaction_group_id.slice(0, 8)}…</div>
                    <div>{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {isFetchingNextPage && (
            <div className="p-3 text-center text-xs text-foreground-tertiary">Loading more…</div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/finance/ledger")({
  component: TayseerLedgerPage,
});
