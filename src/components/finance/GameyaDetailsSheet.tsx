import { motion } from "framer-motion";
import {
  ChevronLeft,
  Crown,
  Loader2,
  ShieldCheck,
  Check,
  Clock,
  Calendar,
} from "lucide-react";
import { toLatin } from "@/lib/format";
import { useGameyaDetails, type GameyaCircle } from "@/core/finance/hooks/useGameyas";
import { Button } from "@/components/ui/button";

/**
 * GameyaDetailsSheet — full transparency view for a single circle.
 * Shows the ordered turn list (who got paid, who is current, who is next)
 * and a countdown to the next installment due date.
 */
export const GameyaDetailsSheet = ({
  circle,
  currentUserId,
  onClose,
}: {
  circle: GameyaCircle;
  currentUserId: string | null;
  onClose: () => void;
}) => {
  const { members, installments, loading } = useGameyaDetails(circle.id);

  const nextInstallment = installments
    .filter((i) => i.user_id === currentUserId && i.status === "pending")
    .sort((a, b) => a.cycle_index - b.cycle_index)[0];
  const daysToNext = nextInstallment
    ? Math.max(
        0,
        Math.ceil(
          (new Date(nextInstallment.due_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

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
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-card ring-1 ring-border/40 shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/50 p-5">
          <Button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-extrabold">
              {circle.name}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              قسط {toLatin(circle.cycle_amount)} ج.م ·{" "}
              {toLatin(circle.max_members)} أعضاء
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
              circle.status === "active"
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-amber-500/15 text-amber-500"
            }`}
          >
            {circle.status === "active" ? "نشطة" : "بانتظار الاكتمال"}
          </span>
        </div>

        {/* Hero stat: my turn + countdown */}
        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
            <p className="text-[10px] font-bold text-muted-foreground">دورك</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-primary">
              {toLatin(circle.my_turn)}
              <span className="ms-1 text-xs text-muted-foreground">
                / {toLatin(circle.max_members)}
              </span>
            </p>
          </div>
          <div className="rounded-2xl bg-accent/10 p-3 ring-1 ring-accent/20">
            <p className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <Calendar className="h-3 w-3" />
              القسط القادم
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums">
              {daysToNext === null ? "—" : `${toLatin(daysToNext)} ي`}
            </p>
          </div>
        </div>

        {/* Turn order */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            ترتيب الأدوار
          </h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <ol className="space-y-2">
              {members.map((m) => {
                const isPast = m.turn_number < circle.current_cycle_index;
                const isCurrent = m.turn_number === circle.current_cycle_index;
                const isMe = m.user_id === currentUserId;
                return (
                  <li
                    key={m.id}
                    className={`relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 ring-1 transition ${
                      isCurrent
                        ? "bg-primary/10 ring-primary/30"
                        : isPast
                          ? "bg-muted/30 ring-border/40 opacity-75"
                          : "bg-card/50 ring-border/40"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-black tabular-nums ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isPast
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-foreground/5 text-foreground"
                      }`}
                    >
                      {isPast ? <Check className="h-4 w-4" /> : toLatin(m.turn_number)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-extrabold">
                        {m.full_name || `عضو #${toLatin(m.turn_number)}`}
                        {isMe && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
                            أنت
                          </span>
                        )}
                        {m.is_trusted && (
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isPast
                          ? "استلم نصيبه"
                          : isCurrent
                            ? "الدور الحالي · يستلم هذا الشهر"
                            : "بانتظار دوره"}
                      </p>
                    </div>
                    {isCurrent && (
                      <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    {!isPast && !isCurrent && (
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
