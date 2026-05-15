/**
 * Admin SDUI Block Schemas — Phase A Step 2
 * -----------------------------------------
 * Strict Zod discriminated union. Adding a new block requires:
 *   1. Add a schema here.
 *   2. Append to AdminBlockSchema union.
 *   3. Register a renderer in `registry.tsx`.
 *
 * The exhaustiveness guard in `registry.tsx` enforces (3) at compile time.
 */
import { z } from "zod";
import { Tracer } from "@/core/system/observability/Tracer";

// ─── Atomic field types ─────────────────────────────────────────────
export const AdminFieldDataTypeSchema = z.enum([
  "text", "textarea", "number", "decimal", "boolean",
  "date", "datetime", "uuid", "email", "phone", "url",
  "json", "enum", "relation", "i18n_text",
]);
export type AdminFieldDataType = z.infer<typeof AdminFieldDataTypeSchema>;

export const AdminFieldWidgetSchema = z.enum([
  "input", "textarea", "switch", "select", "radio",
  "checkbox_group", "date_picker", "datetime_picker",
  "json_editor", "relation_picker", "currency", "percent",
  "color", "icon", "tags",
]);
export type AdminFieldWidget = z.infer<typeof AdminFieldWidgetSchema>;

// ─── Form blocks ────────────────────────────────────────────────────
export const FormFieldBlockSchema = z.object({
  type: z.literal("form_field"),
  id: z.string().min(1),
  props: z.object({
    key: z.string().min(1),
    label_i18n: z.record(z.string(), z.string()),
    data_type: AdminFieldDataTypeSchema,
    widget: AdminFieldWidgetSchema.optional(),
    required: z.boolean().default(false),
    placeholder_i18n: z.record(z.string(), z.string()).optional(),
    help_i18n: z.record(z.string(), z.string()).optional(),
    options: z.array(z.object({
      value: z.string(),
      label_i18n: z.record(z.string(), z.string()),
    })).optional(),
    relation: z.object({
      entity_key: z.string(),
      display_field: z.string().default("name"),
    }).optional(),
    validation: z.record(z.string(), z.unknown()).optional(),
    col_span: z.enum(["1", "2", "3", "full"]).default("1"),
  }),
});

export const FieldGroupBlockSchema = z.object({
  type: z.literal("field_group"),
  id: z.string().min(1),
  props: z.object({
    title_i18n: z.record(z.string(), z.string()),
    description_i18n: z.record(z.string(), z.string()).optional(),
    columns: z.enum(["1", "2", "3"]).default("2"),
    fields: z.array(FormFieldBlockSchema).min(1),
  }),
});

// ─── Table column block (for AdminTableEngine) ──────────────────────
export const TableColumnBlockSchema = z.object({
  type: z.literal("table_column"),
  id: z.string().min(1),
  props: z.object({
    key: z.string().min(1),
    label_i18n: z.record(z.string(), z.string()),
    data_type: AdminFieldDataTypeSchema,
    width: z.number().int().positive().optional(),
    sortable: z.boolean().default(false),
    filterable: z.boolean().default(false),
    formatter: z.enum(["text", "currency", "date", "datetime", "badge", "boolean", "json"]).default("text"),
  }),
});

// ─── Action / RPC button ────────────────────────────────────────────
export const RpcButtonBlockSchema = z.object({
  type: z.literal("rpc_button"),
  id: z.string().min(1),
  props: z.object({
    rpc_name: z.string().min(1),
    label_i18n: z.record(z.string(), z.string()),
    args_schema: z.record(z.string(), z.unknown()).optional(),
    confirmation_required: z.boolean().default(false),
    confirmation_message_i18n: z.record(z.string(), z.string()).optional(),
    scope: z.enum(["row", "bulk", "global"]).default("global"),
    destructive: z.boolean().default(false),
    icon: z.string().optional(),
  }),
});

// ─── Computed (read-only) column ────────────────────────────────────
export const ComputedColumnBlockSchema = z.object({
  type: z.literal("computed_column"),
  id: z.string().min(1),
  props: z.object({
    key: z.string().min(1),
    label_i18n: z.record(z.string(), z.string()),
    expression: z.string().min(1),
    formatter: z.enum(["text", "currency", "date", "percent"]).default("text"),
  }),
});

// ─── Phase T-B: Map / Logistics blocks ──────────────────────────────
export const MapBlockSchema = z.object({
  type: z.literal("map_block"),
  id: z.string().min(1),
  props: z.object({
    center_lat: z.number().default(24.4667),
    center_lng: z.number().default(39.6),
    zoom: z.number().int().min(1).max(20).default(12),
    height: z.number().int().positive().default(420),
    children: z.array(z.lazy((): z.ZodTypeAny => z.union([
      DriverPinLayerSchema,
      GeofencePolygonLayerSchema,
    ]))).default([]),
  }),
});

export const DriverPinLayerSchema = z.object({
  type: z.literal("driver_pin_layer"),
  id: z.string().min(1),
  props: z.object({
    /** Filter source: 'all_idle' (admin) | 'assigned_to_order' (customer). */
    source: z.enum(["all_idle", "assigned_to_order"]).default("all_idle"),
    order_id: z.string().uuid().optional(),
    refresh_ms: z.number().int().min(2_000).default(5_000),
  }),
});

export const GeofencePolygonLayerSchema = z.object({
  type: z.literal("geofence_polygon_layer"),
  id: z.string().min(1),
  props: z.object({
    show_surge: z.boolean().default(true),
    fill_opacity: z.number().min(0).max(1).default(0.2),
  }),
});

// ─── Discriminated union ────────────────────────────────────────────
export const AdminBlockSchema = z.discriminatedUnion("type", [
  FormFieldBlockSchema,
  FieldGroupBlockSchema,
  TableColumnBlockSchema,
  RpcButtonBlockSchema,
  ComputedColumnBlockSchema,
  MapBlockSchema,
  DriverPinLayerSchema,
  GeofencePolygonLayerSchema,
]);

export type AdminBlock = z.infer<typeof AdminBlockSchema>;
export type FormFieldBlock = z.infer<typeof FormFieldBlockSchema>;
export type FieldGroupBlock = z.infer<typeof FieldGroupBlockSchema>;
export type TableColumnBlock = z.infer<typeof TableColumnBlockSchema>;
export type RpcButtonBlock = z.infer<typeof RpcButtonBlockSchema>;
export type ComputedColumnBlock = z.infer<typeof ComputedColumnBlockSchema>;
export type MapBlock = z.infer<typeof MapBlockSchema>;
export type DriverPinLayer = z.infer<typeof DriverPinLayerSchema>;
export type GeofencePolygonLayer = z.infer<typeof GeofencePolygonLayerSchema>;

/** Defensive parser — drops invalid blocks instead of throwing. */
export function parseAdminBlocks(raw: unknown): AdminBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminBlock[] = [];
  for (const item of raw) {
    const r = AdminBlockSchema.safeParse(item);
    if (r.success) out.push(r.data);
    else if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      Tracer.warn("runtime-ui", "adminsdui_dropped_invalid_block", { args: ["[AdminSDUI] dropped invalid block", r.error.issues[0]?.message] });
    }
  }
  return out;
}
