/**
 * SduiRenderer — drives a list of validated blocks through the registry.
 * Memoized per block id to prevent unnecessary re-renders. Errors inside
 * any single block are caught so one bad block can never break the page.
 */
import { memo, type ReactNode } from "react";
import { renderBlock } from "../engine/BlockRegistry";
import type { SduiBlock } from "../engine/schemas";

const SafeBlock = memo(
  function SafeBlock({ block }: { block: SduiBlock }) {
    try {
      return renderBlock(block);
    } catch (err) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.error(`[SDUI] block ${block.id} (${block.type}) failed`, err);
      }
      return null;
    }
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
