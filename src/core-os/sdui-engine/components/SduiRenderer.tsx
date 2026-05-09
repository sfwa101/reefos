/**
 * SduiRenderer — drives a list of validated blocks through the registry.
 * Memoized per block id to prevent unnecessary re-renders. Errors inside
 * any single block are caught so one bad block can never break the page.
 */
import { memo, type ReactNode } from "react";
import { renderBlock } from "../engine/BlockRegistry";
import type { SduiBlock } from "../engine/schemas";
import { SDUIErrorBoundary } from "./SDUIErrorBoundary";

const SafeBlock = memo(
  function SafeBlock({ block }: { block: SduiBlock }) {
    return (
      <SDUIErrorBoundary blockId={block.id} blockKind={`sdui:${block.type}`}>
        {renderBlock(block)}
      </SDUIErrorBoundary>
    );
  },
  (prev, next) => prev.block === next.block,
);

export function SduiRenderer({
  blocks,
  empty,
}: {
  blocks: ReadonlyArray<SduiBlock>;
  empty?: ReactNode;
}) {
  if (blocks.length === 0) return <>{empty ?? null}</>;
  return (
    <div className="flex flex-col gap-5 py-3">
      {blocks.map((b) => (
        <SafeBlock key={b.id} block={b} />
      ))}
    </div>
  );
}
