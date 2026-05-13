import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useHideBalance — Papara-style stealth mode.
 * Persisted on profiles.hide_balance, mirrored to localStorage for instant boot.
 */
const KEY = "wallet:hide_balance";

export function useHideBalance(userId: string | null) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data } = await sb
        .from("profiles")
        .select("hide_balance")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted || data?.hide_balance == null) return;
      setHidden(Boolean(data.hide_balance));
      localStorage.setItem(KEY, data.hide_balance ? "1" : "0");
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const toggle = useCallback(async () => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem(KEY, next ? "1" : "0");
      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("profiles")
          .update({ hide_balance: next })
          .eq("id", userId);
      }
      return next;
    });
  }, [userId]);

  return { hidden, toggle };
}

/** Mask a number into bullet placeholders, preserving rough magnitude. */
export function maskAmount(n: number) {
  const s = Math.abs(Math.round(n)).toString();
  return "•".repeat(Math.max(s.length, 4));
}
