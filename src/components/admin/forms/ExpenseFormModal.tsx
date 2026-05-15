/**
 * ExpenseFormModal — Double-entry-aware expense capture.
 * Wires through `createExpenseFn` which records to `daily_expenses` and
 * triggers the financial ledger rails downstream.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";

import { createExpenseFn } from "@/core/finance/finance.functions";
import { GlassFormModal } from "@/components/admin/ui/GlassFormModal";
import { GlassInput, GlassTextarea } from "@/components/admin/ui/GlassInput";
import { GlassSelect } from "@/components/admin/ui/GlassSelect";

const CATEGORIES = [
  { value: "operations", label: "تشغيل" },
  { value: "salaries", label: "رواتب" },
  { value: "employee_advance", label: "سُلفة موظف" },
  { value: "damages", label: "تالف" },
  { value: "personal_drawings", label: "مسحوبات شخصية" },
  { value: "utilities", label: "خدمات" },
  { value: "rent", label: "إيجار" },
  { value: "marketing", label: "تسويق" },
  { value: "transport", label: "نقل" },
  { value: "other", label: "أخرى" },
];
const METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "wallet", label: "محفظة" },
];

const ExpenseSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().trim().max(120).optional().or(z.literal("")),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  paid_to: z.string().trim().max(255).optional().or(z.literal("")),
  payment_method: z.string().min(1),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
type ExpenseFormValues = z.infer<typeof ExpenseSchema>;

export function ExpenseFormModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const createExpense = useServerFn(createExpenseFn);

  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseSchema),
    defaultValues: {
      category: "operations",
      payment_method: "cash",
      expense_date: today,
      amount: 0,
    },
  });

  const m = useMutation({
    mutationFn: async (v: ExpenseFormValues) =>
      createExpense({
        data: {
          category: v.category,
          subcategory: v.subcategory || null,
          amount: v.amount,
          expense_date: v.expense_date,
          paid_to: v.paid_to || null,
          payment_method: v.payment_method,
          reference: v.reference || null,
          notes: v.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("تم تسجيل المصروف ضمن دفتر الأستاذ");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      form.reset({
        category: "operations",
        payment_method: "cash",
        expense_date: today,
        amount: 0,
      });
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "تعذّر التسجيل"),
  });

  const submit = form.handleSubmit((v) => m.mutate(v));

  return (
    <GlassFormModal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="مالية"
      title="تسجيل مصروف جديد"
      description="قيد فوري في دفتر الأستاذ بنظام القيد المزدوج."
      onSubmit={submit}
      submitting={m.isPending}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GlassSelect
          label="التصنيف"
          required
          options={CATEGORIES}
          value={form.watch("category")}
          onValueChange={(v) => form.setValue("category", v, { shouldDirty: true })}
        />
        <GlassSelect
          label="طريقة الدفع"
          required
          options={METHODS}
          value={form.watch("payment_method")}
          onValueChange={(v) => form.setValue("payment_method", v, { shouldDirty: true })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GlassInput
          label="المبلغ"
          type="number"
          step="0.01"
          required
          error={form.formState.errors.amount?.message}
          {...form.register("amount")}
        />
        <GlassInput
          label="التاريخ"
          type="date"
          required
          error={form.formState.errors.expense_date?.message}
          {...form.register("expense_date")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GlassInput label="المُستفيد" placeholder="اسم الجهة أو الشخص" {...form.register("paid_to")} />
        <GlassInput label="مرجع المستند" placeholder="رقم الفاتورة / السند" {...form.register("reference")} />
      </div>
      <GlassInput label="تصنيف فرعي" placeholder="اختياري" {...form.register("subcategory")} />
      <GlassTextarea label="ملاحظات" rows={2} {...form.register("notes")} />
    </GlassFormModal>
  );
}

export default ExpenseFormModal;
