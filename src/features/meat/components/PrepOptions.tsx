import { Check, ChefHat, Package, Sparkles } from "lucide-react";
import { toLatin } from "@/lib/format";
import { Panel } from "./Panel";
import {
  slaForPrep, slaMeta,
  type PrepOption, type PrepAddon, type PackagingOption,
} from "@/lib/butcheryPrep";

type Props = {
  preps: PrepOption[];
  prepId: string;
  onPrepChange: (id: string) => void;

  visibleAddons: PrepAddon[];
  addonIds: string[];
  onToggleAddon: (id: string) => void;

  packaging: PackagingOption[];
  packagingId: string;
  onPackagingChange: (id: string) => void;
};

export const PrepOptions = ({
  preps, prepId, onPrepChange,
  visibleAddons, addonIds, onToggleAddon,
  packaging, packagingId, onPackagingChange,
}: Props) => (
  <>
    {/* Prep */}
    <Panel
      icon={<ChefHat className="h-4 w-4 text-rose-600" />}
      title="طريقة التحضير"
      defaultOpen
    >
      <div className="grid grid-cols-1 gap-2">
        {preps.map((p) => {
          const active = p.id === prepId;
          const tier = slaForPrep(p);
          const tMeta = slaMeta[tier];
          return (
            <button
              key={p.id}
              onClick={() => onPrepChange(p.id)}
              className={`flex items-center justify-between gap-3 rounded-[14px] border-2 px-3 py-2.5 text-right transition ${
                active ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10" : "border-border bg-background"
              }`}
            >
              <span className="flex items-center gap-2 text-[12px] font-extrabold">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  active ? "border-rose-500 bg-rose-500" : "border-muted-foreground/40"
                }`}>
                  {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                </span>
                {p.label}
              </span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${tMeta.bgClass} ${tMeta.textClass}`}>
                  {tMeta.label}
                </span>
                {p.price > 0 && (
                  <span className="text-[11px] font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                    +{toLatin(p.price)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>

    {/* Conditional addons */}
    {visibleAddons.length > 0 && (
      <Panel
        icon={<Sparkles className="h-4 w-4 text-rose-600" />}
        title="إضافات"
        hint="(حسب التحضير)"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 gap-2">
          {visibleAddons.map((a) => {
            const active = addonIds.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => onToggleAddon(a.id)}
                className={`flex items-center justify-between gap-3 rounded-[14px] border-2 px-3 py-2.5 text-right transition ${
                  active ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10" : "border-border bg-background"
                }`}
              >
                <span className="flex items-center gap-2 text-[12px] font-extrabold">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] border-2 ${
                    active ? "border-rose-500 bg-rose-500" : "border-muted-foreground/40"
                  }`}>
                    {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                  </span>
                  {a.label}
                </span>
                <span className="text-[11px] font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                  {a.price > 0 ? `+${toLatin(a.price)} ج.م` : "مجاني"}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
    )}

    {/* Packaging */}
    <Panel
      icon={<Package className="h-4 w-4 text-rose-600" />}
      title="التغليف"
      defaultOpen={false}
    >
      <div className="grid grid-cols-2 gap-2">
        {packaging.map((p) => {
          const active = p.id === packagingId;
          return (
            <button
              key={p.id}
              onClick={() => onPackagingChange(p.id)}
              className={`flex flex-col items-start gap-0.5 rounded-[14px] border-2 px-3 py-2.5 text-right transition ${
                active ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10" : "border-border bg-background"
              }`}
            >
              <span className="text-[12px] font-extrabold">{p.label}</span>
              <span className="text-[10px] font-bold text-muted-foreground">
                {p.price > 0 ? `+${toLatin(p.price)} ج.م` : (p.hint ?? "مجاني")}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  </>
);
