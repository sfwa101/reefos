/**
 * useEntityDefinition — fetches an entity_definition + its attributes
 * + active form schemas. The single contract every Admin engine reads.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntityDefinitionPayload {
  definition: {
    id: string;
    key: string;
    label_i18n: Record<string, string>;
    table_name: string;
    primary_key_col: string;
    is_system: boolean;
    sort_order: number;
  };
  attributes: Array<{
    id: string;
    key: string;
    label_i18n: Record<string, string>;
    data_type: string;
    ui_widget: string | null;
    validation: Record<string, unknown> | null;
    options: unknown;
    sort_order: number;
    role_visibility: string[] | null;
    help_i18n: Record<string, string> | null;
  }>;
  formSchemas: Array<{
    id: string;
    mode: string;
    version: number;
    is_active: boolean;
    blocks: unknown;
  }>;
}

export function useEntityDefinition(entityKey: string | undefined) {
  return useQuery<EntityDefinitionPayload | null>({
    queryKey: ["admin", "definition", entityKey],
    enabled: !!entityKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: def, error: dErr } = await supabase
        .from("entity_definitions")
        .select("*")
        .eq("key", entityKey!)
        .maybeSingle();
      if (dErr) throw dErr;
      if (!def) return null;

      const [attrs, schemas] = await Promise.all([
        supabase.from("entity_attributes")
          .select("*").eq("entity_id", def.id).order("sort_order"),
        supabase.from("admin_form_schemas")
          .select("*").eq("entity_id", def.id).eq("is_active", true),
      ]);
      if (attrs.error) throw attrs.error;
      if (schemas.error) throw schemas.error;

      return {
        definition: def as EntityDefinitionPayload["definition"],
        attributes: (attrs.data ?? []) as EntityDefinitionPayload["attributes"],
        formSchemas: (schemas.data ?? []) as EntityDefinitionPayload["formSchemas"],
      };
    },
  });
}
