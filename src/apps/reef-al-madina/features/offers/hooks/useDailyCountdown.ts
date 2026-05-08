/**
 * useDailyCountdown — Phase 22 singleton edition.
 *
 * Previously every consumer mounted its own 1-second `setInterval`,
 * which fragmented React reconciliation and caused a measurable
 * frame drop on the Offers page. We now run a **single global ticker**
 * via Zustand. Components subscribe to the slice and React batches
 * the re-render. Mounting / unmounting components doesn't kill the
 * timer — only the last unmount stops it.
 */
import { useEffect } from "react";
import { create } from "zustand";

type CountdownState = {
  value: string;
  subscribers: number;
};

const computeRemaining = (): string => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  const h = Math.floor(diff / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const s = Math.floor((diff % 6e4) / 1e3);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const useStore = create<CountdownState>(() => ({
  value: computeRemaining(),
  subscribers: 0,
}));

let intervalId: ReturnType<typeof setInterval> | null = null;

const startTicker = () => {
  if (intervalId !== null) return;
  // Update immediately so the first frame is fresh.
  useStore.setState({ value: computeRemaining() });
  intervalId = setInterval(() => {
    useStore.setState({ value: computeRemaining() });
  }, 1000);
};

const stopTicker = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

export const useDailyCountdown = (): string => {
  useEffect(() => {
    const next = useStore.getState().subscribers + 1;
    useStore.setState({ subscribers: next });
    if (next === 1) startTicker();
    return () => {
      const left = useStore.getState().subscribers - 1;
      useStore.setState({ subscribers: Math.max(0, left) });
      if (left <= 0) stopTicker();
    };
  }, []);
  return useStore((s) => s.value);
};
