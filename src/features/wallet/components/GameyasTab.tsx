import { motion } from "framer-motion";
import { Users, Plus, ShieldCheck, Sparkles } from "lucide-react";

/**
 * GameyasTab — Stem-cell placeholder for the cooperative savings circles
 * (Gam'eyas / ROSCA) section. Reads from `gam_eyas` + `gam_eya_members`
 * once the listing hook is wired in the next phase.
 *
 * Renders an empty-state hero with two CTAs ("ابدأ جمعية" / "انضم لجمعية")
 * — visually anchors the upcoming `<CreateGameyaSheet />` & `<JoinSheet />`.
 */
export const GameyasTab = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6 ring-1 ring-border/50">
        <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25 backdrop-blur-md">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-black tracking-tight">
              الجمعيات التعاونية
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ادّخر مع أهل بلدك بدون فوائد ربوية — كل دور يحصل على المبلغ كاملاً
              بنظام الضامن التكافلي.
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2.5 text-xs font-extrabold text-primary-foreground shadow-md ring-1 ring-primary/40 transition active:scale-95 disabled:opacity-70"
          >
            <Plus className="h-3.5 w-3.5" />
            ابدأ جمعية
          </button>
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-card/70 px-3 py-2.5 text-xs font-extrabold text-foreground ring-1 ring-border/50 backdrop-blur-md transition active:scale-95 disabled:opacity-70"
          >
            <Sparkles className="h-3.5 w-3.5" />
            انضم لجمعية
          </button>
        </div>

        <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-foreground/5 p-2.5 text-[10px] text-muted-foreground ring-1 ring-border/40">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>محمية بالضامن التكافلي · بلا غرامات تأخير ربوية</span>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <p className="text-xs font-semibold text-muted-foreground">
          لا توجد جمعيات نشطة بعد
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          ستظهر هنا الجمعيات التي تشارك فيها
        </p>
      </div>
    </motion.div>
  );
};
