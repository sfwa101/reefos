import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/_pos/pos/inventory")({
  component: PosInventoryStub,
});

function PosInventoryStub() {
  return (
    <div dir="rtl" className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Boxes className="h-5 w-5 text-primary" />
        <h1 className="font-display text-[20px]">المخزون الفوري</h1>
      </div>
      <p className="text-[13px] text-foreground-secondary mb-4">
        عرض مستويات المخزون لهذا الفرع. (قيد التفعيل في المرحلة التالية).
      </p>
      <Link to="/pos" className="text-[13px] text-primary hover:underline">→ العودة للبيع</Link>
    </div>
  );
}
