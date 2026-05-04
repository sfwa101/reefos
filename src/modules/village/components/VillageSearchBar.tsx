import { memo } from "react";
import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const VillageSearchBar = memo(function VillageSearchBar({ value, onChange }: Props) {
  return (
    <div
      className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft"
      style={{ background: "#FFFDF8", border: "1px solid #E8DFC9" }}
    >
      <Search className="h-4 w-4" style={{ color: "#7B6A3F" }} strokeWidth={2.4} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ابحث في خيرات القرية…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
});

export default VillageSearchBar;
