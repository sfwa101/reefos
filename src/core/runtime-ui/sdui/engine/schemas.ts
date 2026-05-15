/**
 * SDUI Block Schemas (Phase 16.01)
 * --------------------------------
 * Strict Zod contracts for every renderable block. Unknown blocks or
 * malformed payloads are dropped by `parseBlocks` instead of crashing
 * the screen — Graceful Degradation is a hard requirement.
 */
import { z } from "zod";
import {
  OfferFlashSaleBlockSchema,
  OfferBundleBlockSchema,
  OfferGroupBuyBlockSchema,
  OfferNeighborhoodPoolBlockSchema,
  PredictiveRefillRailBlockSchema,
} from "../blocks/offers/schemas";
import { Tracer } from "@/core/system/observability/Tracer";

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
  size: z.enum(["wide", "tall", "half", "full"]).default("half"),
  tone: z.enum(BENTO_TONES).optional(),
  motif: z.enum(MOTIF_IDS).optional(),
});

export const BentoGridBlockSchema = z.object({
  type: z.literal("bento_grid"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
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
    items: z.array(RailItemSchema).min(1).max(24),
  }),
});

/**
 * Modifier Group block — exposes the Universal Modifier Engine to SDUI.
 * Lets the System Editor attach modifier "Puzzle Pieces" (single/multi
 * choice, text input, quantity) to ANY product across the OS family.
 */
export const ModifierOptionBlockSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  price: z.number().nonnegative().optional(),
  hint: z.string().max(80).optional(),
  disabled: z.boolean().optional(),
});

const ACCENTS = ["primary", "rose", "violet", "emerald", "amber"] as const;

export const ModifierGroupBlockSchema = z.object({
  type: z.literal("modifier_group"),
  id: z.string().min(1),
  props: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("selection"),
      id: z.string().min(1),
      title: z.string().min(1).max(80),
      mode: z.enum(["single", "multi"]),
      layout: z.enum(["list", "grid"]).optional(),
      required: z.boolean().optional(),
      icon: z.string().max(8).optional(),
      accent: z.enum(ACCENTS).optional(),
      options: z.array(ModifierOptionBlockSchema).min(1).max(48),
    }),
    z.object({
      kind: z.literal("text"),
      id: z.string().min(1),
      title: z.string().min(1).max(80),
      placeholder: z.string().max(160).optional(),
      hint: z.string().max(80).optional(),
      rows: z.number().int().min(1).max(8).optional(),
      required: z.boolean().optional(),
      icon: z.string().max(8).optional(),
      accent: z.enum(ACCENTS).optional(),
    }),
    z.object({
      kind: z.literal("quantity"),
      id: z.string().min(1),
      title: z.string().min(1).max(80),
      min: z.number().int().optional(),
      max: z.number().int().optional(),
      step: z.number().int().positive().optional(),
      accent: z.enum(ACCENTS).optional(),
    }),
    z.object({
      kind: z.literal("visual"),
      id: z.string().min(1),
      title: z.string().min(1).max(80),
      mode: z.enum(["single", "multi"]),
      required: z.boolean().optional(),
      icon: z.string().max(8).optional(),
      accent: z.enum(ACCENTS).optional(),
      options: z.array(
        z.object({
          id: z.string().min(1).max(64),
          label: z.string().min(1).max(120),
          color: z.string().max(64).optional(),
          image: z.string().url().max(512).optional(),
          disabled: z.boolean().optional(),
        }),
      ).min(1).max(48),
    }),
  ]),
});

/* Phase VIII — Khalil Super-App blocks */
export const AppGridBlockSchema = z.object({
  type: z.literal("app_grid"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    /** App registry IDs to render. Use ["*"] for all visible apps. */
    appIds: z.array(z.string().min(1).max(64)).min(1).max(24),
  }),
});

export const OmniSearchBlockSchema = z.object({
  type: z.literal("omni_search"),
  id: z.string().min(1),
  props: z.object({
    placeholder: z.string().max(120).optional(),
    scopes: z.array(z.enum(["reef", "asrab", "nabd"])).min(1),
  }),
});

export const UnifiedStatusBlockSchema = z.object({
  type: z.literal("unified_status"),
  id: z.string().min(1),
  props: z.object({}).optional().default({}),
});

export const BarqTrackingBlockSchema = z.object({
  type: z.literal("barq_tracking"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    subtitle: z.string().max(120).optional(),
  }),
});

export const BlockSchema = z.discriminatedUnion("type", [
  HeroBlockSchema,
  BentoGridBlockSchema,
  SmartRailBlockSchema,
  ModifierGroupBlockSchema,
  AppGridBlockSchema,
  OmniSearchBlockSchema,
  UnifiedStatusBlockSchema,
  BarqTrackingBlockSchema,
  OfferFlashSaleBlockSchema,
  OfferBundleBlockSchema,
  OfferGroupBuyBlockSchema,
  OfferNeighborhoodPoolBlockSchema,
  PredictiveRefillRailBlockSchema,
]);

export type SduiModifierGroupBlock = z.infer<typeof ModifierGroupBlockSchema>;

export type SduiBlock = z.infer<typeof BlockSchema>;
export type SduiHeroBlock = z.infer<typeof HeroBlockSchema>;
export type SduiBentoBlock = z.infer<typeof BentoGridBlockSchema>;
export type SduiRailBlock = z.infer<typeof SmartRailBlockSchema>;
export type SduiAppGridBlock = z.infer<typeof AppGridBlockSchema>;
export type SduiOmniSearchBlock = z.infer<typeof OmniSearchBlockSchema>;
export type SduiUnifiedStatusBlock = z.infer<typeof UnifiedStatusBlockSchema>;
export type SduiBarqTrackingBlock = z.infer<typeof BarqTrackingBlockSchema>;

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
      Tracer.warn("runtime-ui", "sdui_dropped_invalid_block", { args: ["[SDUI] dropped invalid block", r.error.issues[0]?.message] });
    }
  }
  return out;
}
