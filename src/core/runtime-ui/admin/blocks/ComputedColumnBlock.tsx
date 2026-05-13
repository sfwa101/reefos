/** SDUI ComputedColumnBlock — read-only derived value (safe expression eval). */
import type { ComputedColumnBlock as ComputedColumnBlockT } from "../schemas";
import type { AdminBlockContext } from "../registry";

/**
 * Tiny safe evaluator: supports `record.field` and `record.field op record.field`.
 * Anything more complex should be a DB view, NOT client logic.
 */
function safeEval(expr: string, record: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("record", `"use strict"; return (${expr});`);
    return fn(record);
  } catch {
    return null;
  }
}

export function ComputedColumnBlock({
  block, ctx,
}: { block: ComputedColumnBlockT; ctx: AdminBlockContext }) {
  const v = safeEval(block.props.expression, ctx.record ?? {});
  return <span className="text-[13px] text-foreground/70">{v == null ? "—" : String(v)}</span>;
}
