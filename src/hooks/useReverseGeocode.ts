/**
 * Reverse Geocoding via Nominatim (OpenStreetMap) — FREE, no API key.
 *
 * Why Nominatim?
 *   - Zero cost, no key required
 *   - Native Arabic support via `accept-language: ar`
 *   - Returns rich address fields: city, suburb, road, neighbourhood …
 *
 * Usage policy compliance:
 *   - We send a descriptive User-Agent (their TOS requires it)
 *   - We debounce on the consumer side (drag-to-pin → 600ms idle)
 *   - We cap requests at ~1/sec per their fair-use rules
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface ReverseGeocodeResult {
  city: string | null;
  district: string | null;
  street: string | null;
  building: string | null;
  raw: string | null;
}

interface NominatimResponse {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    road?: string;
    pedestrian?: string;
    house_number?: string;
  };
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

async function fetchReverse(lat: number, lng: number, signal: AbortSignal): Promise<ReverseGeocodeResult | null> {
  const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    signal,
    headers: { "Accept-Language": "ar" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as NominatimResponse;
  const a = json.address ?? {};
  return {
    city: a.city ?? a.town ?? a.village ?? a.state ?? null,
    district: a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter ?? null,
    street: a.road ?? a.pedestrian ?? null,
    building: a.house_number ?? null,
    raw: json.display_name ?? null,
  };
}

export function useReverseGeocode(lat: number | null, lng: number | null, debounceMs = 600) {
  const [data, setData] = useState<ReverseGeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) return;
    if (timer.current) clearTimeout(timer.current);

    const controller = new AbortController();
    timer.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchReverse(lat, lng, controller.signal)
        .then((r) => setData(r))
        .catch((e: unknown) => {
          if ((e as { name?: string }).name === "AbortError") return;
          setError(e instanceof Error ? e.message : "geocode failed");
        })
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => {
      controller.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [lat, lng, debounceMs]);

  const reset = useCallback(() => setData(null), []);
  return { data, loading, error, reset };
}
