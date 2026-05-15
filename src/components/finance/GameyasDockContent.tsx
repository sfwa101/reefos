import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Crown,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toLatin } from "@/lib/format";
import {
  useGameyas,
  useOpenCircles,
  useTrustScore,
  type GameyaCircle,
  type OpenCircle,
} from "@/core/finance/hooks/useGameyas";
import { GameyaCreationSheet } from "./GameyaCreationSheet";
import { GameyaDetailsSheet } from "./GameyaDetailsSheet";
import { JoinGameyaSheet } from "./JoinGameyaSheet";
import { Button } from "@/components/ui/button";

/**
 * GameyasDockContent — Money-Fellows-style dock for the new Wallet.
 *
 * Strict theming: every color is a semantic token (bg-card, text-foreground,
 * bg-primary…) so the dock adapts to all 10 ThemeContext palettes
 * (sage / ocean / amber / midnight / blush / lavender / mint / peach / plum / navy)
 * in both light and dark modes.
 *
 * Sections:
 *  1. Trust score (credit-limit) — primary-tinted hero card.
 *  2. Open circles (discover) — horizontal-snap cards.
 *  3. My circles — list with next-installment countdown.
 */
export const GameyasDockContent = ({ userId }: { userId: string | null }) => {
  const { trust } = useTrustScore(userId);
  const { circles: mine, loading: loadingMine, refresh: refreshMine } = useGameyas(userId);
  const { circles: open, loading: loadingOpen, refresh: refreshOpen } = useOpenCircles();

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<GameyaCircle | null>(null);
  const [joining, setJoining] = useState<OpenCircle | null>(null);

  const trustPct = Math.min(100, Math.round((trust.score / 1000) * 100));
  const creditLimit = Math.max(500, trust.tier * 2500);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* 1) TRUST SCORE HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/25">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold tracking-[0.18em] uppercase text-primary/80">
              REEF · TRUST
            </p>
            <h3 className="mt-0.5 font-display text-2xl font-black tabular-nums text-foreground">
              {toLatin(trust.score)} <span className="text-xs font-bold opacity-60">/ 1000</span>
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              مستوى {toLatin(trust.tier)} · حد ائتمان {toLatin(creditLimit)} ج
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-extrabold text-primary-foreground">
            <ShieldCheck className="h-3 w-3" />
            {trust.is_trusted ? "موثوق" : "مبتدئ"}
          </span>
        </div>

        {/* progress */}
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${trustPct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>

        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="relative mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2.5 text-xs font-extrabold text-primary-foreground shadow-md ring-1 ring-primary/40 transition active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          فتح جمعية جديدة
        </Button>
      </section>

      {/* 2) OPEN CIRCLES — DISCOVER */}
      <section>
        <header className="mb-2 flex items-center justify-between">
          <h4 className="font-display text-sm font-extrabold text-foreground">
            جمعيات مفتوحة
          </h4>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            {toLatin(open.length)} متاحة
          </span>
        </header>

        {loadingOpen ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : open.length === 0 ? (
          <EmptyCard label="لا توجد جمعيات مفتوحة حالياً" />
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 px-1 scrollbar-none">
            {open.map((c) => (
              <OpenCircleCard
                key={c.id}
                circle={c}
                trustTier={trust.tier}
                onJoin={() => setJoining(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3) MY CIRCLES */}
      <section>
        <header className="mb-2 flex items-center justify-between">
          <h4 className="font-display text-sm font-extrabold text-foreground">جمعياتي</h4>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            {toLatin(mine.length)} نشطة
          </span>
        </header>

        {loadingMine ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : mine.length === 0 ? (
          <EmptyCard label="لم تنضم إلى أي جمعية بعد" />
        ) : (
          <ul className="space-y-2">
            {mine.map((c) => (
              <MyCircleRow key={c.id} circle={c} onOpen={() => setSelected(c)} />
            ))}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {showCreate && (
          <GameyaCreationSheet
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              refreshMine();
              refreshOpen();
            }}
          />
        )}
        {selected && (
          <GameyaDetailsSheet
            circle={selected}
            currentUserId={userId}
            onClose={() => setSelected(null)}
          />
        )}
        {joining && (
          <JoinGameyaSheet
            circle={joining}
            trust={trust}
            onClose={() => setJoining(null)}
            onJoined={() => {
              refreshMine();
              refreshOpen();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const EmptyCard = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
  </div>
);

const OpenCircleCard = ({
  circle,
  trustTier,
  onJoin,
}: {
  circle: OpenCircle;
  trustTier: number;
  onJoin: () => void;
}) => {
  const seatsLeft = circle.max_members - circle.members_count;
  const minTier = circle.min_kyc_tier ?? 0;
  const eligible = trustTier >= minTier;
  const fullness = Math.round((circle.members_count / circle.max_members) * 100);

  return (
    <motion.button
      type="button"
      onClick={onJoin}
      whileTap={{ scale: 0.97 }}
      className="snap-start shrink-0 w-[78%] max-w-[280px] rounded-2xl bg-card text-card-foreground p-3.5 text-start ring-1 ring-border/50 shadow-sm transition hover:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{circle.name}</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular-nums">
            {toLatin(circle.cycle_amount)} ج/شهر · {toLatin(circle.max_members)} أعضاء
          </p>
        </div>
        {circle.reward_pool > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-extrabold text-primary">
            <Sparkles className="h-2.5 w-2.5" /> مكافأة
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${fullness}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10.5px] font-bold">
        <span className="text-muted-foreground tabular-nums">
          {toLatin(seatsLeft)} مقعد متبقّي
        </span>
        <span
          className={`rounded-full px-2 py-0.5 ${
            eligible
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {eligible ? "مؤهل" : `يحتاج مستوى ${toLatin(minTier)}`}
        </span>
      </div>
    </motion.button>
  );
};

const MyCircleRow = ({
  circle,
  onOpen,
}: {
  circle: GameyaCircle;
  onOpen: () => void;
}) => {
  const isMyTurn = circle.my_turn === circle.current_cycle_index;
  const total = Number(circle.cycle_amount) * Number(circle.max_members);
  // Approx days until next installment (30-day cadence from start).
  const start = circle.starts_at ? new Date(circle.starts_at).getTime() : Date.now();
  const elapsedDays = Math.floor((Date.now() - start) / 86_400_000);
  const daysToNext = 30 - (elapsedDays % 30);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-3 rounded-2xl bg-card text-card-foreground p-3 text-start ring-1 ring-border/50 transition hover:ring-primary/40"
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
          قسط {toLatin(circle.cycle_amount)} ج · دور {toLatin(circle.my_turn)}/
          {toLatin(circle.max_members)}
        </p>
      </div>
      <div className="text-end">
        <p className="font-display text-sm font-black tabular-nums text-primary">
          {toLatin(total)}
        </p>
        <p className="text-[9px] text-muted-foreground">
          القسط بعد {toLatin(daysToNext)}ي
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </motion.button>
  );
};
