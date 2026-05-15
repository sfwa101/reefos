/**
 * Eithar (الإيثار) — altruism toggle.
 *
 * When ON, the user pays full price for an offer and the system flags a
 * second unit as a Waqf donation routed to a verified needy household in
 * the same governorate. Pref is persisted locally and read by the Cart
 * layer when materializing the order.
 */
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_PREFIX = "salsabil_eithar_";

const readPref = (offerId: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + offerId) === "1";
  } catch {
    return false;
  }
};

export const EitharToggle = ({ offerId }: { offerId: string }) => {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readPref(offerId)), [offerId]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + offerId, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <Button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
        on
          ? "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300"
          : "border-border/60 bg-background text-muted-foreground"
      }`}
      title="عند التفعيل: ندفع ثمن الوحدة الثانية كوقف لأسرة محتاجة في منطقتك."
    >
      <Heart className="h-3 w-3" />
      تفعيل الإيثار
    </Button>
  );
};

export default EitharToggle;
