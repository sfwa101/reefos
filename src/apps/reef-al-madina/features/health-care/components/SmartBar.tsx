import { Sparkles } from "lucide-react";
import type { SmartItem } from "../types";
import { Button } from "@/components/ui/button";

export const SmartBar = ({
  title,
  items,
  onPick,
}: {
  title: string;
  items: SmartItem[];
  onPick: (id: string) => void;
}) => (
  <section className="mt-4">
    <div className="mb-2 flex items-center gap-1.5 px-1">
      <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.6} />
      <span className="text-[11px] font-extrabold text-foreground/80">{title}</span>
    </div>
    <div
      className="rounded-[22px] p-2.5 ring-1 ring-border/40"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--card) / 0.92) 0%, hsl(var(--card) / 0.78) 100%)",
        boxShadow: "0 8px 24px -16px rgba(0,0,0,0.18)",
      }}
    >
      <div className="grid grid-cols-4 gap-2">
        {items.map((it) => (
          <Button
            key={it.id}
            onClick={() => onPick(it.id)}
            className="group flex flex-col items-center gap-1.5 rounded-2xl bg-background/60 p-2.5 ring-1 ring-border/40 transition active:scale-95"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `hsl(${it.hue} / 0.14)`,
                color: `hsl(${it.hue})`,
              }}
            >
              <it.icon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-center text-[10px] font-extrabold leading-tight text-foreground/85">
              {it.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  </section>
);
