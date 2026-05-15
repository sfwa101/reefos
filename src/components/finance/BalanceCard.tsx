import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { CreditCard, Copy, Cpu, ShieldCheck, Wifi } from "lucide-react";
import { toast } from "sonner";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";

/** Build an IBAN-style display id from the user UUID, e.g. REEF-A1B2-C3D4. */
const buildAccountNumber = (userId: string | null | undefined): string => {
  if (!userId) return "REEF-•••• ••••";
  const clean = userId.replace(/-/g, "").toUpperCase();
  return `REEF-${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
};

/**
 * BalanceCard — Holographic Super-Card (Papara/Apple Pay grade).
 *
 * Design contract (Phase B):
 *  - Aspect ratio locked to 1.586 (real bank card ratio).
 *  - Macro typography: balance is the loudest element on the screen.
 *  - Metallic feel via SVG noise/grain overlay + multi-layered sheen.
 *  - Pointer-driven 3D tilt with spring smoothing + cursor sheen.
 *  - Drop-glow underneath using `bg-primary/blur-3xl` so the card
 *    appears to *light up* the page in any active theme.
 *  - 100% theme-bound — only `--primary`, `--primary-foreground`,
 *    `--accent`, `--border` tokens.
 */
export const BalanceCard = ({
  name,
  balance,
  trustLimit,
  tierLabel,
  userId,
}: {
  name: string;
  balance: number;
  trustLimit: number;
  tierLabel?: string;
  userId?: string | null;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const accountNo = buildAccountNumber(userId);
  const copyAccount = async () => {
    await navigator.clipboard.writeText(accountNo);
    toast.success("تم نسخ رقم الحساب");
  };

  // Pointer position normalized to [-0.5, 0.5]
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Springs for buttery tilt
  const sx = useSpring(px, { stiffness: 200, damping: 20, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 200, damping: 20, mass: 0.4 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 12]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [10, -10]);

  // Cursor-following sheen
  const sheenX = useTransform(sx, [-0.5, 0.5], ["10%", "90%"]);
  const sheenY = useTransform(sy, [-0.5, 0.5], ["10%", "90%"]);
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX} ${sheenY}, hsl(var(--primary-foreground) / 0.55), transparent 55%)`;

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="relative" style={{ perspective: 1400 }}>
      {/* Drop glow — the card lights up the screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -bottom-6 h-24 rounded-full bg-primary opacity-30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-2 -bottom-10 h-28 rounded-full bg-accent opacity-20 blur-3xl"
      />

      <motion.section
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.985 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          aspectRatio: "1.586 / 1",
        }}
        className="relative w-full overflow-hidden rounded-[2rem] bg-primary text-primary-foreground shadow-2xl ring-1 ring-border/40"
      >
        {/* Base diagonal theme sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-95"
        />

        {/* Cursor-tracking holographic highlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ background: sheen }}
        />

        {/* Soft theme blobs */}
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary-foreground/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-60 w-60 rounded-full bg-accent/35 blur-3xl" />

        {/* Metallic SVG noise/grain — gives the card a brushed feel */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18] mix-blend-overlay"
        >
          <filter id="walletGrain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#walletGrain)" />
        </svg>

        {/* Diagonal sheen line — subtle metallic edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-primary-foreground/10 to-transparent"
        />

        {/* Card content (lifted in 3D for parallax) */}
        <div
          className="relative flex h-full flex-col justify-between p-5"
          style={{ transform: "translateZ(50px)" }}
        >
          {/* Top — brand & NFC */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25 backdrop-blur-sm">
                <CreditCard className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-bold tracking-[0.22em] text-primary-foreground/85">
                  REEF · DIGITAL
                </p>
                {tierLabel && (
                  <p className="text-[9px] font-extrabold tracking-wide text-primary-foreground">
                    {tierLabel}
                  </p>
                )}
              </div>
            </div>
            <Wifi className="h-5 w-5 rotate-90 text-primary-foreground/75" />
          </div>

          {/* Middle — chip + macro balance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-12 items-center justify-center rounded-md bg-gradient-to-br from-primary-foreground/45 to-primary-foreground/10 ring-1 ring-primary-foreground/25">
                <Cpu className="h-4 w-4 text-primary" strokeWidth={2.4} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/75">
                الرصيد المتاح
              </p>
            </div>
            <motion.p
              key={balance}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-6xl font-black leading-none tracking-tight tabular-nums"
            >
              {toLatin(Math.round(balance))}
              <span className="ms-2 align-top text-xl font-bold text-primary-foreground/75">
                ج.م
              </span>
            </motion.p>
          </div>

          {/* IBAN-style account number with copy */}
          <Button
            type="button"
            onClick={copyAccount}
            className="group flex items-center justify-between gap-2 rounded-xl bg-primary-foreground/10 px-3 py-1.5 ring-1 ring-primary-foreground/20 backdrop-blur-sm transition active:scale-[0.98]"
          >
            <div className="min-w-0 text-start">
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary-foreground/65">
                Account No
              </p>
              <p className="truncate font-display text-xs font-extrabold tracking-[0.18em] tabular-nums">
                {accountNo}
              </p>
            </div>
            <Copy className="h-3.5 w-3.5 opacity-70 transition-opacity group-hover:opacity-100" />
          </Button>

          {/* Bottom — name + trust limit */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground/65">
                حامل البطاقة
              </p>
              <p className="truncate font-display text-sm font-extrabold tracking-wide">
                {name}
              </p>
            </div>
            {trustLimit > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 ring-1 ring-primary-foreground/25 backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-[10px] font-extrabold tabular-nums">
                  ثقة {toLatin(trustLimit)} ج
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
};
