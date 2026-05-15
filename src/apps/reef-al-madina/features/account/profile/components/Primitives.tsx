import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

export const Section = ({
  icon: Icon, title, helper, children,
}: { icon: LucideIcon; title: string; helper?: string; children: ReactNode }) => (
  <section className="rounded-[1.6rem] border border-border/60 bg-card p-4 shadow-soft">
    <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
      <Icon className="h-4 w-4 text-primary" /> {title}
    </div>
    {helper && <p className="mb-3 text-[11px] leading-6 text-muted-foreground">{helper}</p>}
    {children}
  </section>
);

export const SmartField = ({
  icon: Icon, label, helper, value, placeholder, onChange,
}: {
  icon: LucideIcon; label: string; helper: string; value: string; placeholder: string; onChange: (v: string) => void;
}) => (
  <label className="block rounded-[1.4rem] border border-border/60 bg-background/80 p-3">
    <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </div>
    <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      autoComplete="name" className="w-full bg-transparent text-sm font-extrabold text-foreground outline-none placeholder:text-muted-foreground" />
    <p className="mt-2 text-[11px] leading-6 text-muted-foreground">{helper}</p>
  </label>
);

export const ReadonlyField = ({
  icon: Icon, label, helper, value,
}: { icon: LucideIcon; label: string; helper: string; value: string }) => (
  <div className="rounded-[1.4rem] border border-border/60 bg-background/80 p-3">
    <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </div>
    <div dir="ltr" className="text-sm font-extrabold text-foreground">+{value}</div>
    <p className="mt-2 text-[11px] leading-6 text-muted-foreground">{helper}</p>
  </div>
);
