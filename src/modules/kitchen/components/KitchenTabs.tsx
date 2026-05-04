import { memo, type ReactNode } from "react";
import type { KitchenTab } from "../types";

interface TabBtnProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

const TabBtn = memo(({ active, onClick, children }: TabBtnProps) => (
  <button
    onClick={onClick}
    className={`rounded-full py-2 text-xs font-bold transition ${
      active
        ? "bg-card text-foreground shadow-sm"
        : "bg-transparent text-muted-foreground"
    }`}
  >
    {children}
  </button>
));
TabBtn.displayName = "TabBtn";

interface Props {
  readonly tab: KitchenTab;
  readonly onChange: (t: KitchenTab) => void;
}

const KitchenTabsComponent = ({ tab, onChange }: Props) => (
  <div className="sticky top-[56px] z-30 -mx-4 mb-3 bg-background/85 px-4 py-2">
    <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
      <TabBtn active={tab === "daily"} onClick={() => onChange("daily")}>
        وجبات فورية
      </TabBtn>
      <TabBtn active={tab === "weekly"} onClick={() => onChange("weekly")}>
        المنيو الأسبوعي
      </TabBtn>
    </div>
  </div>
);

export const KitchenTabs = memo(KitchenTabsComponent);
