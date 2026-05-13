/**
 * Phase D-4 — Multi-Dimensional Classification Graph
 *
 * Domain-level types for the asset_tags vocabulary and asset_tag_links graph.
 * These mirror the DB tables created in 20260514_classification_graph.sql.
 *
 * NOTE: src/integrations/supabase/types.ts is auto-generated. These interfaces
 * are the *domain* projection — gateways/UI MUST consume these, not raw rows.
 */

export interface AssetTagLabelI18n {
  ar?: string;
  en?: string;
  [locale: string]: string | undefined;
}

/**
 * Vocabulary entry. A tag is a (key, value) pair on an axis.
 *   tag_key   = the axis ("department" | "campaign" | "diet" | "velocity" | …)
 *   tag_value = the discrete value on that axis ("dairy", "ramadan_2026", …)
 */
export interface AssetTag {
  id: string;
  tag_key: string;
  tag_value: string;
  label_i18n: AssetTagLabelI18n;
  parent_tag_id: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Draft used by admin UI before insert. */
export type AssetTagDraft = Omit<
  AssetTag,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
};

/**
 * Many-to-many membership: an asset participates in a tag with optional weight.
 * Composite PK is (asset_id, tag_id).
 */
export interface AssetTagLink {
  asset_id: string;
  tag_id: string;
  weight: number;
  assigned_by: string | null;
  assigned_at: string;
}

/** Resolved view: link joined with its tag, used by listing UIs. */
export interface AssetTagLinkResolved extends AssetTagLink {
  tag: AssetTag;
}

/** Grouped facet view used by tag-pickers and filter sidebars. */
export interface AssetTagAxis {
  tag_key: string;
  tags: AssetTag[];
}
