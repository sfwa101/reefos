import { Layout } from "lucide-react";
import { LayoutEditorGrid } from "@/core/runtime-ui/system-editor/LayoutEditorGrid";

export default function DesignEditor() {
  return (
    <div className="space-y-5">
      <header className="glass-strong shadow-soft rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Layout className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl">محرر تصميم الواجهة</h1>
            <p className="text-xs text-foreground-tertiary mt-0.5">
              رتّب أقسام الصفحة الرئيسية، فعّل/أوقف ما تشاء، ثم انشر — بدون كود.
            </p>
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-sm">الصفحة: الرئيسية (home)</h2>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground-tertiary">
            SDUI · ui_layouts
          </span>
        </div>
        <LayoutEditorGrid pageKey="home" />
      </section>
    </div>
  );
}
