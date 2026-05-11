/**
 * HakimPulseBadge — small live counter shown in the admin sidebar header.
 * Subscribes to `useHakimPulse` and surfaces the count of OPEN
 * (unresolved) anomalies. Tap → routes the operator to `/admin/anomalies`
 * for triage.
 *
 * Pure presentational shell. No business logic, no mutations.
 */
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHakimPulse } from "../hooks/useHakimPulse";

export function HakimPulseBadge({ className }: { className?: string }) {
  const { openAnomalies, isLoading } = useHakimPulse();
  const count = openAnomalies.length;

  const tone =
    openAnomalies.some((a) => a.severity === "critical")
      ? "critical"
      : openAnomalies.some((a) => a.severity === "error")
        ? "error"
        : count > 0
          ? "warning"
          : "calm";

  return (
    <Link
      to="/admin/hakim-anomalies"
      aria-label={`حكيم — ${count} تنبيه نشط`}
      className={cn(
        "relative inline-flex items-center justify-center h-9 w-9 rounded-xl border transition-base press",
        tone === "calm" && "border-border/60 text-foreground-tertiary hover:bg-sidebar-accent",
        tone === "warning" && "border-amber-500/40 bg-amber-500/10 text-amber-600",
        tone === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "critical" &&
          "border-destructive/60 bg-destructive/20 text-destructive animate-pulse",
        className,
      )}
    >
      <ShieldAlert className="h-[18px] w-[18px]" strokeWidth={2.2} />
      {!isLoading && count > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-background",
            tone === "critical" || tone === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-amber-500 text-black",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export default HakimPulseBadge;
