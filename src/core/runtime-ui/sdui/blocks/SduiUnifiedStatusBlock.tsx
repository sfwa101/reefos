/**
 * SduiUnifiedStatusBlock — Renders the SalsabilStatusBar inside SDUI.
 */
import { memo } from "react";
import { SalsabilStatusBar } from "@/components/system/SalsabilStatusBar";

function Impl() {
  return <SalsabilStatusBar />;
}

export const SduiUnifiedStatusBlock = memo(Impl);
