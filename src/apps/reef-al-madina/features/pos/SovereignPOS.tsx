/**
 * SovereignPOS — Wave 16 · The Sovereign Point of Sale.
 *
 * Touch-optimized Glass interface for cashier tablets. Pure presentation
 * layer: binds the Glass Arsenal to `usePosEngine` (which owns the
 * CartRuntime + CashierBrain + validatedSovereignCheckoutFn pipeline).
 *
 * Zero direct supabase calls. Zero money math (engine + brain own it).
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassDialog } from "@/components/admin/ui/GlassDialog";
import { GlassInput } from "@/components/admin/ui/GlassInput";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWalletSearch, type WalletSearchResult } from "@/hooks/useWalletSearch";

import { usePosEngine } from "./hooks/usePosEngine";
import type { PosProduct } from "./types/pos.types";

type Tender = "cash" | "card" | "wallet";

const TENDERS: Array<{ id: Tender; label: string; Icon: typeof Banknote }> = [
  { id: "cash", label: "نقدي", Icon: Banknote },
  { id: "card", label: "بطاقة", Icon: CreditCard },
  { id: "wallet", label: "تيسير", Icon: Wallet },
];

export default function SovereignPOS() {
  const e = usePosEngine();
  const [customer, setCustomer] = useState<WalletSearchResult | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [tender, setTender] = useState<Tender>("cash");
  const [submitting, setSubmitting] = useState(false);

  const total = e.displayTotal;
  const canPay = !submitting && e.cart.length > 0 && e.canSell && e.sovereignFresh;

  const handlePay = async () => {
    setSubmitting(true);
    try {
      // Engine treats `tendered` as cash given; for non-cash flows we pass
      // the exact total so settlement balances. Engine validates server-side.
      const res = await e.checkout(total);
      if (res) {
        setPayOpen(false);
        setCustomer(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الدفع");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-[calc(100vh-4rem)] bg-mesh p-3 md:p-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        {/* ───────────── PRODUCT GRID ───────────── */}
        <section className="glass-steel rounded-3xl border border-white/40 p-4 shadow-elevated">
          <header className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 rounded-t-3xl bg-white/50 px-4 py-3 backdrop-blur-xl border-b border-white/40">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-foreground/60" />
              <GlassInput
                value={e.query}
                onChange={(ev) => e.setQuery(ev.target.value)}
                placeholder="ابحث بالاسم أو الباركود…"
                className="flex-1"
              />
              <span className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold tabular-nums">
                {e.filtered.length} منتج
              </span>
            </div>
          </header>

          {e.productsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : e.filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-foreground/60">
              <ShoppingBasket className="h-8 w-8" />
              <p className="text-[13px]">لا توجد منتجات مطابقة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {e.filtered.map((p, i) => (
                <ProductTile key={p.id} product={p} index={i} onAdd={() => e.addProduct(p)} />
              ))}
            </div>
          )}
        </section>

        {/* ───────────── RECEIPT LEDGER ───────────── */}
        <aside className="glass-steel-strong rounded-3xl border border-white/40 p-4 shadow-elevated flex flex-col gap-3 lg:sticky lg:top-3 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          {/* Customer / Tayseer */}
          <button
            type="button"
            onClick={() => setWalletOpen(true)}
            className="w-full rounded-2xl border border-white/40 bg-white/40 p-3 text-right backdrop-blur-md transition hover:bg-white/60"
          >
            {customer ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {customer.profile?.full_name ?? "عميل تيسير"}
                  </p>
                  <p className="truncate text-[11px] text-foreground/60 tabular-nums">
                    {customer.profile?.phone ?? "—"}
                  </p>
                </div>
                <span className="rounded-xl bg-primary/10 px-2.5 py-1 text-[12px] font-bold text-primary tabular-nums">
                  {fmtMoney(customer.balance ?? 0)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-foreground/70">
                <UserPlus className="h-4 w-4" />
                <span className="text-[13px] font-medium">تعريف العميل / محفظة تيسير</span>
              </div>
            )}
          </button>

          {/* Lines */}
          <div className="flex-1 overflow-y-auto rounded-2xl bg-white/30 p-2 backdrop-blur-md min-h-[180px]">
            {e.cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-foreground/50">
                <ShoppingBasket className="h-6 w-6" />
                <p className="text-[12px]">السلة فارغة</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {e.cart.map((l) => (
                  <li
                    key={l.product_id}
                    className="flex items-center gap-2 rounded-xl bg-white/60 p-2 backdrop-blur-md"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{l.name}</p>
                      <p className="text-[11px] text-foreground/60 tabular-nums">
                        {fmtMoney(l.price)} × {l.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconBtn onClick={() => e.decLine(l.product_id)}>
                        <Minus className="h-3.5 w-3.5" />
                      </IconBtn>
                      <span className="w-6 text-center text-[12px] font-bold tabular-nums">{l.qty}</span>
                      <IconBtn onClick={() => e.incLine(l.product_id)}>
                        <Plus className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn onClick={() => e.removeLine(l.product_id)} destructive>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals + Pay */}
          <div className="space-y-2 rounded-2xl bg-white/50 p-3 backdrop-blur-md">
            <Row label="عدد الأصناف" value={String(e.itemCount)} />
            <Row label="المجموع الفرعي" value={`${fmtMoney(e.subtotal)}`} />
            <div className="my-1 h-px bg-white/60" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">الإجمالي</span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-primary">
                {fmtMoney(total)}
              </span>
            </div>
            {!e.sovereignFresh && e.cart.length > 0 ? (
              <p className="flex items-center gap-1.5 text-[11px] text-foreground/60">
                <Sparkles className="h-3 w-3 animate-pulse" />
                يتم احتساب السعر السيادي…
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            disabled={!canPay}
            onClick={() => setPayOpen(true)}
            className={cn(
              "h-14 w-full rounded-2xl text-[15px] font-bold text-white shadow-elevated",
              "bg-gradient-to-l from-primary via-primary to-primary/80",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {!e.canSell ? "افتح ورديّة أولاً" : e.cart.length === 0 ? "أضف منتجات" : `ادفع ${fmtMoney(total)}`}
          </Button>
        </aside>
      </div>

      {/* ───────────── Tayseer Wallet Dialog ───────────── */}
      <WalletLookupDialog
        open={walletOpen}
        onOpenChange={setWalletOpen}
        onPick={(w) => {
          setCustomer(w);
          setWalletOpen(false);
          toast.success(`تم تعريف ${w.profile?.full_name ?? "العميل"}`);
        }}
      />

      {/* ───────────── Payment Dialog ───────────── */}
      <GlassDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        eyebrow="إتمام الدفع"
        title={`${fmtMoney(total)} المستحق`}
        description="اختر وسيلة الدفع لإغلاق هذه العملية بسرعة."
        size="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button
              onClick={handlePay}
              disabled={submitting || !canPay}
              className="bg-gradient-to-l from-primary to-primary/80 text-white"
            >
              {submitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              تأكيد الدفع
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {TENDERS.map(({ id, label, Icon }) => {
            const active = tender === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTender(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition",
                  active
                    ? "border-primary bg-primary/10 text-primary shadow-elevated"
                    : "border-white/40 bg-white/40 text-foreground/70 hover:bg-white/60",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[12px] font-semibold">{label}</span>
              </button>
            );
          })}
        </div>

        {tender === "wallet" && !customer ? (
          <p className="mt-3 rounded-xl bg-amber-100/60 p-2 text-[12px] text-amber-900">
            عرّف العميل أولاً عبر زر «محفظة تيسير» في أعلى الفاتورة.
          </p>
        ) : null}
      </GlassDialog>
    </div>
  );
}

/* ───────────── helpers ───────────── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-foreground/60">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 backdrop-blur-md transition",
        destructive
          ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
          : "bg-white/50 text-foreground/70 hover:bg-white/80",
      )}
    >
      {children}
    </button>
  );
}

function ProductTile({
  product,
  onAdd,
  index,
}: {
  product: PosProduct;
  onAdd: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onAdd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.02, type: "spring", stiffness: 280, damping: 22 }}
      whileTap={{ scale: 0.96 }}
      className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/50 p-2 text-right backdrop-blur-md shadow-elevated transition hover:bg-white/70"
    >
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-white/60 to-white/20">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-foreground/40">
            <ShoppingBasket className="h-6 w-6" />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.4em] text-[12px] font-semibold leading-tight">
        {product.name}
      </p>
      <p className="mt-0.5 text-[12.5px] font-bold tabular-nums text-primary">
        {fmtMoney(product.price)}
      </p>
    </motion.button>
  );
}

/* ───────────── Tayseer Wallet Lookup ───────────── */

function WalletLookupDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (w: WalletSearchResult) => void;
}) {
  const [term, setTerm] = useState("");
  const { data, isLoading } = useWalletSearch(term);
  const results = useMemo(() => data ?? [], [data]);

  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="محفظة تيسير"
      title="تعريف العميل"
      description="ابحث بالاسم أو رقم الهاتف لربط المحفظة بالفاتورة."
      size="max-w-md"
    >
      <GlassInput
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="اسم العميل أو رقم الهاتف…"
        autoFocus
      />
      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl bg-white/30 p-1.5 backdrop-blur-md">
        {term.length < 2 ? (
          <p className="p-4 text-center text-[12px] text-foreground/60">
            اكتب حرفين أو أكثر للبحث.
          </p>
        ) : isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <p className="p-4 text-center text-[12px] text-foreground/60">لا توجد نتائج.</p>
        ) : (
          <ul className="space-y-1">
            {results.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => onPick(w)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/60 p-2.5 text-right backdrop-blur-md transition hover:bg-white/90"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {w.profile?.full_name ?? "عميل تيسير"}
                    </p>
                    <p className="truncate text-[11px] text-foreground/60 tabular-nums">
                      {w.profile?.phone ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-xl bg-primary/10 px-2.5 py-1 text-[12px] font-bold tabular-nums text-primary">
                    {fmtMoney(w.balance ?? 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassDialog>
  );
}
