import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ACTION_HUB } from "../data";

const toneClass: Record<string, string> = {
  primary: "bg-primary/12 text-primary ring-primary/20",
  destructive: "bg-destructive/12 text-destructive ring-destructive/20",
  accent: "bg-accent/15 text-accent-foreground ring-accent/30",
};

const AccountActionGrid = () => (
  <section className="grid grid-cols-3 gap-2.5">
    {ACTION_HUB.map((a, i) => {
      const Icon = a.icon;
      return (
        <motion.div
          key={a.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <Link
            to={a.to}
            className="flex h-full flex-col items-center gap-2 rounded-2xl bg-card p-3.5 shadow-soft ring-1 ring-border/60 transition active:scale-[0.97]"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${toneClass[a.tone]}`}>
              <Icon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-[12px] font-extrabold text-foreground">{a.label}</span>
          </Link>
        </motion.div>
      );
    })}
  </section>
);

export default AccountActionGrid;
