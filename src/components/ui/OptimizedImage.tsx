import { memo, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import reefLogo from "@/assets/reef-logo.webp";

/**
 * OptimizedImage
 * ─────────────────────────────────────────────────────────────
 * Drop-in replacement for <img /> tuned for low-end Android devices:
 *   • native lazy-loading + async decoding (no JS observers, no libs)
 *   • soft skeleton/blur placeholder until the bitmap is ready
 *   • fade-in transition to mask janky paints
 *   • forwards width/height to reserve layout (avoids CLS on slow nets)
 *   • branded fallback (Reef logo on neutral surface) when src fails or is empty —
 *     guarantees the storefront NEVER shows a broken-image icon on mobile.
 */

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** Optional aspect-ratio class for the wrapper (e.g. "aspect-square"). */
  aspect?: string;
  /** Show a subtle shimmer instead of a flat skeleton. Default: true. */
  shimmer?: boolean;
  /** Eager-load above-the-fold images (e.g. hero). Default: false → "lazy". */
  priority?: boolean;
  /** Class applied to the wrapping <span> (positioning, rounding, etc.). */
  wrapperClassName?: string;
};

const OptimizedImageImpl = ({
  src,
  alt = "",
  className,
  wrapperClassName,
  aspect,
  shimmer = true,
  priority = false,
  onLoad,
  onError,
  ...rest
}: Props) => {
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);

  // Treat empty / nullish / data-uri-placeholder src as immediate fallback.
  const hasUsableSrc =
    typeof src === "string" && src.trim() !== "" && !src.startsWith("data:image/svg+xml");

  const showFallback = errored || !hasUsableSrc;

  return (
    <span
      className={cn(
        "relative block overflow-hidden bg-muted/40",
        aspect,
        wrapperClassName,
      )}
    >
      {!ready && !showFallback && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0",
            shimmer ? "animate-pulse" : "",
            "bg-gradient-to-br from-muted/60 via-muted/30 to-muted/60",
          )}
        />
      )}

      {/* Branded fallback — Reef logo centered on a soft cream-to-primary wash */}
      {showFallback && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-soft/60 via-secondary/40 to-primary-soft/30"
        >
          <img
            src={reefLogo}
            alt=""
            className="h-1/2 w-1/2 max-h-24 max-w-24 object-contain opacity-60 mix-blend-multiply"
            loading="lazy"
            decoding="async"
          />
        </span>
      )}

      {!showFallback && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error — fetchpriority is a valid HTML attribute, not yet typed
          fetchpriority={priority ? "high" : "low"}
          onLoad={(e) => {
            setReady(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setErrored(true);
            setReady(true);
            onError?.(e);
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500 will-change-[opacity]",
            ready ? "opacity-100" : "opacity-0",
            className,
          )}
          {...rest}
        />
      )}
    </span>
  );
};

const OptimizedImage = memo(OptimizedImageImpl);
export default OptimizedImage;
