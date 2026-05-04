import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Home, Truck, Store, Settings2, CreditCard, BriefcaseBusiness } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRole } from "@/hooks/useUserRole";
import { VIEW_PATHS, writeActiveView, type ActiveView } from "@/lib/defaultView";

type ViewMeta = { key: ActiveView; label: string; icon: LucideIcon };

const VIEW_META: ViewMeta[] = [
  { key: "customer", label: "واجهة العميل", icon: Home },
  { key: "delivery", label: "واجهة المندوب", icon: Truck },
  { key: "vendor", label: "واجهة البائع", icon: Store },
  { key: "admin", label: "لوحة الإدارة", icon: Settings2 },
  { key: "cashier", label: "نقطة البيع", icon: CreditCard },
  { key: "staff", label: "بوابة الموظف", icon: BriefcaseBusiness },
];

const ADMIN_ROLES: ReadonlyArray<NonNullable<AppRole>> = ["admin", "branch_manager", "store_manager", "finance"];

function rolesToViews(roles: NonNullable<AppRole>[]): ActiveView[] {
  const set = new Set<ActiveView>(["customer"]);
  if (roles.includes("delivery")) set.add("delivery");
  if (roles.includes("vendor")) set.add("vendor");
  if (roles.some((r) => ADMIN_ROLES.includes(r))) set.add("admin");
  if (roles.includes("cashier")) set.add("cashier");
  if (roles.includes("staff")) set.add("staff");
  return VIEW_META.filter((v) => set.has(v.key)).map((v) => v.key);
}

type Props = {
  roles: NonNullable<AppRole>[];
  customerId: string;
};

const IdChip = ({ withChevron, customerId }: { withChevron: boolean; customerId: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground/15 px-2 py-1 ring-1 ring-foreground/20 backdrop-blur-md">
    <span className="text-[8.5px] font-bold opacity-70 tracking-[0.18em]">ID</span>
    <span dir="ltr" className="font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.22em] opacity-90">
      {customerId}
    </span>
    {withChevron && <ChevronDown className="h-3 w-3 opacity-80" strokeWidth={2.6} />}
  </span>
);

const RoleSwitcher = ({ roles, customerId }: Props) => {
  const navigate = useNavigate();
  const views = rolesToViews(roles);
  const switchable = views.length > 1;

  const Chip = (
    <IdChip withChevron={switchable} customerId={customerId} />
  );

  if (!switchable) return Chip;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="تبديل الواجهة"
          className="outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded-md"
        >
          {Chip}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[220px] rounded-2xl border-border/40 bg-background/70 p-1.5 shadow-xl backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-[10.5px] font-extrabold tracking-[0.18em] text-muted-foreground">
          تبديل الواجهة
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40" />
        {VIEW_META.filter((v) => views.includes(v.key)).map(({ key, label, icon: Icon }) => (
          <DropdownMenuItem
            key={key}
            onSelect={() => {
              writeActiveView(key);
              navigate({ to: VIEW_PATHS[key] });
            }}
            className="cursor-pointer rounded-xl px-3 py-2 text-[13px] font-bold focus:bg-foreground/10"
          >
            <Icon className="ml-2 h-4 w-4 opacity-80" strokeWidth={2.4} />
            <span className="flex-1">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;
