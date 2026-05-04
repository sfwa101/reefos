/**
 * useBarcodeScanner — wraps @zxing/browser to scan from device camera.
 *
 * Returns `start(videoEl)` / `stop()` controls. Designed for mobile-first:
 * prefers the rear camera (`facingMode: environment`) when available.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export interface UseBarcodeScannerOptions {
  readonly onDetected: (code: string) => void;
}

export interface UseBarcodeScannerResult {
  readonly start: (video: HTMLVideoElement) => Promise<void>;
  readonly stop: () => void;
  readonly active: boolean;
  readonly error: string | null;
}

export function useBarcodeScanner({ onDetected }: UseBarcodeScannerOptions): UseBarcodeScannerResult {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async (video: HTMLVideoElement) => {
    setError(null);
    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      const reader = readerRef.current;
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video,
        (result, err) => {
          if (result) onDetected(result.getText());
          // err is expected on every non-detection frame; ignore
          void err;
        },
      );
      controlsRef.current = controls;
      setActive(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذر تشغيل الكاميرا";
      setError(msg);
      setActive(false);
    }
  }, [onDetected]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, active, error };
}
