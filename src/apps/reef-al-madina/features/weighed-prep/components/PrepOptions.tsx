/**
 * PrepOptions — Butchery prep / addons / packaging selectors.
 * Refactored to delegate to the Universal Modifier Engine via
 * ModifierOrchestrator. The Panel-wrapped layout is preserved by
 * grouping the Atoms inside the existing collapsible Panels.
 */
import { ChefHat, Package, Sparkles } from "lucide-react";
import { Panel } from "./Panel";
import {
  SelectionAtom,
  type SelectionGroupSchema,
} from "@/core/commerce/modifier-engine";
import {
  slaForPrep, slaMeta,
  type PrepOption, type PrepAddon, type PackagingOption,
} from "@/lib/weighed-prep-rules";

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
}: Props) => {
  const prepGroup: SelectionGroupSchema = {
    kind: "selection",
    id: "prep",
    title: "طريقة التحضير",
    mode: "single",
    accent: "rose",
    options: preps.map((p) => {
      const tMeta = slaMeta[slaForPrep(p)];
      return {
        id: p.id,
        label: p.label,
        price: p.price,
        hint: tMeta.label,
      };
    }),
  };

  const addonsGroup: SelectionGroupSchema = {
    kind: "selection",
    id: "addons",
    title: "إضافات",
    mode: "multi",
    accent: "rose",
    options: visibleAddons.map((a) => ({
      id: a.id,
      label: a.label,
      price: a.price,
      hint: a.price > 0 ? undefined : "مجاني",
    })),
  };

  const packagingGroup: SelectionGroupSchema = {
    kind: "selection",
    id: "packaging",
    title: "التغليف",
    mode: "single",
    layout: "grid",
    accent: "rose",
    options: packaging.map((p) => ({
      id: p.id,
      label: p.label,
      price: p.price,
      hint: p.price > 0 ? undefined : (p.hint ?? "مجاني"),
    })),
  };

  return (
    <>
      <Panel
        icon={<ChefHat className="h-4 w-4 text-rose-600" />}
        title="طريقة التحضير"
        defaultOpen
      >
        <SelectionAtom
          group={prepGroup}
          value={prepId}
          onChange={(v) => onPrepChange(v as string)}
        />
      </Panel>

      {visibleAddons.length > 0 && (
        <Panel
          icon={<Sparkles className="h-4 w-4 text-rose-600" />}
          title="إضافات"
          hint="(حسب التحضير)"
          defaultOpen={false}
        >
          <SelectionAtom
            group={addonsGroup}
            value={addonIds}
            onChange={(v) => {
              const next = new Set(v as string[]);
              const prev = new Set(addonIds);
              // Emit per-id toggle so parent's existing handler keeps working.
              for (const id of next) if (!prev.has(id)) onToggleAddon(id);
              for (const id of prev) if (!next.has(id)) onToggleAddon(id);
            }}
          />
        </Panel>
      )}

      <Panel
        icon={<Package className="h-4 w-4 text-rose-600" />}
        title="التغليف"
        defaultOpen={false}
      >
        <SelectionAtom
          group={packagingGroup}
          value={packagingId}
          onChange={(v) => onPackagingChange(v as string)}
        />
      </Panel>
    </>
  );
};
