/**
 * Legacy Zone → Logistics Zone Adapter
 * ----------------------------------------------------------------
 * The cart historically uses the lightweight `DeliveryZone` shape from
 * `@/lib/geoZones` (also returned by `useGeoZones`). The new logistics
 * engine expects the richer `DeliveryZone` shape from `@/core/logistics/core/types`.
 *
 * This pure adapter bridges the two without changing either side.
 * No I/O, no React.
 */
import type { DeliveryZone as LegacyZone } from "@/lib/geoZones";
import type { DeliveryZone as LogisticsZone } from "@/core/logistics/core/types";

export function legacyZoneToLogisticsZone(z: LegacyZone): LogisticsZone {
  return {
    id: z.id,
    zoneCode: z.id,
    name: z.name,
    shortName: z.shortName,
    districts: z.districts,
    baseFee: z.deliveryFee,
    // Legacy zones don't carry min_order_value — default to 0 (no blocker).
    // Real values come from the DB via the live `geo_zones` table; this
    // adapter is a safe fallback.
    minOrderValue: 0,
    freeDeliveryThreshold: z.freeDeliveryThreshold,
    baseEtaMinutes: z.etaMinutes ?? 60,
    etaLabel: z.etaLabel,
    codAllowed: z.codAllowed,
    acceptsPerishables: z.acceptsPerishables,
    polygon: null,
    currentLoadFactor: 1,
    surgeActive: false,
    isActive: true,
  };
}
