/**
 * Block components — capability-driven runtime blocks.
 *
 * كل بلوك يستهلك slice محدد من ProductCardVM/ProductDetailsVM ولا يعرف القسم.
 * المظهر النهائي يأتي من tone/cardStyle المُمرّرين عبر context.
 *
 * مهم: هذه نسخة MVP — يمكن استبدال أي تطبيق بلا تغيير الـ resolver.
 */
import type { BlockComponent } from "@/core/runtime-ui/RuntimeRenderer";
import { Button } from "@/components/ui/button";
import type {
  BadgeVM,
  MediaRefVM,
  PriceVM,
  ProductAddonVM,
  ProductCardVM,
  ProductDetailsVM,
  ProductNutritionVM,
  ProductRelationVM,
  ProductVariantVM,
} from "@/core/catalog/types";

const fmt = (p: PriceVM) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(p.amount);

// ─── Section header ───
export const SectionHeaderBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { title?: { ar: string; en?: string }; tone?: string };
  return (
    <header className="px-4 pt-4 pb-2" data-tone={props.tone ?? "neutral"}>
      <h1 className="text-2xl font-bold text-foreground">{props.title?.ar ?? ""}</h1>
    </header>
  );
};

// ─── Product card (atom) ───
function CardAtom({ p, cardStyle }: { p: ProductCardVM; cardStyle: string }) {
  return (
    <article
      className="rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md"
      data-card-style={cardStyle}
    >
      {p.hero && (
        <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-muted">
          <img src={p.hero.url} alt={p.hero.alt.ar} loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{p.name.ar}</h3>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-base font-bold text-primary">{fmt(p.price)}</span>
        {p.price.compareAt && (
          <span className="text-xs text-muted-foreground line-through">
            {fmt({ ...p.price, amount: p.price.compareAt })}
          </span>
        )}
      </div>
      {p.badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {p.badges.slice(0, 2).map((b: BadgeVM) => (
            <span key={b.key} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
              {b.label?.ar ?? b.key}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export const ProductGridBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { items?: ProductCardVM[]; cardStyle?: string };
  const items = props.items ?? [];
  if (!items.length) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        لا توجد منتجات بعد في هذا القسم.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((p) => (
        <CardAtom key={p.id} p={p} cardStyle={props.cardStyle ?? "compact"} />
      ))}
    </div>
  );
};

export const ProductListBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { items?: ProductCardVM[]; cardStyle?: string };
  const items = props.items ?? [];
  return (
    <ul className="flex flex-col gap-2 px-4 pb-4">
      {items.map((p) => (
        <li key={p.id}>
          <CardAtom p={p} cardStyle={props.cardStyle ?? "list_dense"} />
        </li>
      ))}
    </ul>
  );
};

// ─── Details blocks ───
export const ProductGalleryBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { hero?: MediaRefVM; gallery?: MediaRefVM[] };
  const all = [props.hero, ...(props.gallery ?? [])].filter(Boolean) as MediaRefVM[];
  if (!all.length) return null;
  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-3">
      {all.map((m, i) => (
        <img key={i} src={m.url} alt={m.alt.ar} className="aspect-square w-64 snap-center rounded-2xl object-cover" />
      ))}
    </div>
  );
};

export const ProductHeadingBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { name?: { ar: string }; badges?: BadgeVM[] };
  return (
    <div className="px-4 pt-2">
      <h1 className="text-2xl font-bold text-foreground">{props.name?.ar}</h1>
      {props.badges?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {props.badges.map((b) => (
            <span key={b.key} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {b.label?.ar ?? b.key}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const ProductPriceBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { price?: PriceVM; saleUnit?: string };
  if (!props.price) return null;
  return (
    <div className="px-4 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{fmt(props.price)}</span>
        {props.price.compareAt && (
          <span className="text-sm text-muted-foreground line-through">
            {fmt({ ...props.price, amount: props.price.compareAt })}
          </span>
        )}
        <span className="text-xs text-muted-foreground">/ {props.saleUnit ?? "وحدة"}</span>
      </div>
    </div>
  );
};

export const ProductVariantsBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { variants?: ProductVariantVM[] };
  const v = props.variants ?? [];
  if (!v.length) return null;
  const groups = new Map<string, ProductVariantVM[]>();
  for (const x of v) {
    const arr = groups.get(x.axisKey) ?? [];
    arr.push(x);
    groups.set(x.axisKey, arr);
  }
  return (
    <div className="space-y-3 px-4 py-3">
      {Array.from(groups.entries()).map(([axis, opts]) => (
        <div key={axis}>
          <p className="mb-1 text-sm font-medium text-foreground">{axis}</p>
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <Button
                key={o.id}
                disabled={!o.inStock}
                className="rounded-full border border-border bg-background px-3 py-1 text-sm disabled:opacity-50"
              >
                {o.axisValueLabel.ar}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProductAddonsBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { addons?: ProductAddonVM[] };
  const a = props.addons ?? [];
  if (!a.length) return null;
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-sm font-semibold text-foreground">إضافات</p>
      <ul className="space-y-1 text-sm">
        {a.map((x) => (
          <li key={x.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span>{x.label.ar}</span>
            {x.priceDelta > 0 && <span className="text-muted-foreground">+ {x.priceDelta}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ProductDescriptionBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { text?: { ar: string } };
  if (!props.text) return null;
  return <p className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">{props.text.ar}</p>;
};

export const ProductNutritionBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { nutrition?: ProductNutritionVM };
  const n = props.nutrition;
  if (!n) return null;
  const entries = Object.entries(n.per100g);
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-sm font-semibold text-foreground">القيم الغذائية / 100 جم</p>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export const ProductDietFlagsBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { flags?: Record<string, boolean>; allergens?: string[] };
  const flags = Object.entries(props.flags ?? {}).filter(([, v]) => v);
  return (
    <div className="px-4 py-3">
      {flags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {flags.map(([k]) => (
            <span key={k} className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
              {k}
            </span>
          ))}
        </div>
      )}
      {props.allergens?.length ? (
        <p className="text-xs text-warning">يحتوي على: {props.allergens.join("، ")}</p>
      ) : null}
    </div>
  );
};

export const ProductRelationsBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { relations?: ProductRelationVM[] };
  const r = props.relations ?? [];
  if (!r.length) return null;
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-sm font-semibold text-foreground">قد يعجبك أيضاً</p>
      <p className="text-xs text-muted-foreground">{r.length} منتج مرتبط</p>
    </div>
  );
};

// ─── Commerce blocks ───
export const AddToCartBlock: BlockComponent = () => (
  <div className="sticky bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur">
    <Button className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground">
      أضف إلى السلة
    </Button>
  </div>
);

export const QuickBuyBarBlock: BlockComponent = () => (
  <div className="sticky bottom-16 mx-auto w-fit rounded-full bg-primary/90 px-4 py-2 text-xs text-primary-foreground shadow-lg">
    شراء سريع متاح
  </div>
);

export const SubscribeCtaBlock: BlockComponent = () => (
  <div className="sticky bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur">
    <Button className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground">
      اشترك للتوصيل المتكرر
    </Button>
  </div>
);
