import { createFileRoute, Link } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";

export const Route = createFileRoute("/_pos/pos/returns")({
  component: PosReturnsStub,
});

function PosReturnsStub() {
  return (
    <div dir="rtl" className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Undo2 className="h-5 w-5 text-primary" />
        <h1 className="font-display text-[20px]">المرتجعات</h1>
      </div>
      <p className="text-[13px] text-foreground-secondary mb-4">
        امسح إيصال البيع لاسترداد قيمته من درج الكاشير. (قيد التفعيل).
      </p>
      <Link to="/pos" className="text-[13px] text-primary hover:underline">→ العودة للبيع</Link>
    </div>
  );
}
