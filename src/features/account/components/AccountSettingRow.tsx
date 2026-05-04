import { Link } from "@tanstack/react-router";
import { ChevronLeft, BadgeCheck, type LucideIcon } from "lucide-react";
import type { SettingItem } from "../data";

type Props = {
  item: SettingItem;
  badge?: { tone: "success" | "warning" | "info"; label: string } | null;
};

const toneClass: Record<NonNullable<Props["badge"]>["tone"], string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

const AccountSettingRow = ({ item, badge }: Props) => {
  const Icon: LucideIcon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex w-full items-center gap-3 px-4 py-3 text-right transition active:bg-foreground/5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold">{item.label}</p>
          {badge?.tone === "success" && <BadgeCheck className="h-3.5 w-3.5 text-success" />}
          {badge && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${toneClass[badge.tone]}`}>
              {badge.label}
            </span>
          )}
        </div>
        {item.sub && <p className="text-[10.5px] text-muted-foreground">{item.sub}</p>}
      </div>
      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
};

export default AccountSettingRow;
