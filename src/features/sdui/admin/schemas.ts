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

// ─── Discriminated union ────────────────────────────────────────────
export const AdminBlockSchema = z.discriminatedUnion("type", [
  FormFieldBlockSchema,
  FieldGroupBlockSchema,
  TableColumnBlockSchema,
  RpcButtonBlockSchema,
  ComputedColumnBlockSchema,
]);

export type AdminBlock = z.infer<typeof AdminBlockSchema>;
export type FormFieldBlock = z.infer<typeof FormFieldBlockSchema>;
export type FieldGroupBlock = z.infer<typeof FieldGroupBlockSchema>;
export type TableColumnBlock = z.infer<typeof TableColumnBlockSchema>;
export type RpcButtonBlock = z.infer<typeof RpcButtonBlockSchema>;
export type ComputedColumnBlock = z.infer<typeof ComputedColumnBlockSchema>;

/** Defensive parser — drops invalid blocks instead of throwing. */
export function parseAdminBlocks(raw: unknown): AdminBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminBlock[] = [];
  for (const item of raw) {
    const r = AdminBlockSchema.safeParse(item);
    if (r.success) out.push(r.data);
    else if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[AdminSDUI] dropped invalid block", r.error.issues[0]?.message);
    }
  }
  return out;
}
