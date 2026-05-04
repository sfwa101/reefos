/**
 * useHardwareBackModal — Intercepts the device/browser Back button while a
 * modal/sheet is open and converts it into an `onClose()` call instead of
 * navigating away from the current route.
 *
 * Stability: `onClose` is stored in a ref so it can change identity each
 * render without re-running the effect. The effect only re-runs when
 * `isOpen` actually flips, preventing an infinite pushState/back loop.
 */
import { useEffect, useRef } from "react";

export const useHardwareBackModal = (isOpen: boolean, onClose: () => void): void => {
  const savedOnClose = useRef(onClose);

  useEffect(() => {
    savedOnClose.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const sentinel = { __modalSentinel: true, ts: Date.now() };
    window.history.pushState(sentinel, "", window.location.href);

    const handlePop = (_e: PopStateEvent): void => {
      savedOnClose.current();
    };

    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      const current = window.history.state as { __modalSentinel?: boolean } | null;
      if (current && current.__modalSentinel) {
        window.history.back();
      }
    };
  }, [isOpen]);
};

export default useHardwareBackModal;
