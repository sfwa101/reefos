import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TrendingUp, Phone, BadgeCheck } from "lucide-react";
import { toLatin } from "@/lib/format";
import { TIER_VISUALS } from "../data";
import RoleSwitcher from "./RoleSwitcher";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

type Props = {
  tierKey: string;
  tierLabel: string;
  TierIcon: LucideIcon;
  multiplier: number;
  pct: number;
  remaining: number;
  nextLabel: string | null;
  displayName: string;
  displayPhone: string;
  initials: string;
  isVerified: boolean;
  points: number;
  balance: number;
  ordersCount: number;
  roles: NonNullable<AppRole>[];
  customerId: string;
};

const Stat = ({ value, label, divider }: { value: string; label: string; divider?: boolean }) => (
  <div className={`text-center ${divider ? "border-x border-foreground/15" : ""}`}>
    <p className="font-display text-lg font-extrabold tabular-nums leading-none">{value}</p>
    <p className="mt-1 text-[10px] font-bold opacity-90">{label}</p>
  </div>
);

const AccountTierCard = ({
  tierKey, tierLabel, TierIcon, multiplier, pct, remaining, nextLabel,
  displayName, displayPhone, initials, isVerified, points, balance, ordersCount,
  roles, customerId,
}: Props) => {
  const v = TIER_VISUALS[tierKey] ?? TIER_VISUALS.bronze;
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div
        role="link"
        tabIndex={0}
        onClick={() => navigate({ to: "/account/profile" })}
        onKeyDown={(e) => { if (e.key === "Enter") navigate({ to: "/account/profile" }); }}
        className="group relative block cursor-pointer overflow-hidden rounded-[2rem] shadow-tile ring-1 ring-foreground/10"
        style={{ background: v.mesh, color: `hsl(${v.ink})`, contain: "layout paint" }}
        aria-label="بطاقة العميل وملف الولاء"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ background: v.shine, mixBlendMode: "overlay" }} />
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full blur-3xl" style={{ background: v.glow }} />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full blur-3xl" style={{ background: v.glow }} />

        <div className="relative p-5">
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <RoleSwitcher roles={roles} customerId={customerId} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/15 px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-foreground/25 backdrop-blur-md">
              <TierIcon className="h-3.5 w-3.5" /> {tierLabel}
            </span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/15 ring-1 ring-foreground/25 backdrop-blur-md font-display text-xl font-extrabold">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold leading-tight truncate">{displayName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold opacity-95">
                {displayPhone && (
                  <span dir="ltr" className="inline-flex items-center gap-1 tabular-nums">
                    <Phone className="h-3 w-3" /> {toLatin(displayPhone)}
                  </span>
                )}
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/20 px-1.5 py-0.5 text-[9.5px] ring-1 ring-foreground/25">
                    <BadgeCheck className="h-3 w-3" /> موثّق
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-foreground/10 p-3 ring-1 ring-foreground/15 backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                مضاعف المكافآت {toLatin(multiplier)}x
              </span>
              {nextLabel ? <span className="opacity-90">{toLatin(pct)}%</span> : <span>أعلى مستوى ✨</span>}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/15">
              <motion.div
                className="h-full rounded-full bg-foreground/80"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            {nextLabel ? (
              <p className="mt-2 text-[10.5px] font-bold opacity-95 tabular-nums">
                تبقى <strong>{toLatin(Math.round(remaining))} ج.م</strong> للترقية إلى <strong>{nextLabel}</strong>
              </p>
            ) : (
              <p className="mt-2 text-[10.5px] font-bold opacity-95">استمتع بأقصى مزايا الكاش باك ونقاط الولاء.</p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-foreground/10 p-3 ring-1 ring-foreground/15 backdrop-blur-md">
            <Stat value={toLatin(points)} label="نقطة" />
            <Stat value={toLatin(Math.round(balance))} label="ج.م رصيد" divider />
            <Stat value={toLatin(ordersCount)} label="طلب" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AccountTierCard;
