/** SDUI FormFieldBlock — minimal stub renderer (Phase A Step 2). */
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { FormFieldBlock as FormFieldBlockT } from "../schemas";
import type { AdminBlockContext } from "../registry";

const COL_SPAN: Record<string, string> = {
  "1": "col-span-1", "2": "col-span-2", "3": "col-span-3", full: "col-span-full",
};

export function FormFieldBlock({
  block, ctx,
}: { block: FormFieldBlockT; ctx: AdminBlockContext }) {
  const { props } = block;
  const locale = ctx.locale ?? "ar";
  const label = props.label_i18n[locale] ?? props.label_i18n.ar ?? props.key;
  const placeholder = props.placeholder_i18n?.[locale];
  const help = props.help_i18n?.[locale];

  if (!ctx.control) {
    // No RHF context — render label only (e.g. preview)
    return (
      <div className={COL_SPAN[props.col_span]}>
        <label className="text-[13px] font-medium text-foreground/80">{label}</label>
      </div>
    );
  }

  return (
    <Controller
      control={ctx.control}
      name={props.key}
      render={({ field, fieldState }) => (
        <div className={`${COL_SPAN[props.col_span]} space-y-2`}>
          <label className="text-[13px] font-medium text-foreground/80">
            {label}{props.required && <span className="text-destructive ms-1">*</span>}
          </label>
          {props.widget === "textarea" || props.data_type === "textarea" ? (
            <Textarea {...field} value={field.value ?? ""} placeholder={placeholder}
              className="rounded-2xl bg-card/60 backdrop-blur-xl" />
          ) : props.widget === "switch" || props.data_type === "boolean" ? (
            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
          ) : (
            <Input {...field} value={field.value ?? ""} placeholder={placeholder}
              type={props.data_type === "number" || props.data_type === "decimal" ? "number"
                : props.data_type === "email" ? "email"
                : props.data_type === "date" ? "date"
                : "text"}
              className="rounded-2xl bg-card/60 backdrop-blur-xl" />
          )}
          {help && <p className="text-[11px] text-foreground/50">{help}</p>}
          {fieldState.error && (
            <p className="text-[11px] text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
