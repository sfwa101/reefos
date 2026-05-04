import { memo } from "react";
import { HEALTH_TAGS } from "@/lib/villageMeta";
import { SUB_CATS, type VillageTagFilter } from "../types";

interface Props {
  subCat: string;
  setSubCat: (v: string) => void;
  tag: VillageTagFilter;
  setTag: (v: VillageTagFilter) => void;
}

const VillageFilterChips = memo(function VillageFilterChips({
  subCat,
  setSubCat,
  tag,
  setTag,
}: Props) {
  return (
    <>
      {/* Sub-category chips */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {SUB_CATS.map((c) => {
          const active = subCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSubCat(c.id)}
              className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition"
              style={
                active
                  ? { background: "#5A6E3A", color: "#FBF7EE" }
                  : { background: "#FFFDF8", color: "#3A341E", border: "1px solid #E8DFC9" }
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Health filter pills */}
      <div className="mt-4">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "#7B6A3F" }}
        >
          فلترة حسب الأسلوب الصحي
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          <button
            onClick={() => setTag("all")}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition"
            style={
              tag === "all"
                ? { background: "#3A341E", color: "#F0E5C2" }
                : { background: "#FFFDF8", color: "#3A341E", border: "1px solid #E8DFC9" }
            }
          >
            الكل
          </button>
          {HEALTH_TAGS.map((h) => {
            const active = tag === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setTag(h.id)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition"
                style={
                  active
                    ? { background: "#3A341E", color: "#F0E5C2" }
                    : { background: "#FFFDF8", color: "#3A341E", border: "1px solid #E8DFC9" }
                }
              >
                <span className="me-1">{h.emoji}</span>
                {h.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
});

export default VillageFilterChips;
