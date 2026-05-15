import { cn } from "@/lib/utils";
import { TABS } from "../data";
import type { TabKey } from "../types";
import { Button } from "@/components/ui/button";

export const ProfileTabsNav = ({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) => (
  <nav className="sticky top-2 z-10 flex gap-1.5 overflow-x-auto rounded-full border border-border/60 bg-card/90 p-1.5 shadow-soft">
    {TABS.map((t) => {
      const Icon = t.icon;
      const active = tab === t.key;
      return (
        <Button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "flex flex-1 min-w-[80px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-extrabold transition ease-apple",
            active ? "bg-primary text-primary-foreground shadow-pill" : "text-muted-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {t.label}
        </Button>
      );
    })}
  </nav>
);
