import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CreditCard, Cpu, ShieldCheck, Wifi } from "lucide-react";
import { toLatin } from "@/lib/format";

/**
 * BalanceCard — Holographic, theme-bound hero card (Papara-grade).
 *
 * 100% themable: every surface uses `bg-primary` / `text-primary-foreground`
 * / `border-border` so it repaints when the theme switches.
 *
 * Motion:
 *  - Pointer-driven 3D tilt (rotateX/rotateY) with spring smoothing.
 *  - Shimmer / sheen overlay that follows the cursor for a holographic feel.
 *  - `whileTap` press-down for tactile feedback on touch.
 */
export const BalanceCard = ({
  name,
  balance,
  trustLimit,
  tierLabel,
}: {
  name: string;
  balance: number;
  trustLimit: number;
  tierLabel?: string;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // Raw pointer position (-0.5 .. 0.5)
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Spring-smoothed for buttery tilt
  const sx = useSpring(px, { stiffness: 180, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 180, damping: 18, mass: 0.4 });

  // Map pointer → rotation (degrees). Inverted Y feels more natural.
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);

  // Sheen highlight follows the cursor.
  const sheenX = useTransform(sx, [-0.5, 0.5], ["20%", "80%"]);
  const sheenY = useTransform(sy, [-0.5, 0.5], ["20%", "80%"]);

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    px.set(nx);
    py.set(ny);
  };

  const handlePointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      style={{ perspective: 1200 }}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.section
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        whileTap={{ scale: 0.985 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative aspect-[1.6/1] w-full overflow-hidden rounded-[2rem] bg-primary text-primary-foreground shadow-2xl ring-1 ring-border/40"
      >
        {/* Theme-bound gradient sheen (base layer) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-90"
        />

        {/* Pointer-tracking holographic sheen */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            background: useMotionTemplate`radial-gradient(circle at ${sheenX} ${sheenY}, hsl(var(--primary-foreground) / 0.45), transparent 55%)`,
          }}
        />

        {/* Soft theme blobs */}
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary-foreground/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />

        {/* Subtle dotted texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, currentColor 1px, transparent 1px), radial-gradient(circle at 70% 70%, currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        {/* Card content (lifted in 3D for parallax depth) */}
        <div
          className="relative flex h-full flex-col justify-between p-5"
          style={{ transform: "translateZ(40px)" }}
        >
          {/* Top row — brand + NFC */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
                <CreditCard className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-bold tracking-[0.22em] text-primary-foreground/80">
                  REEF · DIGITAL
                </p>
                {tierLabel && (
                  <p className="text-[9px] font-extrabold tracking-wide text-primary-foreground/95">
                    {tierLabel}
                  </p>
                )}
              </div>
            </div>
            <Wifi className="h-5 w-5 rotate-90 text-primary-foreground/70" />
          </div>

          {/* Middle — chip + balance */}
          <div className="-mt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-12 items-center justify-center rounded-md bg-gradient-to-br from-primary-foreground/40 to-primary-foreground/10 ring-1 ring-primary-foreground/25">
                <Cpu className="h-4 w-4 text-primary" strokeWidth={2.4} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/70">
                الرصيد المتاح
              </p>
            </div>
            <motion.p
              key={balance}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-5xl font-extrabold tabular-nums leading-none"
            >
              {toLatin(Math.round(balance))}
              <span className="ms-1 text-base font-medium text-primary-foreground/70">
                ج.م
              </span>
            </motion.p>
          </div>

          {/* Bottom row — name + trust limit */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground/60">
                حامل البطاقة
              </p>
              <p className="truncate font-display text-sm font-extrabold tracking-wide">
                {name}
              </p>
            </div>
            {trustLimit > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 ring-1 ring-primary-foreground/25">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-[10px] font-extrabold tabular-nums">
                  ثقة {toLatin(trustLimit)} ج
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
};
