import { useCallback, useEffect, useState } from "react";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";

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
      const data = await FinanceGateway.getProfileHideBalance(userId);
      const row = data as { hide_balance?: boolean | null } | null;
      if (!mounted || row?.hide_balance == null) return;
      setHidden(Boolean(row.hide_balance));
      localStorage.setItem(KEY, row.hide_balance ? "1" : "0");
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
        FinanceGateway.updateProfileHideBalanceFireAndForget(userId, next);
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
