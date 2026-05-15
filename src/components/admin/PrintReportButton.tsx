import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton({ label = "تصدير / طباعة" }: { label?: string }) {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="no-print h-10 px-4 rounded-2xl bg-surface border border-border/60 text-[13px] font-semibold press inline-flex items-center gap-2"
    >
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}

export default PrintReportButton;
