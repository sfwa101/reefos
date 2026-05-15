// SchoolLibrary — Facade page composing the three student hub tabs.
// All sub-pieces live in src/features/library/. This file only owns top-level
// tab + KYC verification status state.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingBag, Library, Printer, Lock, FileText,
  CheckCircle2, Sparkles,
} from "lucide-react";
import BackHeader from "@/components/BackHeader";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { myKycStatusQueryOptions } from "@/lib/library.queries";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PALETTE, useLibraryProducts, type TabKey } from "@/apps/reef-al-madina/features/digital-borrowing/data";
import { BorrowCard } from "@/apps/reef-al-madina/features/digital-borrowing/components/BorrowCard";
import { KYCGateDialog } from "@/apps/reef-al-madina/features/digital-borrowing/components/KYCGateDialog";
import { BorrowSheet } from "@/apps/reef-al-madina/features/digital-borrowing/components/BorrowSheet";
import { BundlesGrid } from "@/apps/reef-al-madina/features/digital-borrowing/components/BundlesGrid";
import { PrintWizard } from "@/apps/reef-al-madina/features/digital-borrowing/components/PrintWizard";
import { Button } from "@/components/ui/button";

const SchoolLibrarySection = () => {
  const [tab, setTab] = useState<TabKey>("store");
  const [kycOpen, setKycOpen] = useState(false);
  const [borrowProduct, setBorrowProduct] = useState<Product | null>(null);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const { user } = useAuth();
  const { data: kyc } = useQuery(myKycStatusQueryOptions(!!user));
  const isVerified = !!kyc?.verified;

  const products = useLibraryProducts();

  const onBorrowClick = (p: Product) => {
    if (!user) { toast.error("سجل الدخول أولاً"); return; }
    if (!isVerified) { setKycOpen(true); return; }
    setBorrowProduct(p);
    setBorrowOpen(true);
  };

  return (
    <div>
      <BackHeader title="مركز الخدمات الطلابية" subtitle="مكتبة ذكية · استعارة · طباعة سحابية" accent="🎓 Student Hub" />

      {/* Hero */}
      <section className="rounded-[1.75rem] p-5 shadow-tile" style={{ background: `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.accent})` }}>
        <span className="text-[10px] font-bold text-white/90">جامعتك · مدرستك · مكتبك</span>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-white text-balance">
          كل ما يحتاجه طالبك<br />في مكان واحد
        </h2>
        <p className="mt-1 text-xs text-white/80">قرطاسية · كتب · استعارة · طباعة · حزم متخصصة</p>
      </section>

      {/* Tri-Navigation Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl p-1.5" style={{ background: PALETTE.primarySoft }}>
          <TabsTrigger value="store" className="flex flex-col gap-1 rounded-xl py-2.5 text-[11px] font-extrabold data-[state=active]:shadow-soft" style={{ color: tab === "store" ? PALETTE.primary : PALETTE.ink }}>
            <ShoppingBag className="h-4 w-4" /><span>🛍️ المتجر</span>
          </TabsTrigger>
          <TabsTrigger value="borrow" className="flex flex-col gap-1 rounded-xl py-2.5 text-[11px] font-extrabold data-[state=active]:shadow-soft" style={{ color: tab === "borrow" ? PALETTE.primary : PALETTE.ink }}>
            <Library className="h-4 w-4" /><span>📚 الاستعارة</span>
          </TabsTrigger>
          <TabsTrigger value="print" className="flex flex-col gap-1 rounded-xl py-2.5 text-[11px] font-extrabold data-[state=active]:shadow-soft" style={{ color: tab === "print" ? PALETTE.primary : PALETTE.ink }}>
            <Printer className="h-4 w-4" /><span>🖨️ الطباعة</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------- STORE TAB ---------- */}
        <TabsContent value="store" className="mt-4 space-y-5">
          <section>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Sparkles className="h-4 w-4" style={{ color: PALETTE.primary }} />
              <h3 className="font-display text-base font-extrabold">حزم طلابية ذكية</h3>
            </div>
            <BundlesGrid />
          </section>

          <section>
            <h3 className="mb-2 px-1 font-display text-base font-extrabold">قرطاسية وكتب</h3>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        </TabsContent>

        {/* ---------- BORROW TAB ---------- */}
        <TabsContent value="borrow" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl p-3 shadow-soft" style={{ background: isVerified ? "hsl(var(--surface-mint))" : PALETTE.primarySoft }}>
            {isVerified ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5" style={{ color: PALETTE.primary }} />}
            <div className="flex-1">
              <p className="font-display text-sm font-extrabold">{isVerified ? "حسابك موثق ✓" : "تحتاج إلى توثيق الهوية"}</p>
              <p className="text-[11px] text-muted-foreground">{isVerified ? "يمكنك استعارة أي كتاب الآن" : "وثّق هويتك مرة واحدة لتفعيل الاستعارة"}</p>
            </div>
            {!isVerified && (
              <Button onClick={() => setKycOpen(true)} className="rounded-full px-3 py-1.5 text-xs font-extrabold text-white" style={{ background: PALETTE.primary }}>وثّق</Button>
            )}
          </div>

          <div className="rounded-2xl bg-card p-3 text-[11px] leading-relaxed text-muted-foreground shadow-soft">
            <p className="mb-1 font-extrabold text-foreground">كيف يعمل النظام؟</p>
            <ul className="space-y-1">
              <li>• اختر مدة الاستعارة (3 أيام / أسبوع / أسبوعين).</li>
              <li>• ادفع سعر الاستعارة + تأمين مسترد بقيمة الكتاب.</li>
              <li>• أرجع الكتاب بحالة جيدة → يُسترد التأمين كاملاً للمحفظة.</li>
              <li>• غرامة التأخير: 5 ج.م/يوم تُخصم من التأمين.</li>
            </ul>
          </div>

          <div className="space-y-2">
            {products.filter((p) => p.category === "قصص" || p.subCategory === "كشاكيل").map((p) => (
              <BorrowCard key={p.id} product={p} onBorrow={onBorrowClick} />
            ))}
          </div>
        </TabsContent>

        {/* ---------- PRINT TAB ---------- */}
        <TabsContent value="print" className="mt-4">
          <div className="mb-3 flex items-center gap-3 rounded-2xl p-3 shadow-soft" style={{ background: PALETTE.primarySoft }}>
            <FileText className="h-5 w-5" style={{ color: PALETTE.primary }} />
            <div className="flex-1">
              <p className="font-display text-sm font-extrabold">مركز الطباعة السحابية</p>
              <p className="text-[11px] text-muted-foreground">ارفع · اختر · ادفع · استلم</p>
            </div>
          </div>
          <PrintWizard />
        </TabsContent>
      </Tabs>

      <KYCGateDialog open={kycOpen} onOpenChange={setKycOpen} />
      <BorrowSheet product={borrowProduct} open={borrowOpen} onOpenChange={setBorrowOpen} />

      <div className="h-24" />
    </div>
  );
};

export default SchoolLibrarySection;
