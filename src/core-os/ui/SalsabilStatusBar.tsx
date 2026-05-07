/**
 * SalsabilStatusBar — Phase VIII Global Identity & Wallet ribbon.
 * ---------------------------------------------------------------
 * Lightweight, OS-level status strip used by the Khalil shell and
 * available to every injected Mini-App. Shows:
 *   • National ID verification status (from profile)
 *   • Tayseer wallet balance (live)
 *
 * Pure presentational atom — no business logic. Reads from existing
 * AuthContext + a single wallet RPC. Safe under SSR (renders skeleton).
 */
import { useEffect, useState } from "react";
import { Wallet, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toLatin } from "@/lib/format";

export const SalsabilStatusBar = () => {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (alive) setBalance(data?.balance ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const verified = mounted && Boolean(profile?.full_name && profile?.phone);

  return (
    <div
      dir="rtl"
      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-l from-primary/[0.04] to-transparent px-4 py-2.5"
      suppressHydrationWarning
    >
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold text-muted-foreground">رصيد تيسير</span>
        <span className="text-sm font-extrabold tabular-nums text-foreground" suppressHydrationWarning>
          {!mounted || balance == null ? "—" : `${toLatin(Math.round(balance))} ج`}
        </span>
      </div>

      <div className="flex items-center gap-1.5" suppressHydrationWarning>
        {verified ? (
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-amber-600" />
        )}
        <span
          className={`text-[11px] font-bold ${verified ? "text-emerald-700" : "text-amber-700"}`}
        >
          {!mounted ? "…" : verified ? "هوية موثّقة" : "أكمل التوثيق"}
        </span>
      </div>
    </div>
  );
};
