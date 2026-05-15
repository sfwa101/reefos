import { Briefcase, CalendarDays, Phone, User2, Users, VenusAndMars } from "lucide-react";
import BirthDatePicker from "@/components/BirthDatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Section, SmartField, ReadonlyField } from "./Primitives";
import { genderOptions, occupations } from "../data";
import { extractPhoneFromPseudoEmail } from "../utils";
import type { Gender, ProfileForm } from "../types";
import { Button } from "@/components/ui/button";

export const IdentityTab = ({
  form, userEmail, onChange, onClearSaveState,
}: {
  form: ProfileForm;
  userEmail: string | null | undefined;
  onChange: (updater: (c: ProfileForm) => ProfileForm) => void;
  onClearSaveState: () => void;
}) => {
  const upd = (patch: Partial<ProfileForm>) => { onChange((c) => ({ ...c, ...patch })); onClearSaveState(); };
  return (
    <>
      <Section icon={User2} title="الهوية الأساسية">
        <div className="space-y-3">
          <SmartField icon={User2} label="الاسم الكامل" helper="يظهر في حسابك وطلباتك." value={form.fullName} placeholder="مثال: أحمد محمد"
            onChange={(v) => upd({ fullName: v })} />
          <ReadonlyField icon={Phone} label="رقم الجوال" helper="مرتبط بالحساب ولا يُغيَّر من هنا."
            value={form.phone || extractPhoneFromPseudoEmail(userEmail) || "غير متوفر"} />

          <div className="rounded-[1.4rem] border border-border/60 bg-background/80 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> تاريخ الميلاد
            </div>
            <BirthDatePicker
              value={form.birthDate}
              onChange={(iso) => upd({ birthDate: iso })}
            />
            <p className="mt-2 text-[11px] leading-6 text-muted-foreground">اضغط لاختيار التاريخ من التقويم.</p>
          </div>
        </div>
      </Section>

      <Section icon={VenusAndMars} title="النوع">
        <Select
          value={form.gender === "unspecified" ? undefined : form.gender}
          onValueChange={(v) => upd({ gender: v as Gender })}
        >
          <SelectTrigger className="h-12 rounded-[1.1rem] border-border/60 bg-background/80 text-sm font-extrabold">
            <SelectValue placeholder="اختر النوع" />
          </SelectTrigger>
          <SelectContent>
            {genderOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-sm font-extrabold">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section icon={Briefcase} title="الوضع المهني">
        <div className="grid grid-cols-2 gap-2">
          {occupations.map((o) => {
            const Icon = o.icon;
            const active = form.occupation === o.value;
            return (
              <Button key={o.value} type="button" onClick={() => upd({ occupation: o.value })}
                className={cn("flex flex-col items-center gap-2 rounded-[1.3rem] border px-3 py-4 text-center transition ease-apple",
                  active ? "border-primary bg-primary-soft shadow-soft" : "border-border/60 bg-background/80")}>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", active ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[12px] font-extrabold text-foreground">{o.label}</span>
              </Button>
            );
          })}
        </div>
      </Section>

      <Section icon={Users} title="عدد أفراد الأسرة" helper="يساعدنا في اقتراح أحجام العبوات المناسبة.">
        <div className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-border/60 bg-background/80 p-3">
          <Button type="button"
            onClick={() => upd({ householdSize: Math.max(0, form.householdSize - 1) })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-extrabold text-foreground">−</Button>
          <div className="text-center">
            <div className="font-display text-3xl font-extrabold text-foreground tabular-nums">{form.householdSize || "—"}</div>
            <div className="text-[11px] text-muted-foreground">{form.householdSize > 0 ? "فرد" : "غير محدد"}</div>
          </div>
          <Button type="button"
            onClick={() => upd({ householdSize: Math.min(20, form.householdSize + 1) })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground shadow-pill">+</Button>
        </div>
      </Section>
    </>
  );
};
