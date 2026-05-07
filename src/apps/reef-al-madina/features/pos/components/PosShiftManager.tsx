import { useState } from "react";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import { LogIn, LogOut, AlertTriangle, Loader2 } from "lucide-react";
import type { PosShift } from "../types/pos.types";

type Props = {
  shift: PosShift | null;
  loading: boolean;
  onOpen: (openingBalance: number) => Promise<PosShift | null>;
  onClose: (actualBalance: number) => Promise<PosShift | null>;
};

export function PosShiftManager({ shift, loading, onOpen, onClose }: Props) {
  const [opening, setOpening] = useState("0");
  const [actual, setActual] = useState("0");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center px-6" dir="rtl">
        <IOSCard className="w-full max-w-sm">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="font-display text-[22px] mb-1">افتح ورديّة جديدة</h2>
          <p className="text-[12px] text-foreground-secondary mb-4">أدخل رصيد الدُرج الافتتاحي لبدء البيع.</p>
          <label className="text-[12px] text-foreground-secondary block mb-1">رصيد افتتاحي (نقد)</label>
          <input
            type="number" inputMode="decimal" min="0" step="0.01"
            value={opening} onChange={(e) => setOpening(e.target.value)}
            className="w-full bg-surface-muted rounded-2xl h-12 px-4 text-[16px] num text-center font-display border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await onOpen(Number(opening) || 0); setBusy(false); }}
            className="mt-4 w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold press flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />} فتح الورديّة
          </button>
        </IOSCard>
      </div>
    );
  }

  // Active shift — render compact bar
  return <ActiveShiftBar shift={shift} actual={actual} setActual={setActual} onClose={onClose} busy={busy} setBusy={setBusy} />;
}

function ActiveShiftBar({ shift, actual, setActual, onClose, busy, setBusy }: {
  shift: PosShift;
  actual: string;
  setActual: (v: string) => void;
  onClose: (n: number) => Promise<PosShift | null>;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [closing, setClosing] = useState(false);
  const expected = Number(shift.opening_balance) + Number(shift.total_sales);

  return (
    <>
      <IOSCard className="!p-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <p className="text-[11px] text-foreground-tertiary">ورديّة مفتوحة</p>
            </div>
            <p className="font-display text-[16px] num">{fmtMoney(shift.total_sales)} <span className="text-[11px] text-foreground-tertiary">({shift.total_orders} طلب)</span></p>
          </div>
          <button
            onClick={() => setClosing(true)}
            className="h-10 px-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-[12px] flex items-center gap-1.5 press"
          >
            <LogOut className="h-4 w-4" /> إنهاء
          </button>
        </div>
      </IOSCard>

      {closing && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center px-6" dir="rtl">
          <IOSCard className="w-full max-w-sm">
            <div className="h-12 w-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="font-display text-[22px] mb-1">إغلاق الورديّة</h2>
            <p className="text-[12px] text-foreground-secondary mb-3">احسب نقد الدُرج الفعلي وأدخله.</p>
            <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
              <Stat label="افتتاحي" value={fmtMoney(shift.opening_balance)} />
              <Stat label="مبيعات" value={fmtMoney(shift.total_sales)} />
              <Stat label="متوقَّع" value={fmtMoney(expected)} highlight />
              <Stat label="عدد الطلبات" value={String(shift.total_orders)} />
            </div>
            <label className="text-[12px] text-foreground-secondary block mb-1">رصيد الدُرج الفعلي</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.01" autoFocus
              value={actual} onChange={(e) => setActual(e.target.value)}
              className="w-full bg-surface-muted rounded-2xl h-12 px-4 text-[16px] num text-center font-display border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setClosing(false)}
                className="flex-1 h-12 rounded-2xl bg-surface-muted font-semibold press"
              >إلغاء</button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await onClose(Number(actual) || 0);
                  setBusy(false);
                  if (res) setClosing(false);
                }}
                className="flex-1 h-12 rounded-2xl bg-destructive text-destructive-foreground font-semibold press flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />} إغلاق
              </button>
            </div>
          </IOSCard>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 ${highlight ? "bg-primary/10" : "bg-surface-muted"}`}>
      <p className="text-[10px] text-foreground-tertiary">{label}</p>
      <p className={`font-display text-[14px] num ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
