import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { MarketingGateway } from "@/core/marketing";

const STORAGE_KEY = "reef.lastActiveAt";
const NUDGE_AFTER_MS = 2 * 60 * 60 * 1000; // 2h
const NUDGE_DEDUPE_KEY = "reef.lastNudgeAt";
const NUDGE_DEDUPE_MS = 6 * 60 * 60 * 1000; // 6h between nudges

/**
 * In-app inactivity nudger:
 * - Marks "last active" timestamp on mount and every visibility change.
 * - On mount, if the user has been away >2h, fetches a current flash-sale
 *   product (in their top affinity category, if any) and shows a toast.
 */
export default function InactivityNudger() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const lastNudge = Number(localStorage.getItem(NUDGE_DEDUPE_KEY) ?? 0);
    localStorage.setItem(STORAGE_KEY, String(now));

    const onVis = () => {
      if (document.visibilityState === "visible") {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const wasAway = last > 0 && now - last > NUDGE_AFTER_MS;
    const canNudge = now - lastNudge > NUDGE_DEDUPE_MS;
    if (!wasAway || !canNudge) return () => document.removeEventListener("visibilitychange", onVis);

    (async () => {
      try {
        const pick = await MarketingGateway.getInactivityPick(user?.id ?? null);
        if (!pick) return;

        const name = profile?.full_name?.split(" ")[0] ?? "";
        toast(`${name ? `يا ${name}, ` : ""}بدأ الآن عرض الفلاش على ${pick.product_name}`, {
          description: `خصم ${Math.round(Number(pick.discount_pct))}٪ — تبقّى وقت محدود!`,
          duration: 8000,
        });
        localStorage.setItem(NUDGE_DEDUPE_KEY, String(Date.now()));

        if (user?.id) {
          await MarketingGateway.createNotification({
            userId: user.id,
            title: "عرض فلاش يناسبك",
            body: `${pick.product_name} — خصم ${Math.round(Number(pick.discount_pct))}٪`,
            icon: "flame",
          });
        }
      } catch {
        /* silent */
      }
    })();

    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user?.id, profile?.full_name]);

  return null;
}
