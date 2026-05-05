/**
 * Supermarket — Phase 19 SDUI hub.
 * Layout JSON drives sections + product rails (slug = "supermarket_hub").
 * Tapping any product card opens the SmartProductSheet via context.
 */
import BackHeader from "@/components/BackHeader";
import { useSduiLayout } from "@/features/sdui/hooks/useSduiLayout";
import { SduiRenderer } from "@/features/sdui/components/SduiRenderer";
import { storeThemes } from "@/lib/storeThemes";

const Supermarket = () => {
  const theme = storeThemes.supermarket;
  const { blocks, loading, error } = useSduiLayout("supermarket_hub");

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: `linear-gradient(180deg, hsl(${theme.soft}) 0%, hsl(var(--background)) 320px)`,
      }}
    >
      <BackHeader title="السوبرماركت" />
      {loading ? (
        <div className="px-4 py-6 space-y-4" aria-busy="true">
          <div className="h-28 rounded-3xl bg-card/40 animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          تعذّر تحميل السوبرماركت مؤقتاً.
        </div>
      ) : (
        <SduiRenderer blocks={blocks} />
      )}
    </div>
  );
};

export default Supermarket;
