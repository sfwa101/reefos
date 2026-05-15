import { Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EmptyState = ({ onScan }: { onScan: () => void }) => (
  <div className="rounded-2xl bg-card/80 p-6 text-center ring-1 ring-border/40">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
      <Sparkles className="h-6 w-6 text-primary" />
    </div>
    <p className="text-[13px] font-extrabold text-foreground">لم نجد منتجات هنا بعد</p>
    <p className="mt-1 text-[11px] text-muted-foreground">
      جرّب الماسح الذكي للعثور على البدائل المناسبة
    </p>
    <Button
      onClick={onScan}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-extrabold text-primary-foreground active:scale-95"
    >
      <Camera className="h-3.5 w-3.5" /> امسح عبوة دواء
    </Button>
  </div>
);
