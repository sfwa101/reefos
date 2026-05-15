import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Users, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AMOUNT_PRESETS = [500, 1000, 2000, 5000];
const DURATION_PRESETS = [6, 10, 12];

/**
 * GameyaCreationSheet — bottom-sheet form to open a new ROSCA circle.
 * Calls `create_gam_eya` RPC. Guarantor stays optional (the creator can
 * invite the guarantor later from the details sheet).
 */
export const GameyaCreationSheet = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(1000);
  const [members, setMembers] = useState<number>(6);
  const [busy, setBusy] = useState(false);

  const total = amount * members;
  const valid = name.trim().length >= 2 && amount > 0 && members >= 2;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const { data, error } = await FinanceGateway.createGameya({
      name: name.trim(),
      cycleAmount: amount,
      maxMembers: members,
      cycleDurationMonths: members,
    });
    setBusy(false);
    if (error || !data) {
      toast.error("تعذّر إنشاء الجمعية");
      return;
    }
    toast.success("تم فتح الجمعية بنجاح ✅");
    onCreated();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-card p-5 ring-1 ring-border/40 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-display text-lg font-extrabold">جمعية جديدة</h2>
            <p className="text-[11px] text-muted-foreground">
              ادّخار جماعي حلال · بلا فوائد
            </p>
          </div>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] font-bold text-muted-foreground">
            اسم الجمعية
          </span>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="جمعية رمضان"
            className="w-full rounded-xl bg-foreground/5 px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        <div className="mb-3">
          <span className="mb-1 block text-[11px] font-bold text-muted-foreground">
            القسط الشهري (ج.م)
          </span>
          <div className="grid grid-cols-4 gap-2">
            {AMOUNT_PRESETS.map((v) => (
              <Button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={`rounded-xl py-2.5 text-xs font-extrabold tabular-nums transition active:scale-95 ${
                  amount === v
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-foreground/5 text-foreground"
                }`}
              >
                {toLatin(v)}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="mb-1 block text-[11px] font-bold text-muted-foreground">
            مدة الجمعية (أشهر) — تساوي عدد الأعضاء
          </span>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_PRESETS.map((v: number) => (
              <Button
                key={v}
                type="button"
                onClick={() => setMembers(v)}
                className={`rounded-xl py-2.5 text-xs font-extrabold tabular-nums transition active:scale-95 ${
                  members === v
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-foreground/5 text-foreground"
                }`}
              >
                {toLatin(v)}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              المبلغ الذي ستستلمه في دورك
            </span>
            <span className="font-display text-base font-black tabular-nums text-primary">
              {toLatin(total)} ج.م
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-xl bg-foreground/5 p-2.5 text-[10px] leading-relaxed text-muted-foreground ring-1 ring-border/40">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            بعد فتح الجمعية يمكنك دعوة الأعضاء وتحديد الضامن من شاشة التفاصيل.
          </span>
        </div>

        <Button
          onClick={submit}
          disabled={!valid || busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          فتح الجمعية
        </Button>
      </motion.div>
    </motion.div>
  );
};
