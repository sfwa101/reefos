import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, ShieldCheck, Crown, ChevronRight, Loader2 } from "lucide-react";
import { toLatin } from "@/lib/format";
import { useGameyas, type GameyaCircle } from "@/core/finance/hooks/useGameyas";
import { GameyaCreationSheet } from "./GameyaCreationSheet";
import { GameyaDetailsSheet } from "./GameyaDetailsSheet";
import { Button } from "@/components/ui/button";

/**
 * GameyasTab — Live list of cooperative circles + entry points to the
 * create / details bottom-sheets. All copy in Arabic, KYC-aware via
 * the parent dashboard.
 */
export const GameyasTab = ({ userId }: { userId: string | null }) => {
  const { circles, loading, refresh } = useGameyas(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<GameyaCircle | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-background p-5 ring-1 ring-border/50">
        <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25 backdrop-blur-md">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-black tracking-tight">
              الجمعيات التعاونية
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ادّخر مع أهل بلدك بنظام الضامن التكافلي · بلا فوائد ربوية.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="relative mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2.5 text-xs font-extrabold text-primary-foreground shadow-md ring-1 ring-primary/40 transition active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          فتح جمعية جديدة
        </Button>
        <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-foreground/5 p-2.5 text-[10px] text-muted-foreground ring-1 ring-border/40">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>محمية بالضامن التكافلي · بلا غرامات تأخير</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : circles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
          <p className="text-xs font-semibold text-muted-foreground">
            لا توجد جمعيات نشطة بعد
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            ابدأ جمعية وادعُ أصدقاءك للانضمام
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {circles.map((c) => (
            <CircleRow key={c.id} circle={c} onOpen={() => setSelected(c)} />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {showCreate && (
          <GameyaCreationSheet
            onClose={() => setShowCreate(false)}
            onCreated={refresh}
          />
        )}
        {selected && (
          <GameyaDetailsSheet
            circle={selected}
            currentUserId={userId}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CircleRow = ({
  circle,
  onOpen,
}: {
  circle: GameyaCircle;
  onOpen: () => void;
}) => {
  const isMyTurn = circle.my_turn === circle.current_cycle_index;
  const total = Number(circle.cycle_amount) * Number(circle.max_members);
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-start ring-1 ring-border/50 transition hover:ring-primary/40"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          isMyTurn
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        {isMyTurn ? <Crown className="h-5 w-5" /> : <Users className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{circle.name}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          قسط {toLatin(circle.cycle_amount)} ج · دورك{" "}
          {toLatin(circle.my_turn)}/{toLatin(circle.max_members)}
        </p>
      </div>
      <div className="text-end">
        <p className="font-display text-sm font-black tabular-nums text-primary">
          {toLatin(total)}
        </p>
        <p className="text-[9px] text-muted-foreground">إجمالي نصيبك</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </motion.button>
  );
};
