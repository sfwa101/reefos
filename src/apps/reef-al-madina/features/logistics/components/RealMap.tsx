/**
 * RealMap — interactive Leaflet + OpenStreetMap.
 *
 * SSR/CSR safety: Leaflet touches `window` at import time. This component
 * is client-only by virtue of being inside a Drawer that mounts on click,
 * but we still guard the icon fix with a useEffect.
 *
 * Pin behavior: draggable; on drag-end fires `onPinChange(lat, lng)`.
 * Geolocation: button uses `navigator.geolocation.getCurrentPosition`.
 */
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";

// Fix Leaflet's default marker icon paths (Vite breaks the relative URLs)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Button } from "@/components/ui/button";

// Configure default icon ONCE
const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  lat: number | null;
  lng: number | null;
  onPinChange: (lat: number, lng: number) => void;
  /** Default center if no pin yet (Gamasa, Egypt). */
  defaultCenter?: [number, number];
}

// Recenter map when pin changes externally (e.g. geolocation)
const Recenter = ({ lat, lng }: { lat: number | null; lng: number | null }) => {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

export const RealMap = ({ lat, lng, onPinChange, defaultCenter = [31.169, 31.989] }: Props) => {
  const markerRef = useRef<L.Marker>(null);
  const center: [number, number] = useMemo(
    () => (lat != null && lng != null ? [lat, lng] : defaultCenter),
    [lat, lng, defaultCenter],
  );

  const handleLocate = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onPinChange(pos.coords.latitude, pos.coords.longitude),
      () => {
        /* user denied — silent */
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-border/40">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={lat} lng={lng} />
        {lat != null && lng != null && (
          <Marker
            position={[lat, lng]}
            draggable
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const m = markerRef.current;
                if (!m) return;
                const p = m.getLatLng();
                onPinChange(p.lat, p.lng);
              },
            }}
          />
        )}
      </MapContainer>

      {/* Locate-me button (floating top-right) */}
      <Button
        type="button"
        onClick={handleLocate}
        className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-xs font-extrabold text-primary shadow-md ring-1 ring-border/40 active:scale-95"
      >
        <Crosshair className="h-3.5 w-3.5" strokeWidth={2.6} />
        موقعي
      </Button>

      {/* Helper hint */}
      {(lat == null || lng == null) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] mx-auto w-fit rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-bold text-background">
          اضغط "موقعي" لبدء التحديد
        </div>
      )}
    </div>
  );
};

export default RealMap;
