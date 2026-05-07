/**
 * SduiOmniSearchBlock — Phase VIII multi-tenant omni-search SDUI wrapper.
 */
import { memo, useMemo } from "react";
import { SearchAtom, type OmniScope } from "@/core-os/capabilities/SearchAtom";
import { reefScope } from "@/core-os/capabilities/scopes/reefScope";
import type { SduiOmniSearchBlock as Props } from "../engine/schemas";

const SCOPE_MAP: Record<string, OmniScope> = {
  reef: reefScope,
};

function Impl({ block }: { block: Props }) {
  const scopes = useMemo(
    () => block.props.scopes.map((s) => SCOPE_MAP[s]).filter(Boolean),
    [block.props.scopes],
  );
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-3 shadow-sm">
      <SearchAtom scopes={scopes} placeholder={block.props.placeholder} />
    </div>
  );
}

export const SduiOmniSearchBlock = memo(Impl);
