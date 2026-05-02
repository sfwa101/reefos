// Universal mobile-first skeleton loader. Polymorphic, zero deps.
// Use across store pages while data hydrates.

import { memo } from "react";

type Variant = "list" | "grid" | "hero" | "detail";

interface Props {
  variant?: Variant;
  rows?: number;
  className?: string;
}

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl bg-foreground/5 ${className}`} />
);

const UniversalPremiumSkeleton = memo(function UniversalPremiumSkeleton({
  variant = "list",
  rows = 6,
  className = "",
}: Props) {
  if (variant === "hero") {
    return (
      <div className={`space-y-4 ${className}`}>
        <Block className="h-8 w-2/3" />
        <Block className="h-44 w-full" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Block key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Block className="aspect-square w-full" />
            <Block className="h-3 w-3/4" />
            <Block className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={`space-y-4 ${className}`}>
        <Block className="aspect-[4/3] w-full" />
        <Block className="h-7 w-2/3" />
        <Block className="h-4 w-1/2" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Block key={i} className="h-12" />)}
        </div>
      </div>
    );
  }

  // list (default)
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Block className="h-24 w-24 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Block className="h-4 w-3/4" />
            <Block className="h-3 w-1/2" />
            <Block className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
});

export default UniversalPremiumSkeleton;
