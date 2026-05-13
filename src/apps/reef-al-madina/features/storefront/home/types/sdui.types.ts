/**
 * Reef SDUI types — re-export shim (Phase VIII-Restoration · V-1 Part A).
 * The canonical owner of these types is now the kernel:
 *   `@/core/runtime-ui/sdui/types`
 * This file remains as a backward-compatibility re-export so existing
 * Reef feature imports do not need to change in lockstep.
 */
export type {
  SectionKey,
  SectionConfig,
  LayoutStatus,
  UiLayout,
} from "@/core/runtime-ui/sdui/types";
