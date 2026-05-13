/**
 * SduiModifierGroupBlock — SDUI bridge for the Universal Modifier Engine.
 *
 * The block ships a single modifier group (selection / text / quantity).
 * State is local to the block instance — when wired into a product sheet
 * via the System Editor, the host orchestrator collects the selections
 * and bundles them with the cart line.
 */
import { useState } from "react";
import { ModifierOrchestrator, type ModifierGroupSchema, type ModifierState } from "@/core/commerce/modifier-engine";
import type { SduiModifierGroupBlock } from "../engine/schemas";

type Props = { block: SduiModifierGroupBlock };

export const SduiModifierBlock = ({ block }: Props) => {
  // The schema's nested `props` IS the group definition.
  const group = block.props as unknown as ModifierGroupSchema;
  const [state, setState] = useState<ModifierState>({});
  return (
    <div className="space-y-3">
      <ModifierOrchestrator
        groups={[group]}
        state={state}
        onChange={(id, value) => setState((s) => ({ ...s, [id]: value }))}
      />
    </div>
  );
};
