import { CheckCircle2, CircleAlert, Loader2, RefreshCcw, Save } from "lucide-react";
import type { SaveState } from "../types";
import { Button } from "@/components/ui/button";

export const ProfileSaveBar = ({
  saveState, isDirty, onReset, onSave,
}: {
  saveState: SaveState;
  isDirty: boolean;
  onReset: () => void;
  onSave: () => void;
}) => (
  <section className="rounded-[1.6rem] border border-border/60 bg-card p-4 shadow-soft">
    <div className="flex items-center justify-between gap-3 rounded-[1.2rem] bg-muted/60 p-3">
      <div>
        <p className="text-sm font-extrabold text-foreground">
          {saveState === "saving" ? "جاري حفظ التعديلات" : saveState === "saved" ? "كل شيء محفوظ" : isDirty ? "هناك تغييرات غير محفوظة" : "بياناتك متزامنة"}
        </p>
        <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
          {isDirty ? "احفظ الآن لتفعيل التخصيصات في المتجر." : "ستُستخدم بياناتك لترتيب الأقسام والعروض تلقائيًا."}
        </p>
      </div>
      {saveState === "saving" ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
        : saveState === "saved" ? <CheckCircle2 className="h-5 w-5 text-primary" />
        : <CircleAlert className="h-5 w-5 text-accent" />}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button type="button" onClick={onReset} disabled={!isDirty || saveState === "saving"}
        className="flex h-12 items-center justify-center gap-2 rounded-full border border-border/60 bg-background font-extrabold text-foreground disabled:opacity-50">
        <RefreshCcw className="h-4 w-4" /> تراجع
      </Button>
      <Button type="button" onClick={onSave} disabled={saveState === "saving" || !isDirty}
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-primary-foreground shadow-pill disabled:opacity-60">
        {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saveState === "saving" ? "جاري الحفظ…" : "حفظ التعديلات"}
      </Button>
    </div>
  </section>
);
