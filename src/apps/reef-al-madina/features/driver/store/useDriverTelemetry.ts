/**
 * Phase T-B — Driver Telemetry (Zustand)
 * --------------------------------------
 * High-frequency GPS stream → throttled (10s) gateway publish via
 * `publishDriverPositionFn` (server-side `requireSupabaseAuth` middleware
 * resolves `driver_id`). Zustand selector subscriptions prevent re-renders
 * on every GPS tick.
 */
import { create } from "zustand";
import { publishDriverPositionFn } from "@/core/logistics/driver.functions";
import { Tracer } from "@/core/system/observability/Tracer";

const THROTTLE_MS = 10_000;

export type DriverStatus = "IDLE" | "EN_ROUTE" | "OFFLINE" | "BREAK";

type Position = {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  ts: number;
};

type State = {
  watching: boolean;
  status: DriverStatus;
  lastPosition: Position | null;
  lastPushAt: number;
  error: string | null;
  watcherId: number | null;
  start: (status?: DriverStatus) => void;
  stop: () => void;
  setStatus: (status: DriverStatus) => Promise<void>;
};

async function pushPosition(
  pos: Position,
  status: DriverStatus,
  battery: number | null,
) {
  try {
    await publishDriverPositionFn({
      data: {
        lat: pos.lat,
        lng: pos.lng,
        heading: pos.heading != null ? Math.round(pos.heading) : null,
        speedKmh: pos.speed != null ? Math.round(pos.speed * 3.6) : null,
        batteryPct: battery,
        status,
        ts: pos.ts,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    Tracer.error("driver", "drivertelemetry_publish_failed", { args: ["[driverTelemetry] publish failed", (e as Error).message] });
    throw e;
  }
}

async function readBattery(): Promise<number | null> {
  try {
    // @ts-expect-error - non-standard
    const b = await navigator.getBattery?.();
    return b ? Math.round(b.level * 100) : null;
  } catch {
    return null;
  }
}

export const useDriverTelemetry = create<State>((set, get) => ({
  watching: false,
  status: "OFFLINE",
  lastPosition: null,
  lastPushAt: 0,
  error: null,
  watcherId: null,

  start: (initialStatus = "IDLE") => {
    if (get().watching) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ error: "Geolocation unavailable" });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (geo) => {
        const now = Date.now();
        const pos: Position = {
          lat: geo.coords.latitude,
          lng: geo.coords.longitude,
          heading: geo.coords.heading,
          speed: geo.coords.speed,
          ts: now,
        };
        set({ lastPosition: pos, error: null });

        if (now - get().lastPushAt < THROTTLE_MS) return;

        try {
          const battery = await readBattery();
          await pushPosition(pos, get().status, battery);
          set({ lastPushAt: now });
        } catch (e) {
          set({ error: (e as Error).message });
        }
      },
      (err) => set({ error: err.message }),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    set({ watching: true, watcherId: id, status: initialStatus });
  },

  stop: () => {
    const { watcherId } = get();
    if (watcherId != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watcherId);
    }
    set({ watching: false, watcherId: null, status: "OFFLINE" });
  },

  setStatus: async (status) => {
    set({ status });
    const pos = get().lastPosition;
    if (!pos) return;
    try {
      await pushPosition(pos, status, await readBattery());
      set({ lastPushAt: Date.now() });
    } catch {
      // already logged
    }
  },
}));
