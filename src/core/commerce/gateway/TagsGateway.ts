/**
 * TagsGateway — Phase D-5 Read Path
 *
 * Authoritative read façade for the `asset_tags` vocabulary and
 * `asset_tag_links` graph. Phase D-5 only needs read + autocomplete;
 * persistence (sync of links on save) lands in Phase D-6.
 *
 * UI MUST consume tags through this gateway — never `supabase.from()`
 * directly (per `SUPABASE_SOVEREIGNTY.md`).
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  AssetTag,
  AssetTagLinkResolved,
} from "@/core/commerce/types/assetTag";

const TAGS_TABLE = "asset_tags";
const LINKS_TABLE = "asset_tag_links";

type RawTag = {
  id: string;
  tag_key: string;
  tag_value: string;
  label_i18n: Record<string, string> | null;
  parent_tag_id: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapTag(r: RawTag): AssetTag {
  return {
    id: r.id,
    tag_key: r.tag_key,
    tag_value: r.tag_value,
    label_i18n: (r.label_i18n ?? {}) as AssetTag["label_i18n"],
    parent_tag_id: r.parent_tag_id,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    is_active: r.is_active,
    sort_order: r.sort_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const TagsGateway = {
  /** List all active tags (vocabulary) — feeds the combobox suggestions. */
  async listAll(): Promise<AssetTag[]> {
    const { data, error } = await supabase
      .from(TAGS_TABLE)
      .select(
        "id,tag_key,tag_value,label_i18n,parent_tag_id,metadata,is_active,sort_order,created_at,updated_at",
      )
      .eq("is_active", true)
      .order("tag_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("tag_value", { ascending: true })
      .limit(2000);
    if (error) throw error;
    return (data as RawTag[] | null ?? []).map(mapTag);
  },

  /** List the tags currently linked to an asset (for hydration in edit mode). */
  async listLinksFor(assetId: string): Promise<AssetTagLinkResolved[]> {
    const { data, error } = await supabase
      .from(LINKS_TABLE)
      .select(
        "asset_id,tag_id,weight,assigned_by,assigned_at,tag:asset_tags(id,tag_key,tag_value,label_i18n,parent_tag_id,metadata,is_active,sort_order,created_at,updated_at)",
      )
      .eq("asset_id", assetId);
    if (error) throw error;
    type Row = {
      asset_id: string;
      tag_id: string;
      weight: number;
      assigned_by: string | null;
      assigned_at: string;
      tag: RawTag | null;
    };
    return ((data as Row[] | null) ?? [])
      .filter((r) => r.tag != null)
      .map((r) => ({
        asset_id: r.asset_id,
        tag_id: r.tag_id,
        weight: Number(r.weight ?? 1),
        assigned_by: r.assigned_by,
        assigned_at: r.assigned_at,
        tag: mapTag(r.tag as RawTag),
      }));
  },
};
