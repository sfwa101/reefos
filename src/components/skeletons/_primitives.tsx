/**
 * Skeleton primitives — Phase 3 / SEV-1.1
 * ----------------------------------------------------------------
 * Tiny, dependency-free building blocks shared by every Skeleton in
 * `src/components/skeletons/`. Centralising them guarantees:
 *   • consistent shimmer animation across the app
 *   • automatic `prefers-reduced-motion` fallback
 *   • a single place to retune the neutral surface color
 *
 * NOTE: we deliberately use semantic tokens (`bg-foreground/8`, etc.)
 * so dark-mode and theme overrides apply automatically.
 */

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Base shimmer block. Use `className` to size it. */
export const SkBlock = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden
    className={cn(
      "rounded-xl bg-foreground/[0.07]",
      // shimmer keyframe is defined in src/styles.css (opacity pulse).
      // motion-reduce disables it for accessibility.
      "animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
      className,
    )}
    {...rest}
  />
);

/** Round avatar / story-circle placeholder. */
export const SkCircle = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <SkBlock className={cn("rounded-full", className)} {...rest} />
);

/** A single line of text. Default = body line height. */
export const SkLine = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <SkBlock className={cn("h-3 rounded-md", className)} {...rest} />
);

/** Bigger chunk for headlines. */
export const SkTitle = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <SkBlock className={cn("h-5 rounded-lg", className)} {...rest} />
);

/** Pill (chip / badge / button placeholder). */
export const SkPill = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <SkBlock className={cn("h-7 w-16 rounded-full", className)} {...rest} />
);
