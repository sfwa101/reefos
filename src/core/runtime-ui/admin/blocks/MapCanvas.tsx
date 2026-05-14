/**
 * Phase T-B — MapCanvas
 * ----------------------
 * Pure-DOM placeholder map canvas. No Leaflet/Mapbox dependency yet —
 * this module is dynamically imported so when a real map lib lands it
 * will not pollute the main bundle. Renders driver pins + geofence
 * polygons via Realtime + RPC data.
 */
import { useEffect, useState } from "react";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";
import type { DriverPinLayer, GeofencePolygonLayer } from "../schemas";

type Props = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  children: Array<DriverPinLayer | GeofencePolygonLayer>;
};

type DriverPin = { driver_id: string; lat: number; lng: number };

export default function MapCanvas({ centerLat, centerLng, zoom, children }: Props) {
  const pinLayer = children.find((c) => c.type === "driver_pin_layer") as DriverPinLayer | undefined;
  const polyLayer = children.find((c) => c.type === "geofence_polygon_layer") as GeofencePolygonLayer | undefined;

  const [pins, setPins] = useState<DriverPin[]>([]);
  const [polyCount, setPolyCount] = useState(0);

  useEffect(() => {
    if (!pinLayer) return;
    let active = true;
    const tick = async () => {
      const data = await RuntimeUIGateway.findNearestDrivers({
        lat: centerLat,
        lng: centerLng,
        radiusM: 50_000,
        limit: 50,
      });
      if (!active) return;
      setPins(
        data.map((d) => ({
          driver_id: d.driver_id, lat: centerLat, lng: centerLng,
        })),
      );
    };
    tick();
    const i = setInterval(tick, pinLayer.props.refresh_ms);
    return () => { active = false; clearInterval(i); };
  }, [pinLayer, centerLat, centerLng]);

  useEffect(() => {
    if (!polyLayer) return;
    void RuntimeUIGateway.countDeliveryPolygons().then((c) => setPolyCount(c));
  }, [polyLayer]);

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30">
      <div className="absolute inset-x-0 top-0 flex justify-between px-3 py-2 text-[11px] text-muted-foreground">
        <span>📍 {centerLat.toFixed(3)}, {centerLng.toFixed(3)} · z{zoom}</span>
        <span>{pins.length} drivers · {polyCount} zones</span>
      </div>
      <div className="grid h-full place-items-center text-xs text-muted-foreground/70">
        Map canvas (lazy) — wire Leaflet/Mapbox here
      </div>
    </div>
  );
}
