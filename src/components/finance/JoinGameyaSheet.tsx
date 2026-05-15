import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Lock, Sparkles, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import { toLatin } from "@/lib/format";
import type { OpenCircle, TrustScore } from "@/core/finance/hooks/useGameyas";
import { Button } from "@/components/ui/button";

/**
 * JoinGameyaSheet — Halal turn-picker.
 *
 * Halal engine rules:
 *  - Early turns (≤ max(2, n/3)) require trust_tier ≥ min_kyc_tier OR a guarantor.
 *  - Late turns reward the picker with a one-time discount on first installment.
 *
 * UI is fully theme-token driven (bg-card / text-foreground / bg-primary…)
 * so it adapts to every theme in ThemeContext.
 */
export const JoinGameyaSheet = ({
  circle,
  trust,
  onClose,
  onJoined,
}: {
  circle: OpenCircle;
  trust: TrustScore;
  onClose: () => void;
  onJoined: () => void;
}) => {
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const earlyThreshold = Math.max(2, Math.floor(circle.max_members / 3));
  const minTier = circle.min_kyc_tier ?? 0;

  // Pre-compute per-turn metadata: { taken / locked / reward }.
  const turns = useMemo(() => {
    return Array.from({ length: circle.max_members }).map((_, i) => {
      const n = i + 1;
      const taken = n <= circle.members_count;
      const isEarly = n <= earlyThreshold;
      const lacksTrust = trust.tier < minTier;
      const locked = !taken && isEarly && lacksTrust;
      const isLate = n > circle.max_members - earlyThreshold;
      const reward = isLate && circle.reward_pool > 0
        ? Math.round((circle.reward_pool / earlyThreshold) * 100) / 100
        : 0;
      return { n, taken, locked, reward };
    });
  }, [circle, earlyThreshold, minTier, trust.tier]);

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    const { error } = await FinanceGateway.joinGameya({
      circleId: circle.id,
      turnNumber: picked,
    });
    setBusy(false);
    if (error) {
      const map: Record<string, string> = {
        guarantor_required: "هذا الدور يتطلب ضامناً أو رصيد ثقة أعلى",
        turn_taken: "تم حجز هذا الدور للتو",
        invalid_turn: "دور غير صالح",
        circle_not_found: "الجمعية غير متاحة",
        unauthorized: "يرجى تسجيل الدخول",
      };
      toast.error(map[error.message] ?? "تعذّر الانضمام");
      return;
    }
    toast.success("تم انضمامك إلى الجمعية ✅");
    onJoined();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-card text-card-foreground p-5 ring-1 ring-border/50 shadow-2xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
      >
        {/* header */}
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-label="إغلاق"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold truncate">{circle.name}</h2>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              قسط {toLatin(circle.cycle_amount)} ج · {toLatin(circle.max_members)} أعضاء
            </p>
          </div>
        </div>

        {/* trust strip */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[11px] font-bold text-foreground">ثقتك الحالية</p>
              <p className="text-[10px] text-muted-foreground">
                المطلوب لهذه الجمعية: المستوى {toLatin(minTier)}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-extrabold text-primary-foreground tabular-nums">
            مستوى {toLatin(trust.tier)}
          </span>
        </div>

        {/* turns grid */}
        <p className="mb-2 text-[11px] font-bold text-muted-foreground">اختر دورك</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {turns.map((t) => {
            const selected = picked === t.n;
            const disabled = t.taken || t.locked;
            return (
              <Button
                key={t.n}
                type="button"
                disabled={disabled}
                onClick={() => setPicked(t.n)}
                className={`relative flex flex-col items-center justify-center rounded-2xl py-3 text-xs font-extrabold tabular-nums ring-1 transition active:scale-95 ${
                  selected
                    ? "bg-primary text-primary-foreground ring-primary shadow-md"
                    : disabled
                      ? "bg-muted text-muted-foreground/50 ring-border/30 cursor-not-allowed"
                      : "bg-background text-foreground ring-border hover:ring-primary/40"
                }`}
              >
                <span className="text-[13px]">{toLatin(t.n)}</span>
                {t.taken ? (
                  <span className="text-[8.5px] mt-0.5 opacity-70">محجوز</span>
                ) : t.locked ? (
                  <Lock className="mt-1 h-3 w-3" />
                ) : t.reward > 0 ? (
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[8.5px] text-primary">
                    <Sparkles className="h-2.5 w-2.5" />-{toLatin(t.reward)}
                  </span>
                ) : (
                  <span className="text-[8.5px] mt-0.5 opacity-50">متاح</span>
                )}
              </Button>
            );
          })}
        </div>

        {/* footnote */}
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-muted p-2.5 text-[10px] leading-relaxed text-muted-foreground ring-1 ring-border/40">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            الأدوار المبكرة محصّنة بنظام الضامن الشرعي. الأدوار المتأخرة تحصل على مكافأة من حصّالة الجمعية بدون فوائد ربوية.
          </span>
        </div>

        <Button
          onClick={submit}
          disabled={!picked || busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          انضم إلى الجمعية
        </Button>
      </motion.div>
    </motion.div>
  );
};
