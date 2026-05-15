/**
 * SmartTagSuggester
 * -----------------
 * يحلل اسم المنتج ويقترح مرادفات/لهجات لإضافتها إلى metadata.aliases.
 * - اقتراحات تلقائية من قاموس المرادفات.
 * - حذف أي اقتراح، إضافة كلمات يدوية، إضافة الكل بضغطة واحدة.
 * Mobile-first.
 */
import { useDeferredValue, useMemo, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { suggestAliases, normalizeArabic } from "@/core/search/utils/arabicLogic";
import { Label } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SmartTagSuggesterProps {
  readonly productName: string;
  readonly aliases: readonly string[];
  readonly onChange: (next: string[]) => void;
}

function uniq(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const t = x.trim();
    if (!t) continue;
    const key = normalizeArabic(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

const SmartTagSuggester = ({ productName, aliases, onChange }: SmartTagSuggesterProps) => {
  const [manual, setManual] = useState("");
  const deferredName = useDeferredValue(productName);

  const currentSet = useMemo(
    () => new Set(aliases.map((a) => normalizeArabic(a))),
    [aliases],
  );

  const suggestions = useMemo(() => {
    const all = suggestAliases(deferredName);
    return all.filter((s) => !currentSet.has(normalizeArabic(s)));
  }, [deferredName, currentSet]);

  const addOne = (term: string) => {
    onChange(uniq([...aliases, term]));
  };

  const addAll = () => {
    onChange(uniq([...aliases, ...suggestions]));
  };

  const removeAlias = (term: string) => {
    onChange(aliases.filter((a) => a !== term));
  };

  const submitManual = () => {
    const t = manual.trim();
    if (!t) return;
    onChange(uniq([...aliases, t]));
    setManual("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label>كلمات بحث ومرادفات</Label>
        <span className="text-[10.5px] text-foreground-tertiary">
          تساعد العملاء في إيجاد المنتج بأي لهجة
        </span>
      </div>

      {/* Active aliases */}
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {aliases.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-[11.5px] font-bold text-primary"
            >
              {a}
              <Button
                type="button"
                onClick={() => removeAlias(a)}
                aria-label={`حذف ${a}`}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-2.5 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              اقتراحات ذكية ({suggestions.length})
            </span>
            <Button
              type="button"
              onClick={addAll}
              className="rounded-full bg-amber-600 px-3 py-1 text-[10.5px] font-extrabold text-white press"
            >
              إضافة الكل
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <Button
                key={s}
                type="button"
                onClick={() => addOne(s)}
                className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-foreground ring-1 ring-amber-300/60 press"
              >
                <Plus className="h-3 w-3" />
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Manual entry */}
      <div className="flex items-center gap-2">
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitManual();
            }
          }}
          placeholder="أضف كلمة يدوياً…"
          className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
        />
        <Button
          type="button"
          onClick={submitManual}
          disabled={!manual.trim()}
          className="h-10 px-3 rounded-xl bg-foreground text-background text-[12px] font-extrabold disabled:opacity-40 press"
        >
          إضافة
        </Button>
      </div>
    </div>
  );
};

export default SmartTagSuggester;
