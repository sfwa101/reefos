import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { usePosEngine } from "@/apps/reef-al-madina/features/pos/hooks/usePosEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_pos/pos/close-shift")({
  component: PosCloseShift,
});

function PosCloseShift() {
  const e = usePosEngine();
  const navigate = useNavigate();
  const [actual, setActual] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (!e.shift) {
    return (
      <div dir="rtl" className="p-6 max-w-md mx-auto text-center">
        <p className="text-[13px] text-foreground-secondary mb-3">لا توجد ورديّة مفتوحة.</p>
        <Link to="/pos" className="text-[13px] text-primary hover:underline">→ العودة</Link>
      </div>
    );
  }

  const expected = (e.shift.opening_balance ?? 0) + (e.shift.total_sales ?? 0);

  const onClose = async () => {
    const n = Number(actual);
    if (Number.isNaN(n) || n < 0) return;
    setBusy(true);
    const res = await e.closeShift(n);
    setBusy(false);
    if (res) navigate({ to: "/pos" });
  };

  return (
    <div dir="rtl" className="p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <LockKeyhole className="h-5 w-5 text-primary" />
        <h1 className="font-display text-[20px]">إغلاق الورديّة</h1>
      </div>
      <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-2 text-[13px] mb-4">
        <Row label="الرصيد الافتتاحي" value={(e.shift.opening_balance ?? 0).toFixed(2)} />
        <Row label="إجمالي المبيعات" value={(e.shift.total_sales ?? 0).toFixed(2)} />
        <Row label="عدد الطلبات" value={String(e.shift.total_orders ?? 0)} />
        <div className="h-px bg-border/40 my-1" />
        <Row label="المتوقع في الدرج" value={expected.toFixed(2)} bold />
      </div>
      <label className="block text-[12px] text-foreground-secondary mb-1">المبلغ الفعلي في الدرج</label>
      <Input
        inputMode="decimal"
        value={actual}
        onChange={(ev) => setActual(ev.target.value)}
        className="w-full h-11 rounded-xl border border-border bg-background px-3 font-mono text-[15px] mb-3"
        placeholder="0.00"
      />
      <Button
        disabled={busy || actual === ""}
        onClick={onClose}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
      >
        {busy ? "جارٍ الإغلاق…" : "إغلاق الورديّة"}
      </Button>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-foreground-secondary">{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
