import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import {
  empty, META_SCHEMA,
  type ProductRow, type ProductMetadata,
  type ProductVariantRow, type ProductAddonRow,
} from "@/apps/reef-al-madina/features/admin/product-editor/types";
import BasicInfoForm from "@/apps/reef-al-madina/features/admin/product-editor/BasicInfoForm";
import PricingAndInventory, { type MarginInfo } from "@/apps/reef-al-madina/features/admin/product-editor/PricingAndInventory";
import SpecsForm from "@/apps/reef-al-madina/features/admin/product-editor/SpecsForm";
import OptionsBuilder from "@/apps/reef-al-madina/features/admin/product-editor/OptionsBuilder";

// Re-export for backward compatibility with existing imports.
export type { ProductRow, ProductMetadata, ProductVariantRow, ProductAddonRow };

export function ProductEditor({
  product, categories, stores, onClose, onSaved, open,
}: {
  product: ProductRow | null;
  categories: { id: string; name: string; icon: string | null }[];
  stores: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
}) {
  const isNew = !product;
  const [form, setForm] = useState<ProductRow>(product ?? empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [tab, setTab] = useState("basic");
  const { hasRole } = useAdminRoles();
  const canOverride = hasRole("admin") || hasRole("store_manager");

  useEffect(() => {
    setForm(product ?? empty);
    setShowOverride(false);
    setOverrideReason("");
    setTab("basic");
  }, [product, open]);

  const update = <K extends keyof ProductRow>(k: K, v: ProductRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const updateMeta = (key: string, value: string | number | boolean | null) => {
    setForm((f) => ({ ...f, metadata: { ...(f.metadata ?? {}), [key]: value } }));
  };

  const dynamicFields = META_SCHEMA[form.source] ?? [];

  const marginInfo: MarginInfo = useMemo(() => {
    const sale = Number(form.price) || 0;
    const cost = Number(form.cost_price) || 0;
    const old = Number(form.old_price) || 0;
    const affiliate = Number(form.affiliate_commission_pct) || 0;

    if (cost <= 0 || sale <= 0) return { kind: "no_cost" };
    const margin = sale - cost;
    const marginPct = (margin / sale) * 100;
    const affiliateAmount = (sale * affiliate) / 100;
    const netProfit = margin - affiliateAmount;

    let discountStatus: "ok" | "warn" | "block" = "ok";
    let discountInfo: { discount: number; max: number; pct: number } | null = null;
    if (old > sale) {
      const discount = old - sale;
      const max = (old - cost) * 0.5;
      discountInfo = { discount, max, pct: (discount / old) * 100 };
      if (margin <= 0) discountStatus = "block";
      else if (discount > max) discountStatus = "block";
      else if (discount > max * 0.85) discountStatus = "warn";
    }

    let affiliateStatus: "ok" | "warn" | "block" = "ok";
    if (affiliate > 0) {
      if (netProfit < 0) affiliateStatus = "block";
      else if (netProfit < margin * 0.2) affiliateStatus = "warn";
    }

    return {
      kind: "ok",
      sale, cost, margin, marginPct,
      affiliate, affiliateAmount, netProfit,
      discountStatus, discountInfo, affiliateStatus,
    };
  }, [form.price, form.cost_price, form.old_price, form.affiliate_commission_pct]);

  const blocksSave =
    marginInfo.kind === "ok" &&
    ((marginInfo.discountStatus === "block" || marginInfo.affiliateStatus === "block")) &&
    !showOverride;

  const requiresOverride =
    marginInfo.kind === "ok" &&
    (marginInfo.discountStatus === "block" || marginInfo.affiliateStatus === "block");

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${form.source || "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl, image_path: path }));
      toast.success("تم رفع الصورة");
    } catch (err) {
      toast.error("فشل رفع الصورة: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("الاسم مطلوب"); setTab("basic"); return; }
    if (!form.category.trim()) { toast.error("الفئة مطلوبة"); setTab("basic"); return; }

    if (requiresOverride && !showOverride) {
      setShowOverride(true);
      setTab("pricing");
      toast.error("هذا الخصم يهدد الأرباح. ادخل سبب التجاوز اليدوي.");
      return;
    }
    if (requiresOverride && showOverride && overrideReason.trim().length < 10) {
      toast.error("سبب التجاوز يجب ألا يقل عن 10 أحرف");
      return;
    }

    setSaving(true);
    try {
      const productId = form.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const cleanMeta: ProductMetadata = {};
      for (const [k, v] of Object.entries(form.metadata ?? {})) {
        if (v === "" || v === null || v === undefined) continue;
        cleanMeta[k] = v;
      }

      const cleanVariants = (form.variants ?? []).filter(v => v.label.trim());
      const cleanAddons = (form.addons ?? []).filter(a => a.label.trim());

      const payload = {
        id: productId,
        name: form.name.trim(),
        brand: form.brand || null,
        unit: form.unit || "قطعة",
        price: Number(form.price) || 0,
        old_price: form.old_price ? Number(form.old_price) : null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        affiliate_commission_pct: Number(form.affiliate_commission_pct) || 0,
        image_url: form.image_url,
        image_path: form.image_path,
        rating: form.rating ? Number(form.rating) : null,
        category: form.category.trim(),
        sub_category: form.sub_category || null,
        source: form.source,
        badge: form.badge || null,
        stock: Number(form.stock) || 0,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        store_id: form.store_id || null,
        category_id: form.category_id || null,
        description: form.description || null,
        perishable: form.perishable,
        metadata: cleanMeta,
        variants: cleanVariants,
        addons: cleanAddons,
      };

      const { error } = isNew
        ? await supabase.from("products").insert(payload)
        : await supabase.from("products").update(payload).eq("id", form.id);

      if (error) throw error;

      if (requiresOverride && showOverride && marginInfo.kind === "ok" && marginInfo.discountInfo) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
        await supabase.from("discount_overrides" as never).insert({
          product_id: productId,
          product_name: form.name.trim(),
          override_by: user!.id,
          override_by_name: profile?.full_name ?? null,
          cost_price: marginInfo.cost,
          sale_price: Number(form.old_price) || marginInfo.sale,
          attempted_discount: marginInfo.discountInfo.discount,
          margin_amount: marginInfo.margin,
          reason: overrideReason.trim(),
        } as never);
      }

      toast.success(isNew ? "تم إنشاء المنتج" : "تم الحفظ");
      onSaved();
    } catch (err) {
      toast.error("خطأ: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Variant/addon helpers
  const addVariant = () => {
    const v: ProductVariantRow = { id: `v-${Date.now()}`, label: "", priceDelta: 0 };
    setForm((f) => ({ ...f, variants: [...(f.variants ?? []), v] }));
  };
  const updateVariant = (i: number, patch: Partial<ProductVariantRow>) => {
    setForm((f) => {
      const arr = [...(f.variants ?? [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...f, variants: arr };
    });
  };
  const removeVariant = (i: number) => {
    setForm((f) => ({ ...f, variants: (f.variants ?? []).filter((_, idx) => idx !== i) }));
  };
  const addAddon = () => {
    const a: ProductAddonRow = { id: `a-${Date.now()}`, label: "", price: 0 };
    setForm((f) => ({ ...f, addons: [...(f.addons ?? []), a] }));
  };
  const updateAddon = (i: number, patch: Partial<ProductAddonRow>) => {
    setForm((f) => {
      const arr = [...(f.addons ?? [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...f, addons: arr };
    });
  };
  const removeAddon = (i: number) => {
    setForm((f) => ({ ...f, addons: (f.addons ?? []).filter((_, idx) => idx !== i) }));
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="left"
        dir="rtl"
        className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="px-5 py-3 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
          <SheetTitle className="font-display text-[18px] text-right">
            {isNew ? "منتج جديد" : "تعديل المنتج"}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-4 h-10">
            <TabsTrigger value="basic" className="text-[12px]">أساسي</TabsTrigger>
            <TabsTrigger value="pricing" className="text-[12px]">التسعير</TabsTrigger>
            <TabsTrigger value="specs" className="text-[12px]">
              المواصفات {dynamicFields.length > 0 && <span className="ms-1 text-primary">•</span>}
            </TabsTrigger>
            <TabsTrigger value="options" className="text-[12px]">الخيارات</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="basic">
              <BasicInfoForm
                form={form}
                update={update}
                uploading={uploading}
                onUpload={handleUpload}
                categories={categories}
                stores={stores}
              />
            </TabsContent>
            <TabsContent value="pricing">
              <PricingAndInventory
                form={form}
                update={update}
                marginInfo={marginInfo}
                requiresOverride={requiresOverride}
                canOverride={canOverride}
                showOverride={showOverride}
                setShowOverride={setShowOverride}
                overrideReason={overrideReason}
                setOverrideReason={setOverrideReason}
              />
            </TabsContent>
            <TabsContent value="specs">
              <SpecsForm form={form} fields={dynamicFields} updateMeta={updateMeta} />
            </TabsContent>
            <TabsContent value="options">
              <OptionsBuilder
                variants={form.variants ?? []}
                addons={form.addons ?? []}
                addVariant={addVariant}
                updateVariant={updateVariant}
                removeVariant={removeVariant}
                addAddon={addAddon}
                updateAddon={updateAddon}
                removeAddon={removeAddon}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="bg-background/95 backdrop-blur border-t border-border/40 px-5 py-3 flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-surface-muted text-[14px] font-semibold press">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || blocksSave}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-[14px] font-semibold press flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? "إنشاء" : "حفظ"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
