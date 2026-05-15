import { Sparkles, Loader2, MessageCircle } from "lucide-react";
import { useHakimPulseBanner } from "@/hooks/useHakimPulseBanner";
import { Button } from "@/components/ui/button";

export function HakimPulseBanner({
  metrics, page = "finance", onChat,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: Record<string, any>;
  page?: string;
  onChat?: () => void;
}) {
  const { pulse, loading, error } = useHakimPulseBanner(metrics, page);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-[hsl(var(--purple))]/8 p-4 lg:p-5 shadow-soft">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12),transparent_55%)] pointer-events-none" />
      <div className="relative flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--purple))] text-white flex items-center justify-center shadow-md shrink-0">
          <Sparkles className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-[14px]">نبضة حكيم</span>
            <span className="text-[10px] bg-success/15 text-success rounded-full px-2 py-0.5 font-semibold">مباشر</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-[13px] text-foreground-tertiary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              يقرأ حكيم الأرقام الآن…
            </div>
          ) : error ? (
            <p className="text-[12.5px] text-destructive">{error}</p>
          ) : (
            <p className="text-[13.5px] leading-relaxed text-foreground-secondary">{pulse || "—"}</p>
          )}
        </div>
        {onChat && (
          <Button
            onClick={onChat}
            className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold bg-primary text-primary-foreground rounded-full px-3 py-1.5 shadow-sm hover:shadow-md press"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            اسأل حكيم
          </Button>
        )}
      </div>
    </div>
  );
}
