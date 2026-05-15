/**
 * SupplierFormModal — composes Glass form cells over `createSupplierFn`.
 * Pure UI: data flows through TanStack mutation → admin gateway server fn.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";

import { createSupplierFn } from "@/core/catalog/admin-catalog.functions";
import { GlassFormModal } from "@/components/admin/ui/GlassFormModal";
import { GlassInput } from "@/components/admin/ui/GlassInput";

const SupplierSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  contact_phone: z.string().trim().max(32).optional().or(z.literal("")),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
  closing_day: z.coerce.number().int().min(1).max(31).optional(),
});
type SupplierFormInput = z.input<typeof SupplierSchema>;
type SupplierFormValues = z.output<typeof SupplierSchema>;

export function SupplierFormModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const createSupplier = useServerFn(createSupplierFn);

  const form = useForm<SupplierFormInput, unknown, SupplierFormValues>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: { name: "", contact_phone: "", payment_terms_days: 30 },
  });

  const m = useMutation({
    mutationFn: async (v: SupplierFormValues) =>
      createSupplier({
        data: {
          name: v.name,
          contact_phone: v.contact_phone || null,
          closing_day: v.closing_day ?? null,
          collection_days: [],
          payment_terms_days: v.payment_terms_days,
        },
      }),
    onSuccess: () => {
      toast.success("تم إنشاء المورّد");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ"),
  });

  const submit = form.handleSubmit((v) => m.mutate(v));

  return (
    <GlassFormModal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="مورّدون"
      title="إضافة مورّد جديد"
      description="املأ التفاصيل ليتم تسجيل المورّد ضمن دفاتر الشركة."
      onSubmit={submit}
      submitting={m.isPending}
    >
      <GlassInput
        label="اسم المورّد"
        required
        placeholder="مثال: شركة الواحة للتموين"
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GlassInput
          label="هاتف التواصل"
          placeholder="9665XXXXXXXX"
          inputMode="tel"
          {...form.register("contact_phone")}
        />
        <GlassInput
          label="مدة السداد (يوم)"
          type="number"
          min={0}
          max={365}
          error={form.formState.errors.payment_terms_days?.message}
          {...form.register("payment_terms_days")}
        />
      </div>
      <GlassInput
        label="يوم الإقفال الشهري"
        type="number"
        min={1}
        max={31}
        hint="اختياري — يُستخدم لجدولة كشوف المطابقة."
        {...form.register("closing_day")}
      />
    </GlassFormModal>
  );
}

export default SupplierFormModal;
