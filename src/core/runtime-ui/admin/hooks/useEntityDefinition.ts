/**
 * useEntityDefinition — fetches an entity_definition + its attributes
 * + active form schemas. The single contract every Admin engine reads.
 */
import { useQuery } from "@tanstack/react-query";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";

export interface EntityAttributeRow {
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
  is_listable?: boolean;
  is_searchable?: boolean;
  is_filterable?: boolean;
  is_required?: boolean;
}

export interface FormSchemaRow {
  id: string;
  mode: string;
  version: number;
  is_active: boolean;
  blocks: unknown;
}

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
  attributes: EntityAttributeRow[];
  formSchemas: FormSchemaRow[];
}

export function useEntityDefinition(entityKey: string | undefined) {
  return useQuery<EntityDefinitionPayload | null>({
    queryKey: ["admin", "definition", entityKey],
    enabled: !!entityKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: def, error: dErr } = await RuntimeUIGateway.getEntityDefinition(entityKey!);
      if (dErr) throw dErr;
      if (!def) return null;

      const [attrs, schemas] = await Promise.all([
        RuntimeUIGateway.listEntityAttributes(def.id as string),
        RuntimeUIGateway.listActiveFormSchemas(def.id as string),
      ]);
      if (attrs.error) throw attrs.error;
      if (schemas.error) throw schemas.error;

      const attributes: EntityAttributeRow[] = (attrs.data ?? []).map((a: Record<string, unknown>) => {
        const row = a;
        return {
          id: row.id as string,
          key: row.key as string,
          label_i18n: (row.label_i18n as Record<string, string>) ?? {},
          data_type: row.data_type as string,
          ui_widget: (row.ui_widget as string | null) ?? null,
          validation: (row.validation_jsonb as Record<string, unknown> | null) ?? null,
          options: row.options_jsonb,
          sort_order: (row.sort_order as number) ?? 0,
          role_visibility: (row.role_visibility as string[] | null) ?? null,
          help_i18n: (row.help_i18n as Record<string, string> | null) ?? null,
          is_listable: row.is_listable as boolean | undefined,
          is_searchable: row.is_searchable as boolean | undefined,
          is_filterable: row.is_filterable as boolean | undefined,
          is_required: row.is_required as boolean | undefined,
        };
      });

      const formSchemas: FormSchemaRow[] = (schemas.data ?? []).map((s: Record<string, unknown>) => {
        const row = s;
        return {
          id: row.id as string,
          mode: row.mode as string,
          version: (row.version as number) ?? 1,
          is_active: (row.active as boolean) ?? false,
          blocks: row.schema_jsonb,
        };
      });

      return {
        definition: def as EntityDefinitionPayload["definition"],
        attributes,
        formSchemas,
      };
    },
  });
}
