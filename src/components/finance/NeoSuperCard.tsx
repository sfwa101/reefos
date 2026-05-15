import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { fmtMoney, toLatin } from "@/lib/format";
import { maskAmount } from "@/core/finance/hooks/useHideBalance";
import type { WalletAsset } from "@/core/finance/hooks/useWalletAssets";
import { Button } from "@/components/ui/button";

type Props = {
  asset: WalletAsset;
  active: boolean;
  hidden: boolean;
  onToggleHide: () => void;
  ownerName: string;
};

/**
 * NeoSuperCard — single holographic asset card used inside the Embla carousel.
 * Inspired by Papara's hero card: heavy gradient, aurora blur, micro-typography,
 * shared `layoutId` so the active card morphs smoothly across slides.
 */
export function NeoSuperCard({ asset, active, hidden, onToggleHide, ownerName }: Props) {
  const display = hidden
    ? maskAmount(asset.balance)
    : asset.type === "egp" || asset.type === "cashback"
      ? fmtMoney(asset.balance)
      : `${toLatin(asset.balance)}`;

  return (
    <motion.div
      animate={{
        scale: active ? 1 : 0.92,
        opacity: active ? 1 : 0.55,
        filter: active ? "blur(0px)" : "blur(1px)",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="relative w-[88vw] max-w-[420px] aspect-[1.62/1] shrink-0 select-none"
    >
      {/* gradient body */}
      <div
        className="absolute inset-0 rounded-[28px] overflow-hidden shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
        style={{ background: asset.gradient }}
      >
        {/* aurora glow */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/30 blur-3xl" />
        {/* hairline grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] opacity-80 uppercase">
                {asset.label}
              </p>
              <p className="text-[10.5px] opacity-65 mt-0.5">{asset.subtitle}</p>
            </div>
            {active && (
              <Button
                type="button"
                onClick={onToggleHide}
                className="rounded-full bg-white/15 backdrop-blur-md p-2 ring-1 ring-white/25 active:scale-95 transition"
                aria-label={hidden ? "إظهار الرصيد" : "إخفاء الرصيد"}
              >
                {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>

          <div>
            <motion.p
              key={`${asset.type}-${hidden}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="font-display text-[34px] leading-none num font-black tracking-tight"
            >
              {display}
              {!hidden && (
                <span className="text-[14px] font-bold opacity-80 ml-1.5">
                  {asset.unit}
                </span>
              )}
            </motion.p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] opacity-80 truncate max-w-[60%]">{ownerName}</p>
              <p className="text-[10px] tracking-[0.3em] font-mono opacity-70">
                REEF · {asset.type.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
