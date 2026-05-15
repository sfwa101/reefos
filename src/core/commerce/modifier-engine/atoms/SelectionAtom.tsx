/**
 * SelectionAtom — Single (radio) or Multi (checkbox) choice picker.
 * Pure UI atom of the Universal Modifier Engine.
 */
import { Check } from "lucide-react";
import { toLatin } from "@/lib/format";
import { ACCENTS, type SelectionGroupSchema } from "../types";
import { Button } from "@/components/ui/button";

type Props = {
  group: SelectionGroupSchema;
  value: string | string[];
  onChange: (next: string | string[]) => void;
};

export const SelectionAtom = ({ group, value, onChange }: Props) => {
  const accent = ACCENTS[group.accent ?? "primary"];
  const isMulti = group.mode === "multi";
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);

  const toggle = (id: string) => {
    if (isMulti) {
      const next = new Set(selected);
      next.has(id) ? next.delete(id) : next.add(id);
      onChange(Array.from(next));
    } else {
      onChange(id);
    }
  };

  const cols = group.layout === "grid" ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={`grid gap-2 ${cols}`}>
      {group.options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <Button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => toggle(opt.id)}
            className={`flex items-center justify-between gap-3 rounded-[14px] border-2 px-3 py-2.5 text-right transition disabled:opacity-50 ${
              active ? `${accent.ring} ${accent.bg}` : "border-border bg-background"
            }`}
          >
            <span className="flex items-center gap-2 text-[12px] font-extrabold">
              <span
                className={`flex h-4 w-4 items-center justify-center border-2 ${
                  isMulti ? "rounded-[5px]" : "rounded-full"
                } ${active ? `${accent.ring} ${accent.dot}` : "border-muted-foreground/40"}`}
              >
                {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
              </span>
              {opt.label}
            </span>
            <span className="flex items-center gap-2">
              {opt.hint && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {opt.hint}
                </span>
              )}
              {opt.price !== undefined && opt.price > 0 && (
                <span className={`text-[11px] font-extrabold tabular-nums ${accent.text}`}>
                  +{toLatin(opt.price)}
                </span>
              )}
            </span>
          </Button>
        );
      })}
    </div>
  );
};
