/**
 * AdminFormEngine — renders the active `form` (create/edit) schema for an
 * entity using react-hook-form + the AdminBlockRenderer registry.
 */
import { useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useEntityDefinition } from "../hooks/useEntityDefinition";
import { useEntityRecord } from "../hooks/useEntityRecord";
import { useEntityMutation } from "../hooks/useEntityMutation";
import { AdminBlockRenderer } from "../components/AdminBlockRenderer";
import { parseAdminBlocks, type AdminBlock, type FormFieldBlock } from "../schemas";

interface Props {
  entityKey: string;
  recordId?: string;
  locale?: string;
  onSaved?: (record: Record<string, unknown>) => void;
}

function autoFormFromAttributes(
  attrs: NonNullable<ReturnType<typeof useEntityDefinition>["data"]>["attributes"],
): AdminBlock[] {
  return attrs.map<FormFieldBlock>((a) => ({
    type: "form_field",
    id: `f-${a.key}`,
    props: {
      key: a.key,
      label_i18n: a.label_i18n,
      data_type: (a.data_type as FormFieldBlock["props"]["data_type"]) ?? "text",
      widget: (a.ui_widget as FormFieldBlock["props"]["widget"]) ?? undefined,
      help_i18n: a.help_i18n ?? undefined,
      required: false,
      col_span: "1",
    },
  }));
}

export function AdminFormEngine({ entityKey, recordId, locale = "ar", onSaved }: Props) {
  const def = useEntityDefinition(entityKey);
  const record = useEntityRecord(
    entityKey,
    def.data?.definition.table_name,
    def.data?.definition.primary_key_col,
    recordId,
  );
  const upsert = useEntityMutation();

  const blocks = useMemo<AdminBlock[]>(() => {
    if (!def.data) return [];
    const mode = recordId ? "edit" : "create";
    const schema = def.data.formSchemas.find((s) => s.mode === mode)
      ?? def.data.formSchemas.find((s) => s.mode === "form");
    if (schema) {
      const parsed = parseAdminBlocks(schema.blocks);
      if (parsed.length > 0) return parsed;
    }
    return autoFormFromAttributes(def.data.attributes);
  }, [def.data, recordId]);

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  useEffect(() => {
    if (record.data) form.reset(record.data);
  }, [record.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await upsert.mutateAsync({
      entity_key: entityKey,
      record_id: recordId ?? null,
      payload: values,
    });
    onSaved?.(result);
  });

  if (def.isLoading) return <div className="p-8 animate-pulse">…</div>;
  if (!def.data) return <div className="p-8 text-destructive">كيان غير معرّف: {entityKey}</div>;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        {blocks.map((b) => (
          <AdminBlockRenderer
            key={b.id}
            block={b}
            ctx={{ control: form.control, record: record.data ?? undefined, locale }}
          />
        ))}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={upsert.isPending} className="rounded-2xl px-8">
            {upsert.isPending ? "جارٍ الحفظ…" : recordId ? "تحديث" : "إنشاء"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
