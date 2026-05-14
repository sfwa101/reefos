/**
 * Salsabil OS — Phase 1 · Wave 6
 * Layer 6 (UI) · ShiftSettlementPanel.
 *
 * Cashier-facing blind-count panel. Strictly delegates settlement math
 * to the ShiftRuntime — does NOT compute expected totals or variance.
 */
import { useState } from "react";
import { useShiftRuntime } from "@/core/cashier/runtime/useShiftRuntime";
import type { ShiftSettlementResult } from "@/core/cashier/runtime/ShiftRuntime";

export function ShiftSettlementPanel() {
  const { snapshot, openShift, closeShift } = useShiftRuntime();
  const [openingInput, setOpeningInput] = useState("0");
  const [actualInput, setActualInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShiftSettlementResult | null>(null);

  const onOpen = () => {
    setError(null);
    const n = Number(openingInput);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a valid opening cash amount");
      return;
    }
    try {
      openShift({ startingCash: n });
      setResult(null);
      setActualInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open shift");
    }
  };

  const onClose = () => {
    setError(null);
    const n = Number(actualInput);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a valid drawer count");
      return;
    }
    try {
      const settlement = closeShift({ actualCash: n });
      setResult(settlement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close shift");
    }
  };

  if (snapshot.status !== "open") {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 space-y-3" dir="rtl">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-[18px]">تسوية الورديّة</h2>
          <span className="text-[11px] text-muted-foreground">
            {snapshot.status === "closed" ? "مغلقة" : "خاملة"}
          </span>
        </header>

        {result && <SettlementSummary result={result} />}

        <label className="block text-[12px] text-muted-foreground">رصيد افتتاحي</label>
        <input
          inputMode="decimal"
          value={openingInput}
          onChange={(e) => setOpeningInput(e.target.value)}
          className="w-full h-11 rounded-xl bg-muted px-3 font-mono text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="0.00"
        />
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        <button
          onClick={onOpen}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          فتح الورديّة
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 space-y-3" dir="rtl">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-[18px]">إغلاق الورديّة</h2>
        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
      </header>
      <p className="text-[11px] text-muted-foreground">
        أدخل العَدّ الفعلي للنقد. النظام يحسب المتوقَّع والفروقات تلقائياً.
      </p>
      <label className="block text-[12px] text-muted-foreground">العَدّ الفعلي للدُرج</label>
      <input
        inputMode="decimal"
        autoFocus
        value={actualInput}
        onChange={(e) => setActualInput(e.target.value)}
        className="w-full h-11 rounded-xl bg-muted px-3 font-mono text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder="0.00"
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <button
        onClick={onClose}
        disabled={actualInput === ""}
        className="w-full h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-50"
      >
        إغلاق الورديّة
      </button>
    </section>
  );
}

function SettlementSummary({ result }: { result: ShiftSettlementResult }) {
  const isOver = result.variance > 0;
  const isShort = result.variance < 0;
  return (
    <div className="rounded-xl bg-muted p-3 space-y-1.5 text-[12px]">
      <Row label="افتتاحي" value={result.startingCash.toFixed(2)} />
      <Row label="المتوقَّع" value={result.expectedCash.toFixed(2)} bold />
      <Row label="الفعلي" value={result.actualCash.toFixed(2)} />
      <div className="h-px bg-border my-1" />
      <Row
        label="الفرق"
        value={`${result.variance >= 0 ? "+" : ""}${result.variance.toFixed(2)}`}
        tone={isOver ? "success" : isShort ? "destructive" : "muted"}
        bold
      />
      {result.varianceTransaction && (
        <p className="text-[10px] text-muted-foreground pt-1">
          سُجِّل قيد تسوية: {result.varianceTransaction.transaction_id}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "success" | "destructive" | "muted";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "";
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${toneCls}`}>{value}</span>
    </div>
  );
}
