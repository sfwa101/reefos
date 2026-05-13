/**
 * Phase T-B — MapBlock (lazy).
 * The actual Leaflet/Mapbox lib is dynamically imported so the main JS
 * bundle stays clean of map dependencies.
 */
import { lazy, Suspense } from "react";
import type { MapBlock, DriverPinLayer, GeofencePolygonLayer } from "../schemas";
import type { AdminBlockContext } from "../registry";

const LazyMapCanvas = lazy(() => import("./MapCanvas"));

export function MapBlockRenderer({
  block,
}: {
  block: MapBlock;
  ctx: AdminBlockContext;
}) {
  return (
    <div
      style={{ height: block.props.height }}
      className="w-full overflow-hidden rounded-2xl border border-border bg-muted/30"
    >
      <Suspense
        fallback={
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            تحميل الخريطة…
          </div>
        }
      >
        <LazyMapCanvas
          centerLat={block.props.center_lat}
          centerLng={block.props.center_lng}
          zoom={block.props.zoom}
          children={block.props.children as Array<DriverPinLayer | GeofencePolygonLayer>}
        />
      </Suspense>
    </div>
  );
}

/** Layer blocks render nothing standalone — they're consumed by MapCanvas. */
export function DriverPinLayerBlock(_: { block: DriverPinLayer; ctx: AdminBlockContext }) {
  return null;
}
export function GeofencePolygonLayerBlock(_: { block: GeofencePolygonLayer; ctx: AdminBlockContext }) {
  return null;
}
