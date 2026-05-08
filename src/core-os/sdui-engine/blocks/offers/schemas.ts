/**
 * SDUI Offer Blocks (Phase 21).
 * Three new Level-4 Stem Cell schemas that turn legacy offer rails into
 * registry-driven, admin-mutable surfaces. Each block carries the Baraka
 * (`honest_margin`) and Amanah (`amanah_lock`) sovereign vectors so any
 * card can reveal transparent margin and gate access by trust tier.
 */
import { z } from "zod";

const TIER = z.enum(["bronze", "silver", "gold", "platinum"]);

const OfferSovereignFields = {
  honest_margin: z.number().min(0).max(100).optional(),
  amanah_lock: TIER.optional(),
  allow_fakka_roundup: z.boolean().optional(),
};

export const OfferFlashSaleBlockSchema = z.object({
  type: z.literal("offer_flash_sale"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    subtitle: z.string().max(120).optional(),
    target_id: z.string().nullable().optional(),
    ...OfferSovereignFields,
  }),
});

export const OfferBundleBlockSchema = z.object({
  type: z.literal("offer_bundle"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    subtitle: z.string().max(120).optional(),
    target_id: z.string().nullable().optional(),
    ...OfferSovereignFields,
  }),
});

export const OfferGroupBuyBlockSchema = z.object({
  type: z.literal("offer_group_buy"),
  id: z.string().min(1),
  props: z.object({
    title: z.string().max(80).optional(),
    subtitle: z.string().max(120).optional(),
    campaign_id: z.string().min(1),
    ...OfferSovereignFields,
  }),
});

export type SduiOfferFlashSaleBlock = z.infer<typeof OfferFlashSaleBlockSchema>;
export type SduiOfferBundleBlock = z.infer<typeof OfferBundleBlockSchema>;
export type SduiOfferGroupBuyBlock = z.infer<typeof OfferGroupBuyBlockSchema>;
