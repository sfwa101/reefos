/**
 * Smart Fakka — round-up to charity micro-toggle.
 * Used inline on high-value offer cards. Persists locally so user pref
 * survives page hops; the Cart layer reads the same key when applying
 * the actual round-up at checkout.
 */
import { useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "salsabil_fakka_roundup";

const readPref = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const FakkaRoundupToggle = ({ offerId }: { offerId: string }) => {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readPref()), []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <Button
      type="button"
      onClick={toggle}
      data-offer-id={offerId}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
        on
          ? "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "border-border/60 bg-background text-muted-foreground"
      }`}
      aria-pressed={on}
    >
      <HandCoins className="h-3 w-3" />
      تقريب للصدقة
    </Button>
  );
};

export default FakkaRoundupToggle;
