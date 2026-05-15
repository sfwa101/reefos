/**
 * SectionHeader — Steel Glass section title with optional action (WAVE UI-7).
 *
 * Used to anchor every block on admin pages: page title, dashboard sections,
 * data tables. Renders an optional eyebrow (small uppercase label), title,
 * description, and a single primary action slot on the trailing side.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned action(s) — usually a Button or Link. */
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
        )}
        <Tag className="font-display text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
          {title}
        </Tag>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13px] font-medium leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
