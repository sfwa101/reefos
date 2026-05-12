// Admin Settings Gateway — Wave R-1 · Batch 4.
// Sanctioned `createServerFn` handlers for `app_settings` key/value store.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import {
  LAYOUT_KEY_PREFIX,
  MOBILE_HOME_LAYOUT_KEY,
  MOBILE_HOME_LAYOUT_DRAFT_KEY,
  MobileHomeLayoutSchema,
} from "@/lib/section-manager.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

const ALLOWED_KEYS = new Set([
  "general",
  "finance",
  MOBILE_HOME_LAYOUT_KEY,
  MOBILE_HOME_LAYOUT_DRAFT_KEY,
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppSettingsBundle = Record<string, Record<string, any>>;

export const getAppSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { keys: string[] }) => {
    if (!Array.isArray(d?.keys) || d.keys.length === 0) throw new Error("keys_required");
    for (const k of d.keys) {
      if (!ALLOWED_KEYS.has(k)) throw new Error(`forbidden_key:${k}`);
    }
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<AppSettingsBundle> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb
      .from("app_settings")
      .select("key,value")
      .in("key", data.keys);
    if (error) throw new Error(error.message);
    const out: AppSettingsBundle = {};
    for (const r of (rows ?? []) as { key: string; value: Record<string, any> }[]) {
      out[r.key] = r.value ?? {};
    }
    return out;
  });

export const upsertAppSettingFn = createServerFn({ method: "POST" })
  .inputValidator((d: { key: string; value: Record<string, any> }) => {
    if (!ALLOWED_KEYS.has(d?.key)) throw new Error("forbidden_key");
    if (!d.value || typeof d.value !== "object") throw new Error("invalid_value");
    if (d.key === "finance") {
      const v = d.value as Record<string, number>;
      if (v.tax_pct != null && (v.tax_pct < 0 || v.tax_pct > 100)) throw new Error("invalid_tax_pct");
      if (v.default_shipping != null && v.default_shipping < 0) throw new Error("invalid_shipping");
      if (v.min_order_total != null && v.min_order_total < 0) throw new Error("invalid_min_order");
    }
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("app_settings")
      .upsert([{ key: data.key, value: data.value }], { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
