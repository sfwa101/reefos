/**
 * StaffRoleFormModal — assigns an app-role to an existing user via the
 * sanctioned `manageStaffRoleFn` (RPC `admin_manage_staff_role`).
 *
 * Used as the lightweight "Add Employee" entrypoint inside the Glass
 * arsenal — full HR profile editing belongs to the Humans/Staff views.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";

import { manageStaffRoleFn } from "@/core/hr/hr.functions";
import { GlassFormModal } from "@/components/admin/ui/GlassFormModal";
import { GlassInput } from "@/components/admin/ui/GlassInput";
import { GlassSelect } from "@/components/admin/ui/GlassSelect";

const ROLES = [
  { value: "staff", label: "موظف" },
  { value: "cashier", label: "كاشير" },
  { value: "store_manager", label: "مدير متجر" },
  { value: "branch_manager", label: "مدير فرع" },
  { value: "collector", label: "محصّل" },
  { value: "delivery", label: "توصيل" },
  { value: "driver", label: "سائق" },
  { value: "finance", label: "مالية" },
  { value: "vendor", label: "مورّد" },
  { value: "inventory_clerk", label: "أمين مخزون" },
  { value: "admin", label: "مشرف" },
];

const Schema = z.object({
  user_id: z.string().uuid("معرّف المستخدم يجب أن يكون UUID صالحًا"),
  role: z.string().min(1, "اختر الدور"),
});
type Values = z.infer<typeof Schema>;

export function StaffRoleFormModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const manageRole = useServerFn(manageStaffRoleFn);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { user_id: "", role: "staff" },
  });

  const m = useMutation({
    mutationFn: async (v: Values) =>
      manageRole({ data: { action: "insert", user_id: v.user_id, role: v.role } }),
    onSuccess: () => {
      toast.success("تم إسناد الدور للموظف");
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["hr"] });
      form.reset({ user_id: "", role: "staff" });
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "تعذّر الإسناد"),
  });

  const submit = form.handleSubmit((v) => m.mutate(v));

  return (
    <GlassFormModal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="موارد بشرية"
      title="إسناد دور لموظف"
      description="اربط مستخدم تيسير موجود بدور تشغيلي داخل المنشأة."
      onSubmit={submit}
      submitting={m.isPending}
    >
      <GlassInput
        label="معرّف المستخدم (Taysir UUID)"
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        error={form.formState.errors.user_id?.message}
        {...form.register("user_id")}
      />
      <GlassSelect
        label="الدور"
        required
        options={ROLES}
        value={form.watch("role")}
        onValueChange={(v) => form.setValue("role", v, { shouldDirty: true })}
        error={form.formState.errors.role?.message}
      />
    </GlassFormModal>
  );
}

export default StaffRoleFormModal;
