import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
} from "@/core-os/barq-logistics/useSmartLogistics";

export type DynamicZoneInfo = {
  fee: number;
  surge: boolean;
  loadFactor: number;
  etaLabel: string;
  etaMinutes: number;
  pressure: "normal" | "elevated" | "high";
};

/* ---------------------------------------------------------------------------
 * Phase T-P3 — Provider split:
 *   - LocationProvider     (root)  : static zone + setters only. Lightweight.
 *   - LocationOpsProvider  (_app)  : Realtime PostGIS / surge / ETA. Heavy.
 *
 * Public routes (/auth, etc.) mount only LocationProvider, so the main
 * bundle no longer pulls useSmartLogistics' Realtime channel + spatial RPCs
 * onto the cold-start critical path.
 * ------------------------------------------------------------------------- */

type LocationStaticCtx = {
  zoneId: ZoneId;
  zone: DeliveryZone;
  zones: DeliveryZone[];
  setZoneId: (id: ZoneId) => void;
  setFromAddress: (city?: string | null, district?: string | null) => void;
  resolveZone: (id: ZoneId) => DeliveryZone;
};

type LocationOpsCtx = {
  zoneOps: Record<string, ZoneOpsMetrics>;
  getDynamicInfo: (subtotal: number, zoneId?: ZoneId) => DynamicZoneInfo;
};

type LocationCtxFull = Omit<LocationStaticCtx, "resolveZone"> & LocationOpsCtx;

const StaticCtx = createContext<LocationStaticCtx | null>(null);
const OpsCtx = createContext<LocationOpsCtx | null>(null);

const STORAGE_KEY = "reef-zone-v1";
const VALID_ZONE_CODES: ZoneId[] = ["A", "B", "C", "D", "M", "E"];

const EMPTY_OPS: Record<string, ZoneOpsMetrics> = Object.freeze({});

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [zoneId, setZoneIdState] = useState<ZoneId>(DEFAULT_ZONE_ID);

  const { data: liveZones } = useGeoZones();
  const zones: DeliveryZone[] = liveZones ?? STATIC_ZONES;

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

  const staticValue = useMemo<LocationStaticCtx>(
    () => ({
      zoneId,
      zone: resolveZone(zoneId),
      zones,
      setZoneId,
      setFromAddress,
      resolveZone,
    }),
    [zoneId, zones, resolveZone, setZoneId, setFromAddress],
  );

  return <StaticCtx.Provider value={staticValue}>{children}</StaticCtx.Provider>;
};

/**
 * Heavy ops layer — mount only inside the authenticated app shell so
 * public routes (auth, error pages) don't pay for Realtime + PostGIS.
 */
export const LocationOpsProvider = ({ children }: { children: ReactNode }) => {
  const staticCtx = useContext(StaticCtx);
  if (!staticCtx) {
    throw new Error("LocationOpsProvider must be nested inside LocationProvider");
  }
  const { resolveZone, zoneId } = staticCtx;

  // Filter Realtime to the active zone only — surge updates for other zones
  // no longer fan out re-renders into this tree.
  const { ops: zoneOps } = useSmartLogistics(zoneId);

  // Bind dynamic inputs to refs so getDynamicInfo identity stays stable.
  const opsRef = useRef(zoneOps);
  const resolveZoneRef = useRef(resolveZone);
  const zoneIdRef = useRef(zoneId);
  useEffect(() => { opsRef.current = zoneOps; }, [zoneOps]);
  useEffect(() => { resolveZoneRef.current = resolveZone; }, [resolveZone]);
  useEffect(() => { zoneIdRef.current = zoneId; }, [zoneId]);

  const getDynamicInfo = useCallback(
    (subtotal: number, overrideZoneId?: ZoneId): DynamicZoneInfo => {
      const z = resolveZoneRef.current(overrideZoneId ?? zoneIdRef.current);
      const ops = opsRef.current[z.id];
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
    [],
  );

  const opsValue = useMemo<LocationOpsCtx>(
    () => ({ zoneOps, getDynamicInfo }),
    [zoneOps, getDynamicInfo],
  );

  return <OpsCtx.Provider value={opsValue}>{children}</OpsCtx.Provider>;
};

export const useLocationStatic = (): LocationStaticCtx => {
  const v = useContext(StaticCtx);
  if (!v) throw new Error("useLocationStatic must be used within LocationProvider");
  return v;
};

/**
 * Returns Realtime ops if LocationOpsProvider is mounted; otherwise a
 * no-op stub. Lets shared components (e.g. ProductCard) call it from
 * both public and authenticated trees without crashing.
 */
export const useLocationOps = (): LocationOpsCtx => {
  const v = useContext(OpsCtx);
  const staticCtx = useContext(StaticCtx);
  return useMemo<LocationOpsCtx>(() => {
    if (v) return v;
    const resolveZone = staticCtx?.resolveZone;
    const fallbackZoneId = staticCtx?.zoneId ?? DEFAULT_ZONE_ID;
    return {
      zoneOps: EMPTY_OPS,
      getDynamicInfo: (subtotal, overrideZoneId) => {
        const z = resolveZone
          ? resolveZone(overrideZoneId ?? fallbackZoneId)
          : STATIC_ZONES[0];
        const { fee, surge, loadFactor } = calculateDynamicDelivery(z, subtotal, undefined);
        const eta = calculateDynamicETA(z, undefined);
        return {
          fee,
          surge,
          loadFactor,
          etaLabel: eta.label,
          etaMinutes: eta.minutes,
          pressure: eta.pressure,
        };
      },
    };
  }, [v, staticCtx]);
};

/**
 * Backward-compatible aggregate hook. Existing call sites continue to work
 * even on routes without LocationOpsProvider — ops fall back to the stub.
 */
export const useLocation = (): LocationCtxFull => {
  const s = useLocationStatic();
  const o = useLocationOps();
  return useMemo(() => {
    const { resolveZone: _resolveZone, ...rest } = s;
    void _resolveZone;
    return { ...rest, ...o };
  }, [s, o]);
};

