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
  AssetTagDraft,
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

  /**
   * Phase D-6 — Vocabulary upsert.
   * Upserts every draft into `asset_tags` keyed on (tag_key, tag_value)
   * and returns a map from the draft's local key (`tag_key::tag_value`)
   * to the resolved DB UUID. Existing drafts that already carry a real
   * UUID are passed through untouched.
   */
  async upsertVocabulary(
    drafts: AssetTagDraft[],
  ): Promise<Map<string, string>> {
    const resolved = new Map<string, string>();
    if (drafts.length === 0) return resolved;

    // Pass-through: already-persisted tags keep their id.
    const toUpsert: AssetTagDraft[] = [];
    for (const d of drafts) {
      const localKey = `${d.tag_key}::${d.tag_value}`;
      if (d.id) {
        resolved.set(localKey, d.id);
      } else {
        toUpsert.push(d);
      }
    }
    if (toUpsert.length === 0) return resolved;

    const payload = toUpsert.map((d) => ({
      tag_key: d.tag_key,
      tag_value: d.tag_value,
      label_i18n: d.label_i18n ?? {},
      parent_tag_id: d.parent_tag_id ?? null,
      metadata: d.metadata ?? {},
      is_active: d.is_active ?? true,
      sort_order: d.sort_order ?? 0,
    }));

    const { data, error } = await supabase
      .from(TAGS_TABLE)
      .upsert(payload, { onConflict: "tag_key,tag_value" })
      .select("id,tag_key,tag_value");
    if (error) throw error;

    for (const row of (data as { id: string; tag_key: string; tag_value: string }[] | null) ?? []) {
      resolved.set(`${row.tag_key}::${row.tag_value}`, row.id);
    }
    return resolved;
  },

  /**
   * Phase D-6 — Sync the tag-link graph for an asset.
   * 1) Upserts vocabulary to guarantee FK integrity.
   * 2) Upserts every (asset_id, tag_id) link.
   * 3) Diffs against existing links and DELETEs ones the Emperor removed.
   */
  async syncLinks(assetId: string, drafts: AssetTagDraft[]): Promise<void> {
    const vocab = await this.upsertVocabulary(drafts);

    const desiredTagIds = new Set<string>();
    for (const d of drafts) {
      const id = vocab.get(`${d.tag_key}::${d.tag_value}`);
      if (id) desiredTagIds.add(id);
    }

    if (desiredTagIds.size > 0) {
      const linkPayload = Array.from(desiredTagIds).map((tag_id) => ({
        asset_id: assetId,
        tag_id,
        weight: 1,
      }));
      const { error: upErr } = await supabase
        .from(LINKS_TABLE)
        .upsert(linkPayload, { onConflict: "asset_id,tag_id" });
      if (upErr) throw upErr;
    }

    // Diff & delete removed links.
    const { data: existing, error: exErr } = await supabase
      .from(LINKS_TABLE)
      .select("tag_id")
      .eq("asset_id", assetId);
    if (exErr) throw exErr;

    const toDelete = ((existing as { tag_id: string }[] | null) ?? [])
      .map((r) => r.tag_id)
      .filter((id) => !desiredTagIds.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from(LINKS_TABLE)
        .delete()
        .eq("asset_id", assetId)
        .in("tag_id", toDelete);
      if (delErr) throw delErr;
    }
  },

  /** Phase D-6 — Wipe ALL tag links for an asset (used when toggle is off). */
  async wipeLinks(assetId: string): Promise<void> {
    const { error } = await supabase
      .from(LINKS_TABLE)
      .delete()
      .eq("asset_id", assetId);
    if (error) throw error;
  },
};
