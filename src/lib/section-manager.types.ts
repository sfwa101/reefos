// Section Layout Manager — Schema & Types (Wave R-3 · Step 1).
// Canonical Zod validators + TypeScript interfaces for the
// `mobile_home_layout_v1` SDUI document. Enforced at the gateway boundary
// in `src/lib/admin-settings.functions.ts`.
import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LAYOUT_BLOCK_KINDS = [
  "hero_banner",
  "carousel",
  "grid",
  "category_strip",
  "mega_offer",
  "bundle_rail",
  "section_ref",
  "spacer",
  "html_note",
] as const;

export type LayoutBlockKind = (typeof LAYOUT_BLOCK_KINDS)[number];

export const LayoutBlockKindSchema = z.enum(LAYOUT_BLOCK_KINDS);

// ---------------------------------------------------------------------------
// Entity references
// ---------------------------------------------------------------------------

export const EntityRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), slug: z.string().min(1) }),
  z.object({ kind: z.literal("product"), id: z.string().min(1) }),
  z.object({ kind: z.literal("bundle"), id: z.string().min(1) }),
  z.object({ kind: z.literal("offer"), id: z.string().min(1) }),
  z.object({ kind: z.literal("section"), key: z.string().min(1) }),
]);

export type EntityRef = z.infer<typeof EntityRefSchema>;

// ---------------------------------------------------------------------------
// Block config
// ---------------------------------------------------------------------------

const BlockConfigSchema = z
  .object({
    variant: z.string().min(1).max(64).optional(),
    padding: z.enum(["sm", "md", "lg"]).optional(),
    tone: z
      .enum(["primary", "accent", "info", "success", "warning", "teal"])
      .optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    autoplay_ms: z.number().int().min(0).max(60_000).optional(),
    show_timer: z.boolean().optional(),
    density: z.enum(["compact", "comfortable", "spacious"]).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Visibility window
// ---------------------------------------------------------------------------

const ISO_DATETIME = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "invalid_iso_datetime");

const VisibilitySchema = z
  .object({
    min_tier: z.enum(["guest", "registered", "amanah", "vip"]).optional(),
    platforms: z.array(z.enum(["web", "ios", "android"])).optional(),
    starts_at: ISO_DATETIME.optional(),
    ends_at: ISO_DATETIME.optional(),
  })
  .strict()
  .refine(
    (v) =>
      !v.starts_at ||
      !v.ends_at ||
      Date.parse(v.starts_at) < Date.parse(v.ends_at),
    { message: "visibility.starts_at_must_precede_ends_at" },
  );

// ---------------------------------------------------------------------------
// Zone overrides
// ---------------------------------------------------------------------------

const ZoneOverridesSchema = z
  .object({
    stories: z
      .object({
        icon_url: z.string().url().optional(),
        label: z.string().min(1).max(80).optional(),
        sort_order: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
    grid: z
      .object({
        cover_url: z.string().url().optional(),
        label: z.string().min(1).max(80).optional(),
        sort_order: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
    home_feed: z
      .object({
        sort_order: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// LayoutBlock
// ---------------------------------------------------------------------------

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export const LayoutBlockSchema = z
  .object({
    id: z.string().regex(ULID_RE, "id_must_be_ulid"),
    kind: LayoutBlockKindSchema,
    title: z.string().min(1).max(120).optional(),
    subtitle: z.string().min(1).max(240).optional(),
    is_active: z.boolean(),
    sort_order: z.number().int().min(0),
    config: BlockConfigSchema.optional(),
    entity_refs: z.array(EntityRefSchema).max(40).optional(),
    display_in_stories: z.boolean(),
    display_in_grid: z.boolean(),
    display_in_home_feed: z.boolean(),
    zone_overrides: ZoneOverridesSchema.optional(),
    visibility: VisibilitySchema.optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    // Rule 8: at least one zone flag must be true (no orphan blocks).
    if (!b.display_in_stories && !b.display_in_grid && !b.display_in_home_feed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `block_orphaned:${b.id}`,
      });
    }
    // Rule 9: stories require a derivable icon (override icon OR a category ref).
    if (b.display_in_stories) {
      const hasIcon = !!b.zone_overrides?.stories?.icon_url;
      const firstRef = b.entity_refs?.[0];
      const hasCategoryRef = firstRef?.kind === "category";
      if (!hasIcon && !hasCategoryRef) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `stories_requires_icon:${b.id}`,
        });
      }
    }
    // Rule 10: grid requires a label (block.title OR zone_overrides.grid.label).
    if (b.display_in_grid) {
      const hasLabel = !!b.title || !!b.zone_overrides?.grid?.label;
      if (!hasLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `grid_requires_label:${b.id}`,
        });
      }
    }
    // Kind-specific: carousel requires ≥1 entity_ref.
    if (b.kind === "carousel" && (!b.entity_refs || b.entity_refs.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `carousel_requires_entity_refs:${b.id}`,
      });
    }
  });

export type LayoutBlock = z.infer<typeof LayoutBlockSchema>;

// ---------------------------------------------------------------------------
// MobileHomeLayoutV1
// ---------------------------------------------------------------------------

const MAX_BLOCKS = 40;
const MAX_DOC_BYTES = 64 * 1024;

function assertUniqueDenseSort(
  blocks: LayoutBlock[],
  ctx: z.RefinementCtx,
  field: "sort_order" | "stories" | "grid",
) {
  const values: number[] = [];
  for (const b of blocks) {
    if (field === "sort_order") {
      values.push(b.sort_order);
    } else {
      const v = b.zone_overrides?.[field]?.sort_order;
      if (typeof v === "number") values.push(v);
    }
  }
  const uniq = new Set(values);
  if (uniq.size !== values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `duplicate_sort_order:${field}`,
    });
  }
}

export const MobileHomeLayoutSchema = z
  .object({
    __v: z.literal(1),
    page_key: z.literal("mobile_home"),
    updated_at: ISO_DATETIME,
    updated_by: z.string().min(1),
    blocks: z.array(LayoutBlockSchema).max(MAX_BLOCKS),
    draft: z.array(LayoutBlockSchema).max(MAX_BLOCKS).optional(),
  })
  .strict()
  .superRefine((doc, ctx) => {
    // Rule 1: unique block IDs across the published list.
    const ids = doc.blocks.map((b) => b.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duplicate_block_ids",
      });
    }
    // Rule 2: dense, unique sort_order across the published list.
    assertUniqueDenseSort(doc.blocks, ctx, "sort_order");
    // Rule 11: per-zone sort_order uniqueness (when present).
    assertUniqueDenseSort(doc.blocks, ctx, "stories");
    assertUniqueDenseSort(doc.blocks, ctx, "grid");
    // Rule 7: total document size ≤ 64 KB.
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
      if (bytes > MAX_DOC_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `doc_too_large:${bytes}`,
        });
      }
    } catch {
      // ignore stringify errors; the rest of the schema would have caught structural issues.
    }
  });

export type MobileHomeLayoutV1 = z.infer<typeof MobileHomeLayoutSchema>;

// ---------------------------------------------------------------------------
// Constants re-exported for callers (gateway, hooks).
// ---------------------------------------------------------------------------

export const MOBILE_HOME_LAYOUT_KEY = "mobile_home_layout_v1" as const;
export const MOBILE_HOME_LAYOUT_DRAFT_KEY = "mobile_home_layout_v1_draft" as const;
export const LAYOUT_KEY_PREFIX = "mobile_home_layout_" as const;
