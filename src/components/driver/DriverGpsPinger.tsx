/**
 * DriverGpsPinger — Background GPS telemetry while a shift is open.
 *
 * Wave D-1.B contract:
 *   • Polls the active shift every 30s. While one exists, captures a
 *     high-accuracy GPS fix and pushes it via `publishDriverPositionFn`
 *     (sovereign server fn → `driver_positions` table).
 *   • Headless component (renders nothing). Graceful on permission denial:
 *     surfaces a one-time toast then continues silent.
 *   • Zero `supabase.from()` — server-fn boundary only.
 */
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getActiveDriverShiftFn,
} from "@/core/logistics/driver.functions";
import { publishDriverPositionFn } from "@/core/logistics/driver.functions";
import { toast } from "sonner";

const PING_INTERVAL_MS = 30_000;

type Fix = { lat: number; lng: number; heading: number | null; speed: number | null };

function getFix(): Promise<Fix | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
          speed: Number.isFinite(p.coords.speed)
            ? (p.coords.speed as number) * 3.6
            : null,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    );
  });
}

export function DriverGpsPinger() {
  const getActive = useServerFn(getActiveDriverShiftFn);
  const publish = useServerFn(publishDriverPositionFn);
  const warnedRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const shift = await getActive().catch(() => null);
        if (!shift || cancelled) return;

        const fix = await getFix();
        if (!fix) {
          if (!warnedRef.current) {
            warnedRef.current = true;
            toast.warning(
              "تعذّر الوصول للموقع — فعّل صلاحية GPS لتتبع التوصيل",
            );
          }
          return;
        }

        await publish({
          data: {
            lat: fix.lat,
            lng: fix.lng,
            heading: fix.heading,
            speedKmh: fix.speed,
            batteryPct: null,
            status: "EN_ROUTE",
            ts: Date.now(),
          },
        }).catch(() => {
          /* swallow — next tick retries */
        });
      } finally {
        runningRef.current = false;
      }
    };

    // Fire once at mount, then every 30s.
    void tick();
    const id = window.setInterval(tick, PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [getActive, publish]);

  return null;
}

export default DriverGpsPinger;
