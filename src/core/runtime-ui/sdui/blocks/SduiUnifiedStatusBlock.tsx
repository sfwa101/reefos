/**
 * SduiUnifiedStatusBlock — Renders the SalsabilStatusBar inside SDUI.
 */
import { memo } from "react";
import { SalsabilStatusBar } from "@/core/runtime-ui/components/SalsabilStatusBar";

function Impl() {
  return <SalsabilStatusBar />;
}

export const SduiUnifiedStatusBlock = memo(Impl);
