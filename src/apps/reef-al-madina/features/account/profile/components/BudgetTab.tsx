import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./Primitives";
import { budgetRanges } from "../data";
import type { ProfileForm } from "../types";
import { Button } from "@/components/ui/button";

export const BudgetTab = ({
  form, onChange, onClearSaveState,
}: {
  form: ProfileForm;
  onChange: (updater: (c: ProfileForm) => ProfileForm) => void;
  onClearSaveState: () => void;
}) => (
  <Section icon={Wallet} title="ساعدنا لنعرض لك ما يناسب ميزانيتك" helper="هذه البيانات مشفّرة وتُستخدم فقط لتحسين العروض المعروضة لك.">
    <div className="grid grid-cols-1 gap-2">
      {budgetRanges.map((b) => {
        const Icon = b.icon;
        const active = form.budgetRange === b.value;
        return (
          <Button key={b.value} type="button"
            onClick={() => { onChange((c) => ({ ...c, budgetRange: b.value })); onClearSaveState(); }}
            className={cn("flex items-center gap-3 rounded-[1.3rem] border px-4 py-3 text-right transition ease-apple",
              active ? "border-primary bg-primary-soft shadow-soft" : "border-border/60 bg-background/80")}>
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", active ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-extrabold text-foreground">{b.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{b.hint}</div>
            </div>
            <div className={cn("h-5 w-5 rounded-full border-2", active ? "border-primary bg-primary" : "border-border bg-card")} />
          </Button>
        );
      })}
    </div>
  </Section>
);
