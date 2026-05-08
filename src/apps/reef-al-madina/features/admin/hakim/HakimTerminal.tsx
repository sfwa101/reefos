/**
 * HakimTerminal — Phase 16: The Emperor's command surface.
 * Imperial Black aesthetic. Prompt → Sovereign Blueprint → one-click mint.
 */
import { useState } from "react";
import { Bot, Loader2, Sparkles, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useHakimExecutor,
  type HakimBlueprint,
  type ExecutionReport,
} from "./hooks/useHakimExecutor";

export default function HakimTerminal() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<HakimBlueprint | null>(null);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const executor = useHakimExecutor();

  const summon = async () => {
    if (!prompt.trim()) {
      toast.error("اكتب أمراً للإمبراطور أولاً");
      return;
    }
    setLoading(true);
    setReport(null);
    setBlueprint(null);
    try {
      const { data, error } = await supabase.functions.invoke("hakim_architect", {
        body: { prompt },
      });
      if (error) throw new Error(error.message ?? "ai_invoke_failed");
      if (!data?.ok || !data?.blueprint) throw new Error(data?.error ?? "no_blueprint");
      setBlueprint(data.blueprint as HakimBlueprint);
      toast.success("تم استدعاء حكيم — المخطط جاهز للمراجعة");
    } catch (e) {
      toast.error(`حكيم لم يستجب: ${e instanceof Error ? e.message : "خطأ"}`);
    } finally {
      setLoading(false);
    }
  };

  const execute = async () => {
    if (!blueprint) return;
    const r = await executor.mutateAsync(blueprint);
    setReport(r);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-zinc-100 p-4 lg:p-8"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center">
            <Bot className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-amber-50">
              حكيم — المهندس الإمبراطوري
            </h1>
            <p className="text-sm text-zinc-400">
              ترجمة الأوامر إلى مخططات سيادية قابلة للتنفيذ.
            </p>
          </div>
        </div>

        {/* Prompt */}
        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Terminal className="h-3.5 w-3.5" />
            <span>EMPEROR&gt; إصدار أمر بناء قطاع جديد</span>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: أنشئ قطاعاً لتأجير معدات الأفراح يشمل الكراسي، الطاولات، أنظمة الصوت، والإضاءة."
            className="min-h-32 bg-black/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={summon}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الاستدعاء…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  استدعاء حكيم
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Blueprint */}
        {blueprint && (
          <Card className="bg-zinc-900/60 border-amber-900/40 p-5 space-y-4">
            <div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                مخطط سيادي
              </Badge>
              <h2 className="mt-2 text-2xl font-bold text-amber-50">
                {blueprint.module_name}
              </h2>
              <p className="text-zinc-300 mt-1">{blueprint.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2 uppercase tracking-wide">
                الأصول المقترحة ({blueprint.suggested_assets.length})
              </h3>
              <div className="grid gap-2">
                {blueprint.suggested_assets.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-800 bg-black/40 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-100">{a.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                          {a.asset_type}
                        </Badge>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                          {a.pricing_model}
                        </Badge>
                        {Object.entries(a.traits ?? {}).slice(0, 3).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="border-zinc-800 text-zinc-500">
                            {k}: {String(v)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-amber-300 font-mono text-sm whitespace-nowrap">
                      {a.base_price.toLocaleString("ar-EG")} EGP
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <Button
                onClick={execute}
                disabled={executor.isPending}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
              >
                {executor.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري السكّ…
                  </>
                ) : (
                  <>اعتماد وسكّ القطاع</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Report */}
        {report && (
          <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold text-zinc-100">
                نُسجت {report.minted.length} / {report.total} أصول
              </span>
            </div>
            {report.failed.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  أصول فشلت ({report.failed.length}):
                </div>
                <ul className="text-xs text-zinc-400 list-disc list-inside">
                  {report.failed.map((f, i) => (
                    <li key={i}>
                      <span className="text-zinc-200">{f.name}</span> — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
