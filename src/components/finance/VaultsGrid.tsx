import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Lock, Sparkles } from "lucide-react";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Vault = {
  id: string;
  name: string;
  icon: string | null;
  target_amount: number | null;
  current_balance: number;
  locked_until: string | null;
};

/**
 * VaultsGrid — Multi-goal savings vaults stem-cell.
 * Reads from `wallet_vaults` (RLS-scoped to current user). Every vault
 * is a glass tile with a circular goal indicator. The empty state hints
 * at the upcoming `<CreateVaultSheet />`.
 */
export const VaultsGrid = ({ userId }: { userId: string | null }) => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const data = await FinanceGateway.listUserVaults(userId);
      if (!mounted) return;
      setVaults(data as unknown as Vault[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-black tracking-tight">
          حصّالاتي
        </h3>
        <Button
          type="button"
          disabled
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary ring-1 ring-primary/25 transition active:scale-95 disabled:opacity-70"
        >
          <Plus className="h-3 w-3" />
          حصّالة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-card/50 ring-1 ring-border/40"
            />
          ))}
        </div>
      ) : vaults.length === 0 ? (
        <EmptyVaults />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {vaults.map((v) => (
            <VaultTile key={v.id} vault={v} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const VaultTile = ({ vault }: { vault: Vault }) => {
  const target = vault.target_amount ? Number(vault.target_amount) : null;
  const balance = Number(vault.current_balance);
  const pct =
    target && target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : null;
  const locked = vault.locked_until ? new Date(vault.locked_until) > new Date() : false;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden rounded-2xl bg-card/80 p-3 shadow-sm ring-1 ring-border/50 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Target className="h-4 w-4" />
        </div>
        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
      <p className="relative mt-2 truncate text-xs font-extrabold">{vault.name}</p>
      <p className="relative mt-0.5 font-display text-lg font-black tabular-nums">
        {toLatin(Math.round(balance))}
        <span className="ms-1 text-[10px] font-bold text-muted-foreground">ج.م</span>
      </p>
      {pct !== null && (
        <>
          <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="relative mt-1 text-[9px] font-bold text-muted-foreground tabular-nums">
            {toLatin(pct)}٪ من {toLatin(Math.round(target!))} ج
          </p>
        </>
      )}
    </motion.div>
  );
};

const EmptyVaults = () => (
  <div className="rounded-3xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Sparkles className="h-5 w-5" />
    </div>
    <p className="mt-3 text-xs font-bold">ابدأ بحصّالة لكل هدف</p>
    <p className="mt-1 text-[10px] text-muted-foreground">
      الحج · الزواج · العمرة · مصروف الدراسة
    </p>
  </div>
);
