// TanStack Query layer for delivery zones.
// Reads via LogisticsGateway. Falls back to the static `src/lib/geoZones.ts`.
import { queryOptions, useQuery } from "@tanstack/react-query";
import { LogisticsExtras, type GeoZoneRow } from "@/core/logistics/gateway/LogisticsGateway";
import { ZONES as STATIC_ZONES, type DeliveryZone, type ZoneId } from "@/lib/geoZones";

const VALID_ZONE_CODES: ZoneId[] = ["A", "B", "C", "D", "M", "E"];

function rowToZone(row: GeoZoneRow): DeliveryZone | null {
  if (!VALID_ZONE_CODES.includes(row.zone_code as ZoneId)) return null;
  return {
    id: row.zone_code as ZoneId,
    name: row.name,
    shortName: row.short_name,
    districts: row.districts ?? [],
    deliveryFee: Number(row.delivery_fee),
    freeDeliveryThreshold:
      row.free_delivery_threshold != null ? Number(row.free_delivery_threshold) : null,
    etaLabel: row.eta_label,
    etaMinutes: row.eta_minutes ?? undefined,
    codAllowed: row.cod_allowed,
    acceptsPerishables: row.accepts_perishables,
    accent: row.accent ?? "text-emerald-600",
  };
}

async function fetchGeoZones(): Promise<DeliveryZone[]> {
  const data = await LogisticsExtras.listActiveGeoZones();
  if (!data || data.length === 0) return STATIC_ZONES;
  const mapped = data
    .map(rowToZone)
    .filter((z): z is DeliveryZone => z !== null);
  return mapped.length > 0 ? mapped : STATIC_ZONES;
}

export const geoZonesQueryOptions = () =>
  queryOptions({
    queryKey: ["geo_zones"] as const,
    queryFn: fetchGeoZones,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

export function useGeoZones() {
  return useQuery(geoZonesQueryOptions());
}
