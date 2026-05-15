/**
 * VisualPickerAtom — Visual choice (color swatches, textures, cut diagrams).
 * Salsabil Design Language: Simple · Premium · Minimalist.
 */
import { Check } from "lucide-react";
import { ACCENTS, type VisualPickerGroupSchema } from "../types";
import { Button } from "@/components/ui/button";

type Props = {
  group: VisualPickerGroupSchema;
  value: string | string[];
  onChange: (next: string | string[]) => void;
};

export const VisualPickerAtom = ({ group, value, onChange }: Props) => {
  const accent = ACCENTS[group.accent ?? "primary"];
  const isMulti = group.mode === "multi";
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);

  const toggle = (id: string) => {
    if (isMulti) {
      const next = new Set(selected);
      next.has(id) ? next.delete(id) : next.add(id);
      onChange(Array.from(next));
    } else onChange(id);
  };

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {group.options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <Button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => toggle(opt.id)}
            className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition disabled:opacity-40 ${
              active ? `${accent.ring} ${accent.bg}` : "border-border bg-background"
            }`}
            aria-pressed={active}
            aria-label={opt.label}
          >
            <span
              className="relative h-12 w-12 overflow-hidden rounded-xl ring-1 ring-border/40"
              style={
                opt.image
                  ? { backgroundImage: `url(${opt.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : opt.color
                    ? { backgroundColor: opt.color }
                    : undefined
              }
            >
              {active && (
                <span className={`absolute inset-0 flex items-center justify-center bg-black/30`}>
                  <Check className="h-5 w-5 text-white" strokeWidth={4} />
                </span>
              )}
            </span>
            <span className="line-clamp-1 text-[10.5px] font-extrabold leading-tight">
              {opt.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
};
