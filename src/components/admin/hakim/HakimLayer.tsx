/**
 * HakimLayer — Global AI overlay mounted inside AdminShell.
 *
 * Composes the ⌘K command bar and the side chat panel, and registers the
 * global keyboard shortcut (⌘K / Ctrl+K) that toggles the command bar.
 */
import { useEffect } from "react";

import { HakimCommandBar } from "./HakimCommandBar";
import { HakimSidePanel } from "./HakimSidePanel";
import { useHakimLayer } from "./useHakimLayer";

export function HakimLayer() {
  const toggleCommand = useHakimLayer((s) => s.toggleCommand);
  const close = useHakimLayer((s) => s.close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCommand();
        return;
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommand, close]);

  return (
    <>
      <HakimCommandBar />
      <HakimSidePanel />
    </>
  );
}
