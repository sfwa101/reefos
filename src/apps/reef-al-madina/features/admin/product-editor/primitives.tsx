// Shared primitives used across ProductEditor tab components.
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export const inputCls =
  "w-full h-11 rounded-xl bg-surface-muted px-3 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30";

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-[12px] font-semibold text-foreground-secondary mb-1.5">{children}</label>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 press"
    >
      <span
        className={
          "w-10 h-6 rounded-full transition-colors relative " +
          (checked ? "bg-primary" : "bg-surface-muted border border-border/60")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all " +
            (checked ? "right-0.5" : "right-[18px]")
          }
        />
      </span>
      <span className="text-[13px] font-semibold">{label}</span>
    </Button>
  );
}

export function Stat({
  label, value, sub, tone,
}: {
  label: string; value: string; sub: string;
  tone: "primary" | "info" | "success" | "warning" | "destructive";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className={`rounded-xl py-2 px-1 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold opacity-80">{label}</p>
      <p className="font-display text-[15px] num leading-tight">{value}</p>
      <p className="text-[9.5px] opacity-70 num">{sub}</p>
    </div>
  );
}
