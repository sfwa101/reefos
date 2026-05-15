import { useMemo, useState } from "react";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import { Banknote, Delete, Zap } from "lucide-react";
import { ZeroFrictionButton } from "@/components/ui/ZeroFrictionButton";
import { Button } from "@/components/ui/button";

type Props = {
  total: number;
  itemCount: number;
  disabled?: boolean;
  onPay: (tendered: number) => Promise<{ change: number; total: number } | null>;
};

const QUICK = [50, 100, 200, 500, 1000];

const vibrate = (p: number | number[]) => {
  try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p); } catch { /* noop */ }
};

/**
 * Phase 63 — Sovereign Cashier QuickPay.
 * • Zero-Friction confirm button (haptic + hold-guard for >200 ج.م).
 * • One-tap "ادفع بالضبط" merges tender + confirm into a single action.
 * • Pure semantic tokens (no gradients, no legacy iOS tokens).
 */
export function PosQuickPay({ total, itemCount, disabled, onPay }: Props) {
  const [tendered, setTendered] = useState("");
  const [busy, setBusy] = useState(false);
  const tNum = Number(tendered) || 0;
  const change = useMemo(() => Math.max(0, tNum - total), [tNum, total]);
  const insufficient = tNum < total;

  const press = (k: string) => {
    vibrate(8);
    setTendered(prev => {
      if (k === "C") return "";
      if (k === "<") return prev.slice(0, -1);
      if (k === "." && prev.includes(".")) return prev;
      return (prev + k).slice(0, 9);
    });
  };

  const exactPay = async () => {
    if (disabled || busy || total <= 0) return;
    vibrate([15, 40, 15]);
    setBusy(true);
    const res = await onPay(total);
    setBusy(false);
    if (res) setTendered("");
  };

  const submit = async () => {
    if (disabled || busy || total <= 0 || insufficient) return;
    setBusy(true);
    const res = await onPay(tNum);
    setBusy(false);
    if (res) setTendered("");
  };

  const keys = ["1","2","3","4","5","6","7","8","9",".","0","<"];

  return (
    <IOSCard className="!p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-muted-foreground">الإجمالي ({itemCount} قطعة)</p>
        <p className="font-display text-[28px] num text-primary">{fmtMoney(total)}</p>
      </div>

      {/* ⚡ One-tap exact-pay shortcut — the 90% case */}
      <Button
        onClick={exactPay}
        disabled={disabled || busy || total <= 0}
        className="w-full mb-3 h-12 rounded-2xl bg-secondary text-secondary-foreground font-display text-[15px] flex items-center justify-center gap-2 press disabled:opacity-50 ring-1 ring-border"
      >
        <Zap className="h-4 w-4" />
        ادفع بالضبط · {fmtMoney(total)}
      </Button>

      <div className="bg-muted rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">المدفوع</span>
          <span className="font-display text-[22px] num">{tendered || "0"}</span>
        </div>
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground">الباقي</span>
          <span className={`font-display text-[18px] num ${change > 0 ? "text-success" : ""}`}>{fmtMoney(change)}</span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-2 overflow-x-auto">
        {QUICK.map(v => (
          <Button
            key={v}
            onClick={() => { vibrate(10); setTendered(String(v)); }}
            disabled={disabled}
            className="shrink-0 h-9 px-3 rounded-xl bg-muted text-foreground text-[12px] font-semibold press num"
          >
            {v}
          </Button>
        ))}
        <Button
          onClick={() => { vibrate(10); setTendered(""); }}
          disabled={disabled}
          className="shrink-0 h-9 px-3 rounded-xl bg-destructive/10 text-destructive text-[12px] font-semibold press"
        >
          مسح
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {keys.map(k => (
          <Button
            key={k}
            onClick={() => press(k)}
            disabled={disabled}
            className="h-12 rounded-xl bg-muted text-foreground font-display text-[18px] num press flex items-center justify-center disabled:opacity-50"
          >
            {k === "<" ? <Delete className="h-4 w-4" /> : k}
          </Button>
        ))}
      </div>

      <ZeroFrictionButton
        amount={tNum}
        onPay={submit}
        isPending={busy}
        disabled={!!disabled || total === 0 || insufficient}
        label={
          busy
            ? "جاري الدفع..."
            : insufficient && total > 0
              ? "أدخل المبلغ المدفوع"
              : tNum > 200
                ? `اضغط مطوّلاً لتأكيد · ${fmtMoney(tNum)}`
                : `تأكيد الدفع · ${fmtMoney(tNum)}`
        }
      />
      {!insufficient && total > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Banknote className="h-3.5 w-3.5" />
          الباقي للعميل: <span className="num font-bold text-foreground">{fmtMoney(change)}</span>
        </div>
      )}
    </IOSCard>
  );
}
