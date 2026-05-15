/**
 * Wave R-2 · Batch C.1 — Inline "Create Human" dialog.
 *
 * Sovereign-pure: no direct Supabase imports — submission goes through the
 * `createHumanFn` server function via `useServerFn`.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createHumanFn } from "@/core/crm/crm.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Form = {
  full_name: string;
  phone: string;
  governorate: string;
  city: string;
  occupation: string;
};

const EMPTY: Form = {
  full_name: "",
  phone: "",
  governorate: "",
  city: "",
  occupation: "",
};

export function CreateHumanDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createHumanFn);

  const submit = async () => {
    const name = form.full_name.trim();
    if (name.length < 2) {
      toast.error("الاسم مطلوب (حرفان على الأقل)");
      return;
    }
    setBusy(true);
    try {
      const res = await create({
        data: {
          full_name: name,
          phone: form.phone.trim() || null,
          governorate: form.governorate.trim() || null,
          city: form.city.trim() || null,
          occupation: form.occupation.trim() || null,
        },
      });
      toast.success("تم إنشاء الإنسان");
      setForm(EMPTY);
      onCreated?.(res.id);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!busy ? onOpenChange(o) : null)}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> إنسان جديد
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            سيُنشأ سجلّ في الشبكة البشرية. تُضاف العلاقات (عميل، تاجر، شريك،
            موظف) لاحقاً من الملف 360°.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Field label="الاسم الكامل" required>
            <Input
              autoFocus
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]"
              placeholder="مثال: محمد أحمد"
            />
          </Field>
          <Field label="الجوال">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]"
              placeholder="مثال: 01001234567"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المحافظة">
              <Input
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]"
              />
            </Field>
            <Field label="المدينة">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]"
              />
            </Field>
          </div>
          <Field label="المهنة">
            <Input
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="h-10 px-4 rounded-xl bg-muted text-[13px] font-medium press disabled:opacity-50"
          >
            إلغاء
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !form.full_name.trim()}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-2 press disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] text-foreground-tertiary mb-1">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}
