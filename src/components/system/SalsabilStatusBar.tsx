/**
 * SalsabilStatusBar — Phase VIII Global Identity & Wallet ribbon.
 * ---------------------------------------------------------------
 * Hydration-safe `—` / `…` placeholder until client mount, then a
 * **TanStack-Query-cached** wallet read keyed by user id. Every shell
 * that renders this bar shares the same in-flight request — no more
 * N parallel `supabase.from("wallets")` fetches across navigation.
 */
import { useEffect, useState } from "react";
import { Wallet, ShieldCheck, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { toLatin } from "@/lib/format";

export const SalsabilStatusBar = () => {
  const { user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: balance } = useQuery({
    queryKey: ["wallet", "status-bar", user?.id ?? "_anon"],
    enabled: mounted && Boolean(user?.id),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });

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
