/**
 * Admin SDUI Block Registry
 * -------------------------
 * Single source of truth: `block.type` → renderer. The exhaustiveness
 * guard at the bottom forces a compile-time error if a new block kind
 * is added to the schema union without a renderer registered here.
 */
import type { ReactElement } from "react";
import type { AdminBlock } from "./schemas";
import { FormFieldBlock } from "./blocks/FormFieldBlock";
import { FieldGroupBlock } from "./blocks/FieldGroupBlock";
import { TableColumnBlock } from "./blocks/TableColumnBlock";
import { RpcButtonBlock } from "./blocks/RpcButtonBlock";
import { ComputedColumnBlock } from "./blocks/ComputedColumnBlock";

export interface AdminBlockContext {
  /** Current record (form mode) or row (table cell mode). */
  record?: Record<string, unknown>;
  /** react-hook-form control passthrough for form blocks. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: any;
  /** Active locale (ar | en | …). */
  locale?: string;
}

export function renderAdminBlock(
  block: AdminBlock,
  ctx: AdminBlockContext = {},
): ReactElement | null {
  switch (block.type) {
    case "form_field":
      return <FormFieldBlock block={block} ctx={ctx} />;
    case "field_group":
      return <FieldGroupBlock block={block} ctx={ctx} />;
    case "table_column":
      return <TableColumnBlock block={block} ctx={ctx} />;
    case "rpc_button":
      return <RpcButtonBlock block={block} ctx={ctx} />;
    case "computed_column":
      return <ComputedColumnBlock block={block} ctx={ctx} />;
    default: {
      // Compile-time exhaustiveness — extending AdminBlock without
      // registering a renderer here will fail typecheck.
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}
