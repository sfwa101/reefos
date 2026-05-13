/**
 * SovereignDormancyOverlay — Phase 21 Spirit Sanctuary.
 *
 * Glassy, non-intrusive full-screen overlay that mounts whenever the global
 * prayer store reports `isDormant === true`. Shows the active prayer name,
 * a contextual prompt that respects the user's gender (congregational for
 * men, on-time for women), and the live Athan minute countdown.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Users, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useSovereignPrayerStore,
  PRAYER_LABEL_AR,
} from "@/core/spirit/useSovereignPrayer";

export const SovereignDormancyOverlay = () => {
  const { profile } = useAuth();
  const isDormant = useSovereignPrayerStore((s) => s.isDormant);
  const active = useSovereignPrayerStore((s) => s.activePrayer);

  const isFemale = (profile?.gender ?? "").toLowerCase() === "female";
  const promptIcon = isFemale ? Heart : Users;
  const PromptIcon = promptIcon;
  const promptText = isFemale
    ? "حافظي على الصلاة في وقتها — السكينة بالطاعة."
    : "حيّ على الصلاة جماعةً في المسجد — أجر الجماعة سبع وعشرون.";

  return (
    <AnimatePresence>
      {isDormant && active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          dir="rtl"
          className="fixed inset-x-0 top-0 z-[60] pointer-events-none"
        >
          <div className="mx-auto mt-3 w-[min(420px,92%)] pointer-events-auto">
            <motion.div
              initial={{ y: -20, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="relative overflow-hidden rounded-3xl border border-white/15 bg-background/55 p-4 shadow-2xl backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-emerald-500/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-amber-400/20 blur-3xl" />

              <div className="relative flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                  <Moon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    حان الآن وقت
                  </p>
                  <p className="font-display text-xl font-extrabold leading-tight text-foreground">
                    صلاة {PRAYER_LABEL_AR[active]}
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <PromptIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{promptText}</span>
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground/80">
                    تم إيقاف العروض والمؤقتات تلقائياً احتراماً للوقت.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SovereignDormancyOverlay;
