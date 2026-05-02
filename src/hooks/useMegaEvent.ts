import { useEffect, useState } from "react";
import { fetchCurrentMegaEvent, type MegaEvent } from "@/integrations/supabase/portal-rpcs";

export type { MegaEvent };

/**
 * Returns the currently-active mega event (if any) — refreshes every 5 minutes
 * and applies a theme CSS variable on <html> when active so banners and accents
 * shift automatically (e.g. red on Tuesday, gold on Friday).
 */
export function useMegaEvent() {
  const [event, setEvent] = useState<MegaEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await fetchCurrentMegaEvent();
      if (cancelled) return;
      setEvent(next);
    };
    void load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Apply theme override on document root
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (event?.banner_color_hex) {
      root.style.setProperty("--mega-accent", event.banner_color_hex);
      root.dataset.megaEvent = event.trigger_kind;
    } else {
      root.style.removeProperty("--mega-accent");
      delete root.dataset.megaEvent;
    }
    return () => {
      root.style.removeProperty("--mega-accent");
      delete root.dataset.megaEvent;
    };
  }, [event?.banner_color_hex, event?.trigger_kind]);

  return event;
}
