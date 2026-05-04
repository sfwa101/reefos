import { memo } from "react";

interface Props {
  planTitle: string;
  durLabel: string;
  filledCount: number;
  totalDays: number;
  slot: string;
  totalPrice: number;
}

const SummaryCTA = memo(function SummaryCTA({
  planTitle, durLabel, filledCount, totalDays, slot, totalPrice,
}: Props) {
  const disabled = filledCount === 0;
  return (
    <section className="glass-strong space-y-3 rounded-[1.5rem] p-4 shadow-float">
      <div className="space-y-1">
        <Row label="الباقة" value={planTitle} />
        <Row label="المدة" value={durLabel} />
        <Row label="الوجبات المختارة" value={`${filledCount}/${totalDays}`} mono />
        <Row label="التوصيل" value={slot} />
      </div>
      <div className="flex items-baseline justify-between border-t border-border pt-2">
        <span className="font-display text-sm font-bold">الإجمالي</span>
        <span className="font-display text-2xl font-extrabold text-primary tabular-nums">
          {totalPrice} ج.م
        </span>
      </div>
      <button
        disabled={disabled}
        className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-pill transition disabled:opacity-50"
      >
        {disabled ? "اختر وجبات الأسبوع أولاً" : "ابدأ اشتراكك الآن"}
      </button>
    </section>
  );
});

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${mono ? "tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}

export default SummaryCTA;
