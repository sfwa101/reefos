/** AdminBlockRenderer — safe wrapper that catches per-block crashes. */
import { memo } from "react";
import { renderAdminBlock, type AdminBlockContext } from "../registry";
import type { AdminBlock } from "../schemas";
import { Tracer } from "@/core/system/observability/Tracer";

export const AdminBlockRenderer = memo(function AdminBlockRenderer({
  block, ctx,
}: { block: AdminBlock; ctx?: AdminBlockContext }) {
  try {
    return renderAdminBlock(block, ctx ?? {});
  } catch (err) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      Tracer.error("runtime-ui", "log", { args: [`[AdminSDUI] block ${block.id} (${block.type}) crashed`, err] });
    }
    return null;
  }
});
