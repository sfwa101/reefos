// Section Layout Manager — Public Read Gateway (Wave R-3 · Step 3).
// Unauthenticated server function exposing the published mobile home layout
// to the storefront. Falls back to a hardcoded default so the app never
// renders blank if `app_settings` is empty or unreachable.
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  MOBILE_HOME_LAYOUT_KEY,
  MobileHomeLayoutSchema,
  type MobileHomeLayoutV1,
} from "@/lib/section-manager.types";

export const DEFAULT_MOBILE_HOME_LAYOUT: MobileHomeLayoutV1 = {
  __v: 1,
  page_key: "mobile_home",
  updated_at: "2026-01-01T00:00:00.000Z",
  updated_by: "system",
  blocks: [],
};

export const getPublicLayoutFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MobileHomeLayoutV1> => {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", MOBILE_HOME_LAYOUT_KEY)
        .maybeSingle();
      if (error || !data?.value) return DEFAULT_MOBILE_HOME_LAYOUT;
      const parsed = MobileHomeLayoutSchema.safeParse(data.value);
      return parsed.success ? parsed.data : DEFAULT_MOBILE_HOME_LAYOUT;
    } catch {
      return DEFAULT_MOBILE_HOME_LAYOUT;
    }
  },
);
