/**
 * Sections — Phase 16.01 SDUI-driven hub.
 * ---------------------------------------
 * The page is now a thin shell. Layout content is fetched from
 * `sdui_layouts` (slug = "departments_hub"), validated by Zod, and
 * rendered through the SduiRenderer + BlockRegistry.
 *
 * Admin edits to the published version flow live to all users with
 * zero deploys; corrupted JSON degrades gracefully (bad blocks are
 * dropped, screen never crashes).
 */
import { useSduiLayout } from "@/core-os/sdui-engine/hooks/useSduiLayout";
import { SduiRenderer } from "@/core-os/sdui-engine/components/SduiRenderer";
import BackHeader from "@/components/BackHeader";

const Sections = () => {
  const { blocks, loading, error } = useSduiLayout("departments_hub");

  return (
    <div className="min-h-screen pb-24">
      <BackHeader title="مركز الأقسام" />

      {loading ? (
        <div className="px-4 py-8 space-y-4" aria-busy="true">
          <div className="h-28 rounded-3xl bg-card/40 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-card/40 animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          تعذّر تحميل الأقسام مؤقتاً.
        </div>
      ) : (
        <SduiRenderer
          blocks={blocks}
          empty={
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              لا توجد أقسام منشورة حالياً.
            </div>
          }
        />
      )}
    </div>
  );
};

export default Sections;
