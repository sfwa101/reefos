/**
 * BarcodeScannerModal — global mount.
 *
 * Listens for `window.dispatchEvent(new CustomEvent("reef:open-barcode"))`
 * from anywhere in the app, opens the camera scanner sheet, and routes the
 * detected code to `/search?q=<code>` for instant lookup.
 *
 * Mounted once in <AppShell>. Pure presentation glue — heavy lifting lives
 * in `BarcodeScannerSheet` (camera + ZXing) inside `@/modules/search`.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BarcodeScannerSheet } from "@/modules/search";

const BarcodeScannerModal = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("reef:open-barcode", handler);
    return () => window.removeEventListener("reef:open-barcode", handler);
  }, []);

  const onDetected = useCallback(
    (code: string) => {
      setOpen(false);
      navigate({ to: "/search", search: { q: code } });
    },
    [navigate],
  );

  return (
    <BarcodeScannerSheet
      open={open}
      onClose={() => setOpen(false)}
      onDetected={onDetected}
    />
  );
};

export default BarcodeScannerModal;
