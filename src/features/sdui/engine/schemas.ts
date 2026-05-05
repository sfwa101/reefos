/**
 * SDUI Block Schemas (Phase 16.01)
 * --------------------------------
 * Strict Zod contracts for every renderable block. Unknown blocks or
 * malformed payloads are dropped by `parseBlocks` instead of crashing
 * the screen — Graceful Degradation is a hard requirement.
 */
import { z } from "zod";

export const HeroBlockSchema = z.object({
  type: z.literal("hero"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().min(1).max(120),
    subtitle: z.string().max(200).optional(),
    tone: z.enum(["graphite", "sand", "ocean", "rose"]).optional(),
  }),
});

export const BENTO_TONES = [
  "emerald", "rose", "amber", "violet", "sky", "teal",
  "orange", "pink", "lime", "indigo", "fuchsia", "graphite",
] as const;

/** Mesh motif IDs — these activate the legacy MeshBg + MotifIcon palette. */
export const MOTIF_IDS = [
  "village", "supermarket", "kitchen", "produce", "dairy", "meat",
  "restaurants", "sweets", "baskets", "recipes", "pharmacy", "library",
  "home", "gifts", "subs", "wholesale",
  // legacy abstract overlays kept for backwards compat
  "mesh", "rings", "grid", "glow", "wave",
] as const;

export const BentoItemSchema = z.object({
  key: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  subtitle: z.string().max(120).optional(),
  emoji: z.string().max(8).optional(),
  to: z.string().min(1).max(200),
  size: z.enum(["wide", "half", "full"]).catch("half").default("half"),
  tone: z.enum(BENTO_TONES).optional(),
  motif: z.enum(MOTIF_IDS).optional(),
  theme_config: z.object({
    tone: z.enum(BENTO_TONES).optional(),
    motif: z.enum(MOTIF_IDS).optional(),
    glass: z.boolean().optional(),
    vector: z.enum(["mesh", "rings", "grid", "glow", "wave"]).optional(),
  }).optional(),
});

export const BentoGridBlockSchema = z.object({
  type: z.literal("bento_grid"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    dense: z.boolean().optional(),
    items: z.array(BentoItemSchema).min(1).max(48),
  }),
});

export const RailItemSchema = z.object({
  key: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  emoji: z.string().max(8).optional(),
  to: z.string().min(1).max(200),
});

export const SmartRailBlockSchema = z.object({
  type: z.literal("smart_rail"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    sticky: z.boolean().optional(),
    items: z.array(RailItemSchema).min(1).max(24),
  }),
});

/** SECTION HEADER block — colorful pill heading for grouped sections. */
export const SectionHeaderBlockSchema = z.object({
  type: z.literal("section_header"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().min(1).max(80),
    emoji: z.string().max(8).optional(),
    tone: z.enum(BENTO_TONES).optional(),
    anchor: z.string().max(64).optional(),
  }),
});


/** PRODUCT RAIL block — data-driven horizontal product list filtered by source + subCategory key. */
export const ProductRailBlockSchema = z.object({
  type: z.literal("product_rail"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    source: z.string().min(1).max(40),
    sub_category: z.string().max(80).optional(),
    /** Optional fallback name keyword matcher (used when sub_category is missing on legacy rows). */
    keywords: z.array(z.string().min(1).max(40)).max(12).optional(),
    limit: z.number().int().min(1).max(40).default(12),
    tone: z.enum(BENTO_TONES).optional(),
  }),
});

export const BlockSchema = z.discriminatedUnion("type", [
  HeroBlockSchema,
  BentoGridBlockSchema,
  SmartRailBlockSchema,
  SectionHeaderBlockSchema,
  ProductRailBlockSchema,
]);

export type SduiBlock = z.infer<typeof BlockSchema>;
export type SduiHeroBlock = z.infer<typeof HeroBlockSchema>;
export type SduiBentoBlock = z.infer<typeof BentoGridBlockSchema>;
export type SduiRailBlock = z.infer<typeof SmartRailBlockSchema>;
export type SduiSectionHeaderBlock = z.infer<typeof SectionHeaderBlockSchema>;
export type SduiProductRailBlock = z.infer<typeof ProductRailBlockSchema>;

/**
 * Defensive parser: never throws. Drops any block that fails validation
 * or has an unknown `type`. Returns the surviving blocks in order.
 */
export function parseBlocks(raw: unknown): SduiBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: SduiBlock[] = [];
  for (const candidate of raw) {
    const r = BlockSchema.safeParse(candidate);
    if (r.success) out.push(r.data);
    else if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[SDUI] dropped invalid block", r.error.issues[0]?.message);
    }
  }
  return out;
}
