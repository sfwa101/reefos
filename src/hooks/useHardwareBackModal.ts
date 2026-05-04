/**
 * useHardwareBackModal — Intercepts the device/browser Back button while a
 * modal/sheet is open and converts it into an `onClose()` call instead of
 * navigating away from the current route.
 *
 * Trick: when `isOpen` flips to true we push a sentinel state onto the
 * History stack. Pressing Back triggers a `popstate` event (instead of a
 * real navigation) which we intercept to close the sheet. On clean close
 * (user taps the X), we pop our sentinel back off so we don't leak history.
 */
import { useEffect } from "react";

export const useHardwareBackModal = (isOpen: boolean, onClose: () => void): void => {
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const sentinel = { __modalSentinel: true, ts: Date.now() };
    window.history.pushState(sentinel, "", window.location.href);

    const handlePop = (_e: PopStateEvent): void => {
      onClose();
    };

    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      // If our sentinel is still on top (sheet closed via UI not Back),
      // pop it so the user's real history isn't polluted.
      const current = window.history.state as { __modalSentinel?: boolean } | null;
      if (current && current.__modalSentinel) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
};

export default useHardwareBackModal;
