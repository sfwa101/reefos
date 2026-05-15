/**
 * ProductFormModal — multi-tab Catalog Engine form.
 *
 * Tabs:
 *   1. أساسي — Name, SKU, Barcode, Category
 *   2. تسعير — Base price, cost, tax rule, Taysir loyalty points
 *   3. مخزون — Reorder point, supplier link
 *
 * Mutation flows through the unified Runtime-UI gateway
 * (`admin_entity_upsert` RPC, entity_key="products") so we never touch
 * `supabase.from()` from the UI layer.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GlassFormModal } from "@/components/admin/ui/GlassFormModal";
import { GlassInput, GlassTextarea } from "@/components/admin/ui/GlassInput";
import { GlassSelect } from "@/components/admin/ui/GlassSelect";
import { useEntityMutation } from "@/core/runtime-ui/admin/hooks/useEntityMutation";

const TAX_RULES = [
  { value: "standard_15", label: "ضريبة قياسية ١٥٪" },
  { value: "zero", label: "صفرية" },
  { value: "exempt", label: "معفى" },
];

const ProductSchema = z.object({
  // Tab 1
  name_ar: z.string().min(2, "اسم المنتج مطلوب"),
  name_en: z.string().trim().optional().or(z.literal("")),
  sku: z.string().trim().min(1, "رمز SKU مطلوب"),
  barcode: z.string().trim().optional().or(z.literal("")),
  category_id: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().max(800).optional().or(z.literal("")),
  // Tab 2
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().optional(),
  tax_rule: z.string().default("standard_15"),
  loyalty_points: z.coerce.number().int().nonnegative().default(0),
  // Tab 3
  reorder_point: z.coerce.number().int().nonnegative().default(0),
  supplier_id: z.string().trim().optional().or(z.literal("")),
});
type ProductFormValues = z.infer<typeof ProductSchema>;

export function ProductFormModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState("basic");
  const upsert = useEntityMutation();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name_ar: "",
      sku: "",
      tax_rule: "standard_15",
      price: 0,
      loyalty_points: 0,
      reorder_point: 0,
    },
  });

  const submit = form.handleSubmit(async (v) => {
    await upsert.mutateAsync({
      entity_key: "products",
      payload: {
        name_ar: v.name_ar,
        name_en: v.name_en || null,
        sku: v.sku,
        barcode: v.barcode || null,
        category_id: v.category_id || null,
        description: v.description || null,
        price: v.price,
        cost: v.cost ?? null,
        tax_rule: v.tax_rule,
        loyalty_points: v.loyalty_points,
        reorder_point: v.reorder_point,
        supplier_id: v.supplier_id || null,
      },
    });
    form.reset();
    setTab("basic");
    onOpenChange(false);
  });

  return (
    <GlassFormModal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="كتالوج"
      title="إضافة منتج جديد"
      description="حدّد الهوية والتسعير والمخزون لإضافة المنتج إلى مكتبة الكتالوج."
      onSubmit={submit}
      submitting={upsert.isPending}
      size="max-w-3xl"
    >
      <Tabs value={tab} onValueChange={setTab} dir="rtl" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white/40 p-1 backdrop-blur-md">
          <TabsTrigger value="basic" className="rounded-xl text-[12.5px] font-bold">أساسي</TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-xl text-[12.5px] font-bold">تسعير</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl text-[12.5px] font-bold">مخزون</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GlassInput
              label="الاسم بالعربية"
              required
              error={form.formState.errors.name_ar?.message}
              {...form.register("name_ar")}
            />
            <GlassInput label="الاسم بالإنجليزية" {...form.register("name_en")} />
            <GlassInput
              label="SKU"
              required
              error={form.formState.errors.sku?.message}
              {...form.register("sku")}
            />
            <GlassInput label="الباركود" inputMode="numeric" {...form.register("barcode")} />
          </div>
          <GlassInput label="الفئة (Category ID)" hint="اختياري" {...form.register("category_id")} />
          <GlassTextarea label="الوصف" rows={2} {...form.register("description")} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GlassInput
              label="سعر البيع"
              type="number"
              step="0.01"
              required
              error={form.formState.errors.price?.message}
              {...form.register("price")}
            />
            <GlassInput label="التكلفة" type="number" step="0.01" {...form.register("cost")} />
            <GlassSelect
              label="القاعدة الضريبية"
              options={TAX_RULES}
              value={form.watch("tax_rule")}
              onValueChange={(v) => form.setValue("tax_rule", v, { shouldDirty: true })}
            />
            <GlassInput
              label="نقاط ولاء تيسير"
              type="number"
              min={0}
              {...form.register("loyalty_points")}
            />
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GlassInput
              label="نقطة إعادة الطلب"
              type="number"
              min={0}
              hint="ينبّه أمين المخزون عند بلوغ هذا الرصيد."
              {...form.register("reorder_point")}
            />
            <GlassInput label="مورّد افتراضي (Supplier ID)" {...form.register("supplier_id")} />
          </div>
        </TabsContent>
      </Tabs>
    </GlassFormModal>
  );
}

export default ProductFormModal;
