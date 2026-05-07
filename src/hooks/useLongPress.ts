/**
 * useLongPress — pointer-event long-press detector with haptic "thud".
 *
 * Why pointer events (not touch/mouse separately):
 *   • Single source of truth across iOS Safari, Android Chrome, desktop.
 *   • Cancels cleanly when the user starts scrolling (pointermove > threshold).
 *
 * Behaviour:
 *   • After `delay` ms with the pointer held within `moveThreshold` px of
 *     the initial point, fires `onLongPress(event)` and triggers a 15ms
 *     `navigator.vibrate` haptic on supporting devices.
 *   • If the pointer moves past the threshold, lifts, leaves, or the
 *     element loses pointer capture, the timer is cancelled — no fire.
 *   • Spread the returned handlers directly onto any element:
 *       <div {...useLongPress(handlePeek)} />
 */
import { useCallback, useEffect, useRef } from "react";

export interface UseLongPressOptions {
  readonly delay?: number;
  readonly moveThreshold?: number;
  readonly hapticMs?: number;
}

export interface LongPressHandlers {
  readonly onPointerDown: (e: React.PointerEvent) => void;
  readonly onPointerUp: (e: React.PointerEvent) => void;
  readonly onPointerMove: (e: React.PointerEvent) => void;
  readonly onPointerLeave: (e: React.PointerEvent) => void;
  readonly onPointerCancel: (e: React.PointerEvent) => void;
}

export function useLongPress(
  onLongPress: (e: React.PointerEvent) => void,
  { delay = 400, moveThreshold = 8, hapticMs = 15 }: UseLongPressOptions = {},
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const cbRef = useRef(onLongPress);
  cbRef.current = onLongPress;

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore right-click / middle-click on desktop.
      if (e.button !== undefined && e.button !== 0) return;
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      const evt = e;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(hapticMs);
          } catch {
            /* ignore */
          }
        }
        cbRef.current(evt);
      }, delay);
    },
    [delay, hapticMs],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = startRef.current;
      if (!s || !timerRef.current) return;
      const dx = Math.abs(e.clientX - s.x);
      const dy = Math.abs(e.clientY - s.y);
      if (dx > moveThreshold || dy > moveThreshold) clear();
    },
    [clear, moveThreshold],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      clear();
    },
    [clear],
  );

  return {
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerLeave: onPointerUp,
    onPointerCancel: onPointerUp,
  };
}

export default useLongPress;
