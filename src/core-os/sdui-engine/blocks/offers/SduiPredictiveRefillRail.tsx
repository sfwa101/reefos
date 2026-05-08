/**
 * SduiPredictiveRefillRail — دورة الحياة (Predictive Refills).
 *
 * Looks at the user's order history (last 30d), surfaces consumables
 * (milk, bread, oil, eggs, etc.) that are likely depleting, and offers
 * a one-tap reorder. Pure read-side; reordering is delegated to the
 * existing cart hook so business logic stays single-sourced.
 */
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { products } from "@/lib/products";
import type { SduiPredictiveRefillRailBlock } from "./schemas";

const CONSUMABLE_KEYWORDS = [
  "حليب",
  "خبز",
  "زيت",
  "بيض",
  "أرز",
  "سكر",
  "ماء",
  "شاي",
  "قهوة",
  "زبادي",
  "جبن",
  "milk",
  "bread",
  "oil",
  "egg",
  "rice",
  "sugar",
  "water",
  "tea",
  "coffee",
  "yogurt",
  "cheese",
];

const isConsumable = (name: string) => {
  const n = name.toLowerCase();
  return CONSUMABLE_KEYWORDS.some((k) => n.includes(k.toLowerCase()));
};

type RefillCandidate = {
  productId: string;
  name: string;
  image?: string;
  price: number;
  daysAgo: number;
};

async function fetchRefillCandidates(userId: string | null): Promise<RefillCandidate[]> {
  if (!userId) return [];
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data } = await supabase
    .from("order_items")
    .select("product_id, product_name, unit_price, created_at, orders!inner(user_id)")
    .gte("created_at", since)
    .eq("orders.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (!data) return [];

  const seen = new Map<string, RefillCandidate>();
  for (const row of data as Array<Record<string, unknown>>) {
    const pid = String(row.product_id ?? "");
    const name = String(row.product_name ?? "");
    if (!pid || !name) continue;
    if (!isConsumable(name)) continue;
    if (seen.has(pid)) continue;
    const created = new Date(String(row.created_at));
    const daysAgo = Math.floor((Date.now() - created.getTime()) / 86400_000);
    if (daysAgo < 3) continue; // too recent — no refill nudge
    const enriched = products.find((p) => p.id === pid);
    seen.set(pid, {
      productId: pid,
      name,
      image: enriched?.image,
      price: Number(row.unit_price ?? enriched?.price ?? 0),
      daysAgo,
    });
    if (seen.size >= 8) break;
  }
  return Array.from(seen.values());
}

export const SduiPredictiveRefillRail = ({
  block,
}: {
  block: SduiPredictiveRefillRailBlock;
}) => {
  const { title, subtitle } = block.props;
  const { user } = useAuth();
  const { add } = useCart();
  const [items, setItems] = useState<RefillCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRefillCandidates(user?.id ?? null)
      .then((r) => !cancelled && setItems(r))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const visible = useMemo(() => items.slice(0, 8), [items]);

  if (!user) return null;
  if (loading) return null;
  if (visible.length === 0) return null;

  return (
    <section dir="rtl">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-extrabold">
            {title ?? "حان وقت إعادة الطلب؟"}
          </h3>
        </div>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
        {visible.map((it) => {
          const enriched = products.find((p) => p.id === it.productId);
          return (
            <div
              key={it.productId}
              className="snap-start shrink-0 w-[150px] rounded-2xl border border-border/60 bg-card p-2.5 shadow-soft"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                {it.image && (
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold text-foreground">{it.name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                آخر طلب قبل {it.daysAgo} يوم
              </p>
              <button
                type="button"
                onClick={() => enriched && add(enriched, 1)}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground transition active:scale-95"
              >
                <Plus className="h-3 w-3" /> إعادة الطلب
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SduiPredictiveRefillRail;
