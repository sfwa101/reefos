/** SDUI FieldGroupBlock — pastel-soul card grouping fields. */
import type { FieldGroupBlock as FieldGroupBlockT } from "../schemas";
import type { AdminBlockContext } from "../registry";
import { FormFieldBlock } from "./FormFieldBlock";

const COLS: Record<string, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-3",
};

export function FieldGroupBlock({
  block, ctx,
}: { block: FieldGroupBlockT; ctx: AdminBlockContext }) {
  const { props } = block;
  const locale = ctx.locale ?? "ar";
  const title = props.title_i18n[locale] ?? props.title_i18n.ar;
  const desc = props.description_i18n?.[locale];

  return (
    <section className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 p-6 space-y-4 shadow-soft">
      <header>
        <h3 className="font-display text-lg">{title}</h3>
        {desc && <p className="text-[13px] text-foreground/60 mt-1">{desc}</p>}
      </header>
      <div className={`grid gap-4 ${COLS[props.columns]}`}>
        {props.fields.map((f) => <FormFieldBlock key={f.id} block={f} ctx={ctx} />)}
      </div>
    </section>
  );
}
