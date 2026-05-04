import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, PiggyBank, Users, Wallet2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toLatin } from "@/lib/format";

/**
 * NetWorthCard — Personal-CFO summary aggregating:
 *  • Wallet balance
 *  • All vault balances
 *  • Future Gam'eya payout (cycle_amount × max_members of active circles
 *    where the user has not yet received their turn).
 */
export const NetWorthCard = ({
  walletBalance,
  userId,
}: {
  walletBalance: number;
  userId: string | null;
}) => {
  const [vaultsTotal, setVaultsTotal] = useState(0);
  const [gameyasDue, setGameyasDue] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const [{ data: vaults }, { data: memberships }] = await Promise.all([
        supabase
          .from("wallet_vaults")
          .select("current_balance")
          .eq("user_id", userId),
        supabase
          .from("gam_eya_members")
          .select("turn_number, gam_eyas(cycle_amount, max_members, current_cycle_index, status)")
          .eq("user_id", userId),
      ]);
      if (!mounted) return;
      setVaultsTotal(
        ((vaults ?? []) as Array<{ current_balance: number }>).reduce(
          (s, v) => s + Number(v.current_balance || 0),
          0,
        ),
      );
      type MRow = {
        turn_number: number;
        gam_eyas: {
          cycle_amount: number;
          max_members: number;
          current_cycle_index: number;
          status: string;
        } | null;
      };
      let due = 0;
      for (const m of (memberships ?? []) as MRow[]) {
        const g = m.gam_eyas;
        if (!g || g.status !== "active") continue;
        if (m.turn_number > g.current_cycle_index) {
          due += Number(g.cycle_amount) * Number(g.max_members);
        }
      }
      setGameyasDue(due);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const total = walletBalance + vaultsTotal + gameyasDue;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 ring-1 ring-border/50"
    >
      <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
          <Coins className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-sm font-extrabold">الثروة الكلية</h3>
          <p className="text-[10px] text-muted-foreground">
            رصيد + حصّالات + مستحقاتك في الجمعيات
          </p>
        </div>
      </div>

      <p className="relative mt-3 font-display text-4xl font-black tracking-tight tabular-nums">
        {toLatin(Math.round(total))}
        <span className="ms-2 text-base font-bold text-muted-foreground">ج.م</span>
      </p>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <Stat icon={Wallet2} label="رصيد" value={walletBalance} />
        <Stat icon={PiggyBank} label="حصّالات" value={vaultsTotal} />
        <Stat icon={Users} label="جمعيات" value={gameyasDue} />
      </div>
    </motion.section>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet2;
  label: string;
  value: number;
}) => (
  <div className="rounded-2xl bg-card/70 p-2.5 ring-1 ring-border/40 backdrop-blur-md">
    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <p className="mt-0.5 font-display text-sm font-black tabular-nums">
      {toLatin(Math.round(value))}
    </p>
  </div>
);
