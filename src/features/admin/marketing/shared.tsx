import { ComponentType } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "info";

const TONES: Record<Tone, string> = {
  primary: "from-primary to-primary-glow",
  success: "from-[hsl(var(--success))] to-[hsl(var(--teal))]",
  warning: "from-[hsl(var(--accent))] to-[hsl(20_100%_55%)]",
  info: "from-[hsl(var(--info))] to-[hsl(var(--indigo))]",
};

export function Kpi({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  return (
    <div className="rounded-3xl p-4 bg-card border border-border/50 shadow-soft">
      <div
        className={cn(
          "h-9 w-9 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-3 shadow-sm",
          TONES[tone],
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] text-foreground-tertiary leading-tight">{label}</p>
      <p className="font-display text-[20px] num leading-tight mt-0.5">{value}</p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] text-foreground-secondary">{label}</label>
      {children}
    </div>
  );
}
