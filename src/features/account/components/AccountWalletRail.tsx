import { Link } from "@tanstack/react-router";
import { ChevronLeft, Wallet as WalletIcon, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { toLatin } from "@/lib/format";

type Props = { balance: number; points: number };

const AccountWalletRail = ({ balance, points }: Props) => (
  <section className="grid grid-cols-2 gap-3">
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
      <Link
        to="/wallet"
        className="relative block overflow-hidden rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60 transition active:scale-[0.99]"
      >
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-pill">
            <WalletIcon className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="relative mt-3 font-display text-2xl font-extrabold tabular-nums leading-none">
          {toLatin(Math.round(balance))}
          <span className="ms-1 text-[10px] font-bold text-muted-foreground">ج.م</span>
        </p>
        <p className="relative mt-1 text-[10.5px] text-muted-foreground">رصيد المحفظة الذكية</p>
      </Link>
    </motion.div>

    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
      <Link
        to="/wallet"
        className="relative block overflow-hidden rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60 transition active:scale-[0.99]"
      >
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-accent/30 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-pill">
            <Gift className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="relative mt-3 font-display text-2xl font-extrabold tabular-nums leading-none">{toLatin(points)}</p>
        <p className="relative mt-1 text-[10.5px] text-muted-foreground">نقطة ولاء قابلة للاستبدال</p>
      </Link>
    </motion.div>
  </section>
);

export default AccountWalletRail;
