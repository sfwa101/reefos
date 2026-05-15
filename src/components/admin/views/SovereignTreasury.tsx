/**
 * Phase 11.1 — The Imperial Treasury.
 * Admin-wide rollup of `salsabil_vendor_settlements` joined with vendor names.
 * Surfaces total platform fees (Empire profit), pending net (vendor liabilities),
 * cleared net (paid out), and provides per-vendor fund clearance via
 * `clear_sovereign_settlements`.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listVendorSettlementsFn, clearSovereignSettlementsFn } from "@/core/system/sovereign.functions";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import { Loader2, Crown, Hourglass, Banknote, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type SettlementRow = {
  id: string;
  vendor_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  vendor: { business_name: string | null } | null;
};

type VendorRollup = {
  vendor_id: string;
  vendor_name: string;
  pending_net: number;
  cleared_net: number;
  pending_count: number;
};

const QKEY = ["admin", "sovereign-treasury"] as const;

export default function SovereignTreasury() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QKEY,
    queryFn: async (): Promise<SettlementRow[]> => {
      const rows = await listVendorSettlementsFn();
      return (rows ?? []) as SettlementRow[];
    },
  });

  const totals = useMemo(() => {
    const rows = data ?? [];
    return {
      empireFees: rows.reduce((s, r) => s + Number(r.platform_fee ?? 0), 0),
      pendingNet: rows
        .filter((r) => r.status === "pending_clearance")
        .reduce((s, r) => s + Number(r.net_amount ?? 0), 0),
      clearedNet: rows
        .filter((r) => r.status === "cleared")
        .reduce((s, r) => s + Number(r.net_amount ?? 0), 0),
    };
  }, [data]);

  const rollup = useMemo<VendorRollup[]>(() => {
    const rows = data ?? [];
    const map = new Map<string, VendorRollup>();
    for (const r of rows) {
      const cur = map.get(r.vendor_id) ?? {
        vendor_id: r.vendor_id,
        vendor_name: r.vendor?.business_name ?? r.vendor_id.slice(0, 8),
        pending_net: 0,
        cleared_net: 0,
        pending_count: 0,
      };
      if (r.status === "pending_clearance") {
        cur.pending_net += Number(r.net_amount ?? 0);
        cur.pending_count += 1;
      } else if (r.status === "cleared") {
        cur.cleared_net += Number(r.net_amount ?? 0);
      }
      map.set(r.vendor_id, cur);
    }
    return [...map.values()].sort((a, b) => b.pending_net - a.pending_net);
  }, [data]);

  const clearMut = useMutation({
    mutationFn: async (vendorId: string) => {
      return await clearSovereignSettlementsFn({ data: { vendor_id: vendorId } });
    },
    onSuccess: (count) => {
      toast.success(`تم صرف المستحقات بنجاح (${count})`);
      qc.invalidateQueries({ queryKey: QKEY });
    },
    onError: (e: Error) => toast.error(e.message || "فشل الصرف"),
  });

  if (isLoading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-warning" />
        <h1 className="font-display text-[22px]">خزانة الإمبراطورية</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <IOSCard className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          <Crown className="h-5 w-5 mb-1 opacity-90" />
          <p className="text-[12px] opacity-80">إجمالي أرباح الإمبراطورية</p>
          <p className="font-display text-[26px] num leading-tight">
            {fmtMoney(totals.empireFees)}
          </p>
        </IOSCard>
        <IOSCard>
          <Hourglass className="h-5 w-5 text-warning mb-1" />
          <p className="text-[12px] text-foreground-tertiary">مستحقات التجار المعلقة</p>
          <p className="font-display text-[22px] num">{fmtMoney(totals.pendingNet)}</p>
        </IOSCard>
        <IOSCard>
          <Banknote className="h-5 w-5 text-success mb-1" />
          <p className="text-[12px] text-foreground-tertiary">الأموال المصروفة</p>
          <p className="font-display text-[22px] num">{fmtMoney(totals.clearedNet)}</p>
        </IOSCard>
      </div>

      <div>
        <h2 className="font-display text-[16px] mb-2">التجار</h2>
        {rollup.length === 0 ? (
          <IOSCard className="text-center text-foreground-tertiary text-[13px] py-8">
            لا توجد تسويات بعد.
          </IOSCard>
        ) : (
          <div className="space-y-2">
            {rollup.map((v) => (
              <IOSCard key={v.vendor_id} className="!p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] truncate">{v.vendor_name}</p>
                    <div className="flex gap-3 text-[11px] text-foreground-tertiary mt-0.5">
                      <span>
                        معلّق:{" "}
                        <b className="num text-warning">{fmtMoney(v.pending_net)}</b>
                      </span>
                      <span>
                        مصروف:{" "}
                        <b className="num text-success">{fmtMoney(v.cleared_net)}</b>
                      </span>
                    </div>
                  </div>
                  {v.pending_count > 0 && (
                    <Button
                      type="button"
                      disabled={clearMut.isPending}
                      onClick={() => clearMut.mutate(v.vendor_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-success text-[12px] font-semibold hover:bg-success/25 transition-colors disabled:opacity-50"
                    >
                      {clearMut.isPending && clearMut.variables === v.vendor_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      صرف المستحقات
                    </Button>
                  )}
                </div>
              </IOSCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
