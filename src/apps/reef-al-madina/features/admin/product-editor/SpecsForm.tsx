import { Field, Toggle, inputCls } from "./primitives";
import { SOURCES, type FieldDef, type ProductRow } from "./types";
import { Input } from "@/components/ui/input";

interface Props {
  form: ProductRow;
  fields: FieldDef[];
  updateMeta: (key: string, value: string | number | boolean | null) => void;
}

const SpecsForm = ({ form, fields, updateMeta }: Props) => {
  return (
    <div className="space-y-3 mt-0">
      <div className="rounded-2xl border border-border/60 bg-surface/50 p-4">
        <p className="text-[12px] text-foreground-secondary mb-3">
          مواصفات خاصة بقسم: <strong className="text-foreground">{SOURCES.find(s => s.v === form.source)?.l}</strong>
        </p>
        {fields.length === 0 ? (
          <p className="text-[12.5px] text-foreground-tertiary text-center py-6">
            لا توجد مواصفات خاصة لهذا القسم. غيّر القسم لتفعيل الحقول الديناميكية.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => {
              const val = (form.metadata ?? {})[f.key];
              if (f.kind === "bool") {
                return (
                  <div key={f.key} className="sm:col-span-2 flex items-center gap-3">
                    <Toggle checked={!!val} onChange={(v) => updateMeta(f.key, v)} label={f.label} />
                  </div>
                );
              }
              if (f.kind === "select") {
                return (
                  <Field key={f.key} label={f.label}>
                    <select
                      value={(val as string) ?? ""}
                      onChange={(e) => updateMeta(f.key, e.target.value || null)}
                      className={inputCls}
                    >
                      <option value="">— اختر —</option>
                      {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </Field>
                );
              }
              return (
                <Field key={f.key} label={f.label + (f.kind === "number" && f.suffix ? ` (${f.suffix})` : "")}>
                  <Input
                    type={f.kind === "number" ? "number" : "text"}
                    step="any"
                    placeholder={f.kind === "text" ? f.placeholder : undefined}
                    value={(val as string | number | undefined) ?? ""}
                    onChange={(e) => updateMeta(
                      f.key,
                      f.kind === "number"
                        ? (e.target.value === "" ? null : Number(e.target.value))
                        : (e.target.value || null),
                    )}
                    className={inputCls + (f.kind === "number" ? " num text-right" : "")}
                  />
                </Field>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecsForm;
