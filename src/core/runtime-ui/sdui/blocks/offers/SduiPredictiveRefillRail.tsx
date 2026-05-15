/**
 * SduiPredictiveRefillRail — دورة الحياة (Predictive Refills).
 *
 * Surfaces consumables (milk, bread, oil, eggs…) the user has bought
 * before and is statistically due to restock. To avoid heavy joins on
 * the live order graph (and stay resilient to RLS), we read recent
 * purchases from a lightweight client-side ledger written by the cart
 * on order success: `salsabil.recent_purchases` in localStorage.
 * Falls back to an empty render when the ledger is empty.
 */
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { products } from "@/core/catalog/runtime/legacyRuntime";
import type { SduiPredictiveRefillRailBlock } from "./schemas";

const LEDGER_KEY = "salsabil.recent_purchases";

type LedgerEntry = { productId: string; ts: number };

const CONSUMABLE_KEYWORDS = [
  "حليب", "خبز", "زيت", "بيض", "أرز", "سكر", "ماء", "شاي", "قهوة", "زبادي", "جبن",
  "milk", "bread", "oil", "egg", "rice", "sugar", "water", "tea", "coffee", "yogurt", "cheese",
];

const isConsumable = (name: string) => {
  const n = name.toLowerCase();
  return CONSUMABLE_KEYWORDS.some((k) => n.includes(k.toLowerCase()));
};

function readLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is LedgerEntry =>
        r && typeof r.productId === "string" && typeof r.ts === "number",
    );
  } catch {
    return [];
  }
}

type RefillCandidate = {
  product: (typeof products)[number];
  daysAgo: number;
};

function buildCandidates(): RefillCandidate[] {
  const ledger = readLedger();
  if (ledger.length === 0) return [];
  const now = Date.now();
  const seen = new Map<string, RefillCandidate>();
  for (const entry of ledger) {
    if (seen.has(entry.productId)) continue;
    const daysAgo = Math.floor((now - entry.ts) / 86400_000);
    if (daysAgo < 3 || daysAgo > 30) continue;
    const product = products.find((p) => p.id === entry.productId);
    if (!product) continue;
    if (!isConsumable(product.name)) continue;
    seen.set(entry.productId, { product, daysAgo });
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

  useEffect(() => {
    setItems(buildCandidates());
  }, [user?.id]);

  const visible = useMemo(() => items.slice(0, 8), [items]);
  if (!user || visible.length === 0) return null;

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
        {visible.map(({ product, daysAgo }) => (
          <div
            key={product.id}
            className="snap-start shrink-0 w-[150px] rounded-2xl border border-border/60 bg-card p-2.5 shadow-soft"
          >
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold text-foreground">{product.name}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              آخر طلب قبل {daysAgo} يوم
            </p>
            <button
              type="button"
              onClick={() => add(product, 1)}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground transition active:scale-95"
            >
              <Plus className="h-3 w-3" /> إعادة الطلب
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SduiPredictiveRefillRail;
