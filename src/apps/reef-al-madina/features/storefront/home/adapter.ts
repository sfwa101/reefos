/**
 * Wave P-A — Storefront Purity.
 *
 * `homeProductCardAdapter` is the *only* place where capability keys and
 * `attributes` from the canonical `ProductCardVM` are translated into the
 * home-feature-specific filter axes (`CatId`, `Fulfillment`) and the
 * legacy presentation fields (brand, tagline, badge labels, deposit %,
 * ETA days, warranty, wakalah eligibility, stock visibility flags).
 *
 * The VM stays untouched — this adapter is a *thin derivation layer*
 * consumed by the home components. Nothing in this file is allowed to
 * leak vertical-specific literals (Article 3a); category mapping flows
 * through `CAT_TO_SUBCAT`, which is the existing transitional dictionary
 * scheduled for elimination in Wave P-C.
 */
import type { ProductCardVM } from "@/core/catalog/types";

import { CAT_TO_SUBCAT } from "./dictionaries";
import type { CatId, Fulfillment } from "./types";

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const asNum = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const asBool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

const subCatToCatId = (subCat: string | undefined): CatId => {
  if (!subCat) return "all";
  for (const [catId, subs] of Object.entries(CAT_TO_SUBCAT)) {
    if (subs.includes(subCat)) return catId as CatId;
  }
  return "all";
};

export type HomeCardView = {
  /** Filter axis used by the legacy hardcoded `CATS` list. Wave P-C kills this. */
  catId: CatId;
  fulfillment: Fulfillment;
  isPreorder: boolean;
  depositPct?: number;
  etaDays?: number;
  warranty?: string;
  brand: string;
  tagline: string;
  /** Translated badge labels (Arabic preferred), derived from `vm.badges`. */
  badgeLabels: string[];
  /** Capability-derived: out-of-stock items reachable via brokered procurement. */
  isWakalah: boolean;
  /** Capability-derived: hide tile entirely when stock is zero. */
  hideOnZero: boolean;
  /** Optional raw stock quantity, exposed only to the inventory triage UI. */
  stockQty?: number;
};

export const homeProductCardAdapter = (card: ProductCardVM): HomeCardView => {
  const a = (card.attributes ?? {}) as Record<string, unknown>;

  const fulfillment: Fulfillment =
    a.fulfillment === "preorder" || card.capabilities.includes("fulfillment.preorder")
      ? "preorder"
      : "instant";

  const badgeLabels = card.badges
    .map((b) => b.label?.ar ?? b.key)
    .filter((s): s is string => typeof s === "string" && s.length > 0);

  return {
    catId: subCatToCatId(asStr(a.sub_category)),
    fulfillment,
    isPreorder: fulfillment === "preorder",
    depositPct: asNum(a.depositPct),
    etaDays: asNum(a.etaDays),
    warranty: asStr(a.warranty),
    brand: asStr(a.brand) ?? "Reef Home",
    tagline: asStr(a.tagline) ?? "",
    badgeLabels,
    isWakalah:
      card.capabilities.includes("wakalah.eligible") ||
      asBool(a.wakalahEligible) === true,
    hideOnZero: asBool(a.hideOnZero) === true,
    stockQty: asNum(a.stockQty) ?? asNum(a.stock),
  };
};
