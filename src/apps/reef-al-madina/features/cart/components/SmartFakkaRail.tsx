import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useFakkaCalculator } from "../hooks/useFakkaCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  title: string;
  emoji: string;
  /** Subtotal + already-picked upstream extras (interlocking input) */
  runningTotal: number;
  /** Currently selected amount (controlled) */
  value: number;
  onChange: (amount: number) => void;
  /** Optional dropdown e.g. charity causes */
  causes?: readonly { id: string; label: string }[];
  selectedCause?: string;
  onCauseChange?: (id: string) => void;
  accent?: "primary" | "rose";
};

/**
 * SmartFakkaRail — horizontal rail of smart "round-up" suggestions.
 * Used by both Team Bonus and Charity Box in the CheckoutSheet.
 */
export const SmartFakkaRail = ({
  title,
  emoji,
  runningTotal,
  value,
  onChange,
  causes,
  selectedCause,
  onCauseChange,
  accent = "primary",
}: Props) => {
  const rail = useFakkaCalculator(runningTotal);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStr, setCustomStr] = useState("");

  const isCustomActive =
    value > 0 && !rail.suggestions.some((s) => s.amount === value);

  const activeClasses =
    accent === "rose"
      ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_6px_18px_-6px_rgba(244,63,94,0.55)]"
      : "bg-gradient-to-br from-primary to-[hsl(150_55%_38%)] text-primary-foreground shadow-[0_6px_18px_-6px_hsl(150_60%_40%/0.55)]";

  const applyCustom = () => {
    const n = Math.max(0, Math.round(Number(customStr) || 0));
    onChange(n);
    setCustomOpen(false);
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.1)] ring-1 ring-border/30">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">
          {title} <span className="ms-1">{emoji}</span>
        </p>
        <span className="text-xs font-extrabold text-primary tabular-nums">
          {value > 0 ? fmtMoney(value) : "اختياري"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {/* Zero */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={() => onChange(0)}
          className={`rounded-[12px] py-2.5 text-[11px] font-extrabold transition ${
            value === 0 ? activeClasses : "bg-foreground/5"
          }`}
        >
          {rail.zero.label}
        </motion.button>

        {/* Smart suggestions (up to 3) */}
        {rail.suggestions.map((s) => {
          const active = value === s.amount;
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              key={`${s.amount}-${s.step}`}
              onClick={() => onChange(s.amount)}
              className={`rounded-[12px] py-2.5 text-[10.5px] font-extrabold leading-tight transition tabular-nums ${
                active ? activeClasses : "bg-foreground/5"
              }`}
            >
              {s.label}
            </motion.button>
          );
        })}

        {/* Custom */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={() => {
            setCustomOpen((v) => !v);
            setCustomStr(isCustomActive ? String(value) : "");
          }}
          className={`flex items-center justify-center gap-1 rounded-[12px] py-2.5 text-[10.5px] font-extrabold transition ${
            isCustomActive ? activeClasses : "bg-foreground/5"
          }`}
        >
          <Pencil className="h-3 w-3" />
          {isCustomActive ? `${value} ج` : "مخصص"}
        </motion.button>
      </div>

      {customOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 overflow-hidden"
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={customStr}
              onChange={(e) => setCustomStr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              placeholder="أدخل المبلغ"
              className="flex-1 rounded-xl bg-foreground/5 px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              type="button"
              onClick={applyCustom}
              className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-extrabold text-background"
            >
              تأكيد
            </Button>
          </div>
        </motion.div>
      )}

      {causes && causes.length > 0 && value > 0 && onCauseChange && (
        <div className="mt-3">
          <label className="mb-1.5 block text-[10px] font-bold text-muted-foreground">
            وجّه تبرعك إلى
          </label>
          <Select
            value={selectedCause ?? causes[0].id}
            onValueChange={onCauseChange}
            dir="rtl"
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-foreground/5 text-sm font-bold focus:ring-2 focus:ring-rose-400/40">
              <SelectValue placeholder="اختر باب التبرع" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {causes.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="text-sm font-bold"
                >
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
