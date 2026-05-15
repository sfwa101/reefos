/**
 * BarcodeScannerSheet — fullscreen camera sheet that streams barcodes
 * to the parent via `onDetected`.
 */
import { useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { Button } from "@/components/ui/button";

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onDetected: (code: string) => void;
}

export const BarcodeScannerSheet = ({ open, onClose, onDetected }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { start, stop, active, error } = useBarcodeScanner({
    onDetected: (code) => {
      onDetected(code);
      stop();
      onClose();
    },
  });

  useEffect(() => {
    if (!open) { stop(); return; }
    const video = videoRef.current;
    if (video) void start(video);
    return () => stop();
  }, [open, start, stop]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-3">
        <Button
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X className="h-4 w-4" />
        </Button>
        <p className="text-sm font-extrabold text-white">امسح باركود المنتج</p>
        <span className="w-9" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {/* viewport frame */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-72 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>
        {!active && !error && (
          <div className="absolute inset-x-0 bottom-12 flex justify-center text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {error && (
          <p className="absolute inset-x-4 bottom-10 rounded-xl bg-destructive/90 px-3 py-2 text-center text-xs font-extrabold text-destructive-foreground">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
