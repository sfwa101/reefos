import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_ZONE_ID,
  ZONES as STATIC_ZONES,
  detectZoneFromAddress as detectFromStatic,
  type DeliveryZone,
  type ZoneId,
} from "@/lib/geoZones";
import { useGeoZones } from "@/hooks/useGeoZones";
import {
  useSmartLogistics,
  calculateDynamicDelivery,
  calculateDynamicETA,
  type ZoneOpsMetrics,
} from "@/lib/sync/useSmartLogistics";

export type DynamicZoneInfo = {
  fee: number;
  surge: boolean;
  loadFactor: number;
  etaLabel: string;
  etaMinutes: number;
  pressure: "normal" | "elevated" | "high";
};

/* ---------------------------------------------------------------------------
 * Phase T-P1 — Split contexts to kill the re-render storm.
 *  - StaticCtx: zoneId / zone / zones / setters. Only changes on user action.
 *  - OpsCtx:    Realtime ops + dynamic helpers. Re-renders on every tick.
 * Consumers should subscribe ONLY to the slice they need.
 * ------------------------------------------------------------------------- */
type LocationStaticCtx = {
  zoneId: ZoneId;
  zone: DeliveryZone;
  zones: DeliveryZone[];
  setZoneId: (id: ZoneId) => void;
  setFromAddress: (city?: string | null, district?: string | null) => void;
};

type LocationOpsCtx = {
  zoneOps: Record<string, ZoneOpsMetrics>;
  getDynamicInfo: (subtotal: number, zoneId?: ZoneId) => DynamicZoneInfo;
};

type LocationCtxFull = LocationStaticCtx & LocationOpsCtx;

const StaticCtx = createContext<LocationStaticCtx | null>(null);
const OpsCtx = createContext<LocationOpsCtx | null>(null);

const STORAGE_KEY = "reef-zone-v1";
const VALID_ZONE_CODES: ZoneId[] = ["A", "B", "C", "D", "M", "E"];

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [zoneId, setZoneIdState] = useState<ZoneId>(DEFAULT_ZONE_ID);

  const { data: liveZones } = useGeoZones();
  const zones: DeliveryZone[] = liveZones ?? STATIC_ZONES;

  const { ops: zoneOps } = useSmartLogistics();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && VALID_ZONE_CODES.includes(raw as ZoneId)) {
        setZoneIdState(raw as ZoneId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, zoneId);
    } catch {
      /* ignore */
    }
  }, [zoneId]);

  const setZoneId = useCallback((id: ZoneId) => setZoneIdState(id), []);

  const resolveZone = useCallback(
    (id: ZoneId): DeliveryZone => zones.find((z) => z.id === id) ?? zones[0] ?? STATIC_ZONES[0],
    [zones],
  );

  const setFromAddress = useCallback(
    (city?: string | null, district?: string | null) => {
      const c = (city ?? "").trim();
      const d = (district ?? "").trim();
      const direct =
        zones.find((z) => z.name === c || z.shortName === c) ??
        zones.find((z) => z.id !== "E" && z.districts.some((dist) => dist === d));
      if (direct) {
        setZoneIdState(direct.id);
        return;
      }
      setZoneIdState(detectFromStatic(city, district));
    },
    [zones],
  );

  const getDynamicInfo = useCallback(
    (subtotal: number, overrideZoneId?: ZoneId): DynamicZoneInfo => {
      const z = resolveZone(overrideZoneId ?? zoneId);
      const ops = zoneOps[z.id];
      const { fee, surge, loadFactor } = calculateDynamicDelivery(z, subtotal, ops);
      const eta = calculateDynamicETA(z, ops);
      return {
        fee,
        surge,
        loadFactor,
        etaLabel: eta.label,
        etaMinutes: eta.minutes,
        pressure: eta.pressure,
      };
    },
    [resolveZone, zoneId, zoneOps],
  );

  const staticValue = useMemo<LocationStaticCtx>(
    () => ({
      zoneId,
      zone: resolveZone(zoneId),
      zones,
      setZoneId,
      setFromAddress,
    }),
    [zoneId, zones, resolveZone, setZoneId, setFromAddress],
  );

  const opsValue = useMemo<LocationOpsCtx>(
    () => ({ zoneOps, getDynamicInfo }),
    [zoneOps, getDynamicInfo],
  );

  return (
    <StaticCtx.Provider value={staticValue}>
      <OpsCtx.Provider value={opsValue}>{children}</OpsCtx.Provider>
    </StaticCtx.Provider>
  );
};

export const useLocationStatic = (): LocationStaticCtx => {
  const v = useContext(StaticCtx);
  if (!v) throw new Error("useLocationStatic must be used within LocationProvider");
  return v;
};

export const useLocationOps = (): LocationOpsCtx => {
  const v = useContext(OpsCtx);
  if (!v) throw new Error("useLocationOps must be used within LocationProvider");
  return v;
};

/**
 * Backward-compatible aggregate hook. Existing consumers continue to work.
 * Prefer `useLocationStatic` / `useLocationOps` in new code to avoid
 * re-rendering on Realtime ops ticks when only static fields are needed.
 */
export const useLocation = (): LocationCtxFull => {
  const s = useLocationStatic();
  const o = useLocationOps();
  return useMemo(() => ({ ...s, ...o }), [s, o]);
};
