import { CheckCircle2, Heart, HeartCrack } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./Primitives";
import { dislikeOptions, lifestyleTags, likeOptions } from "../data";
import type { ProfileForm } from "../types";
import { Button } from "@/components/ui/button";

type ArrayKey = "lifestyleTags" | "likes" | "dislikes";

export const LifestyleTab = ({
  form, onToggle,
}: { form: ProfileForm; onToggle: (key: ArrayKey, value: string) => void }) => (
  <>
    <Section icon={Heart} title="اهتماماتي" helper="اختر ما يناسب نمط حياتك — يظهر في مقدمة المتجر.">
      <div className="flex flex-wrap gap-2">
        {lifestyleTags.map((t) => {
          const Icon = t.icon;
          const active = form.lifestyleTags.includes(t.value);
          return (
            <Button key={t.value} type="button" onClick={() => onToggle("lifestyleTags", t.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-extrabold transition ease-apple",
                active ? "border-primary bg-primary text-primary-foreground shadow-pill" : "border-border/60 bg-background/80 text-foreground")}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </Button>
          );
        })}
      </div>
    </Section>

    <Section icon={CheckCircle2} title="ما يعجبك في تجربة التسوق">
      <div className="flex flex-wrap gap-2">
        {likeOptions.map((o) => {
          const active = form.likes.includes(o.value);
          return (
            <Button key={o.value} type="button" onClick={() => onToggle("likes", o.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-extrabold transition",
                active ? "border-primary bg-primary-soft text-primary shadow-soft" : "border-border/60 bg-background/80 text-foreground")}>
              <Heart className={cn("h-3.5 w-3.5", active && "fill-primary")} /> {o.label}
            </Button>
          );
        })}
      </div>
    </Section>

    <Section icon={HeartCrack} title="ما لا يعجبك">
      <div className="flex flex-wrap gap-2">
        {dislikeOptions.map((o) => {
          const active = form.dislikes.includes(o.value);
          return (
            <Button key={o.value} type="button" onClick={() => onToggle("dislikes", o.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-extrabold transition",
                active ? "border-destructive bg-destructive/10 text-destructive shadow-soft" : "border-border/60 bg-background/80 text-foreground")}>
              <HeartCrack className="h-3.5 w-3.5" /> {o.label}
            </Button>
          );
        })}
      </div>
    </Section>
  </>
);
