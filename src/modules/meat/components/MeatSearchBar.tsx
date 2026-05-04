import { memo } from "react";
import { Search } from "lucide-react";

interface Props {
  readonly value: string;
  readonly onChange: (v: string) => void;
}

const MeatSearchBarComponent = ({ value, onChange }: Props) => (
  <div className="glass mb-4 mt-5 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft">
    <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="ابحث في اللحوم والمجمدات…"
      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
    />
  </div>
);

export const MeatSearchBar = memo(MeatSearchBarComponent);
