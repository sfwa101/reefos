import { useMemo, useState } from "react";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import { Banknote, Delete, CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  total: number;
  itemCount: number;
  disabled?: boolean;
  onPay: (tendered: number) => Promise<{ change: number; total: number } | null>;
};

const QUICK = [50, 100, 200, 500, 1000];

export function PosQuickPay({ total, itemCount, disabled, onPay }: Props) {
  const [tendered, setTendered] = useState("");
  const [busy, setBusy] = useState(false);
  const tNum = Number(tendered) || 0;
  const change = useMemo(() => Math.max(0, tNum - total), [tNum, total]);
  const insufficient = tNum < total;

  const press = (k: string) => {
    setTendered(prev => {
      if (k === "C") return "";
      if (k === "<") return prev.slice(0, -1);
      if (k === "." && prev.includes(".")) return prev;
      return (prev + k).slice(0, 9);
    });
  };

  const exact = () => setTendered(total.toFixed(2));

  const submit = async () => {
    setBusy(true);
    const res = await onPay(tNum);
    setBusy(false);
    if (res) setTendered("");
  };

  const keys = ["1","2","3","4","5","6","7","8","9",".","0","<"];

  return (
    <IOSCard className="!p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-foreground-tertiary">الإجمالي ({itemCount} قطعة)</p>
        <p className="font-display text-[28px] num text-primary">{fmtMoney(total)}</p>
      </div>

      <div className="bg-surface-muted rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground-tertiary">المدفوع</span>
          <span className="font-display text-[22px] num">{tendered || "0"}</span>
        </div>
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40">
          <span className="text-[11px] text-foreground-tertiary">الباقي</span>
          <span className={`font-display text-[18px] num ${change > 0 ? "text-success" : ""}`}>{fmtMoney(change)}</span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-2 overflow-x-auto">
        <button onClick={exact} disabled={disabled} className="shrink-0 h-9 px-3 rounded-xl bg-primary/10 text-primary text-[12px] font-semibold press">بالضبط</button>
        {QUICK.map(v => (
          <button key={v} onClick={() => setTendered(String(v))} disabled={disabled} className="shrink-0 h-9 px-3 rounded-xl bg-surface-muted text-[12px] font-semibold press num">
            {v}
          </button>
        ))}
        <button onClick={() => press("C")} disabled={disabled} className="shrink-0 h-9 px-3 rounded-xl bg-destructive/10 text-destructive text-[12px] font-semibold press">مسح</button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {keys.map(k => (
          <button
            key={k}
            onClick={() => press(k)}
            disabled={disabled}
            className="h-12 rounded-xl bg-surface-muted font-display text-[18px] num press flex items-center justify-center disabled:opacity-50"
          >
            {k === "<" ? <Delete className="h-4 w-4" /> : k}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={disabled || busy || total === 0 || insufficient}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-success to-teal text-success-foreground font-display text-[18px] flex items-center justify-center gap-2 press disabled:opacity-50 disabled:from-surface-muted disabled:to-surface-muted disabled:text-foreground-tertiary"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Banknote className="h-5 w-5" />}
        {insufficient && total > 0 ? "أدخل المدفوع" : "تأكيد الدفع"}
        {!insufficient && total > 0 && <CheckCircle2 className="h-5 w-5" />}
      </button>
    </IOSCard>
  );
}
