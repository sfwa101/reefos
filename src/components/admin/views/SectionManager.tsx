// Section Manager Workbench — Wave R-3 · Step 7 (Shell only).
// 3-pane layout: Palette · Canvas (with zone tabs) · Inspector.
// DnD wiring & detailed inspector controls are deferred to later steps.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout, Save, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getAppSettingsFn,
  upsertAppSettingFn,
} from "@/core/system/admin-settings.functions";
import {
  MOBILE_HOME_LAYOUT_DRAFT_KEY,
  MOBILE_HOME_LAYOUT_KEY,
  type MobileHomeLayoutV1,
} from "@/lib/section-manager.types";
import {
  useSectionManagerStore,
  type ZoneTab,
} from "@/components/admin/section-manager/useSectionManagerStore";
import { LayoutCanvas } from "@/components/admin/section-manager/LayoutCanvas";
import { BlockPalette } from "@/components/admin/section-manager/BlockPalette";
import { BlockInspector } from "@/components/admin/section-manager/BlockInspector";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TAB_LABELS: Record<ZoneTab, string> = {
  all: "الكل",
  home_feed: "الرئيسية",
  stories: "الستوري",
  grid: "الشبكة",
};

export default function SectionManager() {
  const fetchSettings = useServerFn(getAppSettingsFn);
  const upsertSetting = useServerFn(upsertAppSettingFn);

  const {
    draftDoc,
    publishedDoc,
    dirty,
    activeTab,
    setTab,
    init,
    markClean,
  } = useSectionManagerStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bundle = await fetchSettings({
          data: { keys: [MOBILE_HOME_LAYOUT_KEY, MOBILE_HOME_LAYOUT_DRAFT_KEY] },
        });
        if (cancelled) return;
        const pub = (bundle[MOBILE_HOME_LAYOUT_KEY] ?? null) as MobileHomeLayoutV1 | null;
        const drf = (bundle[MOBILE_HOME_LAYOUT_DRAFT_KEY] ?? null) as MobileHomeLayoutV1 | null;
        init(pub && Object.keys(pub).length ? pub : null, drf && Object.keys(drf).length ? drf : null);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSettings, init]);

  const onSaveDraft = async () => {
    if (!draftDoc) return;
    setSaving("draft");
    try {
      await upsertSetting({ data: { key: MOBILE_HOME_LAYOUT_DRAFT_KEY, value: draftDoc } });
      toast.success("تم حفظ المسودة");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const onPublish = async () => {
    if (!draftDoc) return;
    setSaving("publish");
    try {
      await upsertSetting({ data: { key: MOBILE_HOME_LAYOUT_KEY, value: draftDoc } });
      markClean(draftDoc);
      toast.success("تم النشر");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 glass-strong shadow-soft rounded-2xl p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Layout className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg">محرر ترتيب الأقسام</h1>
          <p className="text-[11px] text-foreground-tertiary mt-0.5">
            {publishedDoc ? `${publishedDoc.blocks.length} قسم منشور` : "لا توجد نسخة منشورة"}
            {dirty ? " · تغييرات غير محفوظة" : ""}
          </p>
        </div>
        <Button
          onClick={onSaveDraft}
          disabled={!dirty || saving !== null || loading}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-surface-muted text-foreground text-[12.5px] font-semibold press disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving === "draft" ? "..." : "حفظ مسودة"}
        </Button>
        <Button
          onClick={onPublish}
          disabled={!draftDoc || saving !== null || loading}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold press disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {saving === "publish" ? "..." : "نشر"}
        </Button>
      </header>

      {/* 3-pane Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Block Palette */}
        <aside className="lg:col-span-3">
          <BlockPalette />
        </aside>

        {/* Center: Canvas */}
        <section className="lg:col-span-6">
          <div className="bg-surface rounded-2xl border border-border/40 min-h-[600px]">
            {/* Zone Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-border/40">
              {(Object.keys(TAB_LABELS) as ZoneTab[]).map((t) => (
                <Button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "text-[12px] px-3 py-1.5 rounded-lg press transition-base",
                    activeTab === t
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground-secondary hover:bg-surface-muted",
                  )}
                >
                  {TAB_LABELS[t]}
                </Button>
              ))}
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-surface-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <LayoutCanvas />
              )}
            </div>
          </div>
        </section>

        {/* Right: Inspector */}
        <aside className="lg:col-span-3">
          <BlockInspector />
        </aside>
      </div>
    </div>
  );
}
