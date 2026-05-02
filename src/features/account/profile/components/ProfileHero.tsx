import { Phone, Sparkles, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProfileForm } from "../types";

export const ProfileHero = ({
  form, fallbackPhone, initials, completion, AvatarIcon,
}: {
  form: ProfileForm;
  fallbackPhone: string;
  initials: string;
  completion: number;
  AvatarIcon?: LucideIcon;
}) => (
  <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-tile" style={{ backgroundImage: "var(--gradient-aurora)" }}>
    <div className="space-y-4 bg-background/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-3 py-1 text-[11px] font-extrabold text-primary shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> ملف ذكي
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-foreground">{form.fullName || "أكمل ملفك الشخصي"}</h2>
            <p dir="ltr" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> +{form.phone || fallbackPhone || "—"}
            </p>
          </div>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pill">
          {AvatarIcon ? <AvatarIcon className="h-9 w-9" strokeWidth={2.2} /> : <span className="font-display text-2xl font-extrabold">{initials}</span>}
        </div>
      </div>
      <div className="rounded-[1.4rem] bg-card/85 p-3 shadow-soft">
        <div className="flex items-center justify-between text-[11px] font-extrabold">
          <span className="inline-flex items-center gap-1 text-foreground"><Trophy className="h-3.5 w-3.5 text-accent" /> اكتمال الملف</span>
          <span className="text-primary">{completion}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-l from-primary to-primary-glow transition-all" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
          {completion === 100 ? "🎉 ملفك مكتمل! استمتع بأفضل العروض المخصّصة." : "أكمل ملفك واحصل على نقاط ولاء وعروض حصرية."}
        </p>
      </div>
    </div>
  </section>
);
