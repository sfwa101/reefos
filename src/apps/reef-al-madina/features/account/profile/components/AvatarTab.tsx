import { Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./Primitives";
import { AVATAR_GALLERY } from "../data";
import type { ProfileForm } from "../types";
import { Button } from "@/components/ui/button";

export const AvatarTab = ({
  form, onChange, onClearSaveState,
}: {
  form: ProfileForm;
  onChange: (updater: (c: ProfileForm) => ProfileForm) => void;
  onClearSaveState: () => void;
}) => (
  <>
    <Section icon={Camera} title="صورتك الشخصية" helper="ارفع صورة أو اختر أيقونة تعبّر عنك.">
      <Button type="button" disabled
        className="flex w-full items-center justify-center gap-2 rounded-[1.3rem] border border-dashed border-border bg-background/80 py-6 text-sm font-extrabold text-muted-foreground">
        <Camera className="h-5 w-5" /> رفع صورة (قريبًا)
      </Button>
    </Section>

    <Section icon={ImageIcon} title="معرض الأفاتار" helper="اختر أيقونة راقية تظهر في حسابك.">
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_GALLERY.map((a) => {
          const Icon = a.icon;
          const active = form.avatarKey === a.key;
          return (
            <Button key={a.key} type="button"
              onClick={() => { onChange((c) => ({ ...c, avatarKey: c.avatarKey === a.key ? "" : a.key })); onClearSaveState(); }}
              className={cn("flex flex-col items-center gap-1.5 rounded-[1.2rem] border p-3 transition ease-apple",
                active ? "border-primary bg-primary-soft shadow-soft" : "border-border/60 bg-background/80")}>
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", active ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-extrabold text-foreground">{a.label}</span>
            </Button>
          );
        })}
      </div>
    </Section>
  </>
);
