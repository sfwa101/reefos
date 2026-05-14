/**
 * Salsabil OS — Phase 1 · Wave 7
 * Layer 6 (Runtime UI) · Morphing POS — unified launch surface.
 *
 * Capability-driven shell that composes:
 *   - Catalog grid (Wave 3) gated by Living Inventory.
 *   - Sovereign Cart sidebar (Wave 2) with line-level controls.
 *   - Checkout modal (Wave 4) wired to the Checkout Runtime.
 *   - Shift Settlement modal (Wave 6) wired to the Shift Runtime.
 *
 * UI-only orchestrator: zero data fetching outside the gateways/runtimes,
 * zero pricing math, zero ledger touches. Apple/MBP aesthetic: large hit
 * targets for touch, restrained chrome, premium typography.
 */
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CAP } from "@/core/capabilities/CapabilityRegistry";
import { useCashierBrainRuntime } from "@/core/cashier/hooks/useCashierBrainRuntime";
import { useCartRuntime } from "@/core/orders/runtime/useCartRuntime";
import { useShiftRuntime } from "@/core/cashier/runtime/useShiftRuntime";
import { useAuth } from "@/context/AuthContext";
import { fmtMoney } from "@/lib/format";
import {
  ChefHat,
  ScanBarcode,
  Zap,
  Layers,
  Trash2,
  PackageX,
  Minus,
  Plus,
  CreditCard,
  LockKeyhole,
  Receipt,
} from "lucide-react";
import type { POSMode } from "@/core/cashier/domain/POSMode";
import { CatalogGateway } from "@/core/commerce/gateway/CatalogGateway";
import type { CommerceEntity } from "@/core/commerce/entity/CommerceEntity";
import { useLivingInventory } from "@/core/inventory/runtime/useLivingInventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckoutPanel } from "./CheckoutPanel";
import { ShiftSettlementPanel } from "./ShiftSettlementPanel";
import { POSErrorBoundary } from "./POSErrorBoundary";
import { POSLayout } from "./POSLayout";

export interface MorphingPOSProps {
  readonly sectionCapabilities: ReadonlyArray<string>;
  readonly catalogSectionSlug?: string;
  readonly catalogLimit?: number;
}

const MODE_META: Record<POSMode, { label: string; Icon: typeof ChefHat }> = {
  kitchen: { label: "وضع المطبخ", Icon: ChefHat },
  retail: { label: "وضع التجزئة", Icon: ScanBarcode },
  quick_buy: { label: "بيع سريع", Icon: Zap },
  hybrid: { label: "وضع مختلط", Icon: Layers },
};

const localized = (
  t: Record<string, string> | undefined,
  locale: "ar" | "en",
): string => {
  if (!t) return "";
  if (locale === "en") return t.en ?? t.ar ?? "";
  return t.ar ?? t.en ?? "";
};

export function MorphingPOS(props: MorphingPOSProps) {
  return (
    <POSErrorBoundary>
      <MorphingPOSInner {...props} />
    </POSErrorBoundary>
  );
}

function MorphingPOSInner(props: MorphingPOSProps) {
  const { sectionCapabilities, catalogSectionSlug, catalogLimit = 24 } = props;
  const { user } = useAuth();
  const runtime = useCashierBrainRuntime({
    cashierId: user?.id ?? null,
    sectionCapabilities,
  });
  const { capabilities, mode } = runtime;
  const cart = useCartRuntime();
  const shift = useShiftRuntime();
  const totals = cart.state.snapshot.totals;
  const currency = cart.state.snapshot.currency;
  const items = cart.state.snapshot.items;
  const lines = cart.state.lines;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);

  const meta = MODE_META[mode];
  const showsKitchen = capabilities.has(CAP.SUPPORTS_KITCHEN_MODE);

  const catalogQuery = useQuery({
    queryKey: ["pos.morphing.catalog", catalogSectionSlug, catalogLimit],
    queryFn: () =>
      catalogSectionSlug
        ? CatalogGateway.listSectionEntities({
            sectionSlug: catalogSectionSlug,
            limit: catalogLimit,
          })
        : Promise.resolve<CommerceEntity[]>([]),
    enabled: Boolean(catalogSectionSlug),
    staleTime: 30_000,
  });

  const entities = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const inventory = useLivingInventory(entities);

  const handleAdd = useCallback(
    (entity: CommerceEntity) => {
      if (!inventory.canFulfill(entity.entity_id, 1)) return;
      cart.add({
        lineId: entity.entity_id,
        productId: entity.entity_id,
        dna: entity.context.financial,
        qty: 1,
      });
    },
    [cart, inventory],
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <meta.Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[15px] leading-tight truncate">
            نقطة البيع · {meta.label}
          </h1>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {shift.snapshot.status === "open"
              ? `ورديّة مفتوحة · ${currency}`
              : shift.snapshot.status === "closed"
                ? "الورديّة مغلقة"
                : "لا توجد ورديّة"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShiftOpen(true)}
          className="h-10 px-3 rounded-xl bg-surface border border-border/40 text-[12px] font-semibold press inline-flex items-center gap-1.5"
        >
          <LockKeyhole className="h-4 w-4 text-primary" />
          {shift.snapshot.status === "open" ? "إغلاق الورديّة" : "فتح ورديّة"}
        </button>
      </div>
    </div>
  );

  const modeBanner = (() => {
    if (capabilities.keys.length === 0) {
      return (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-700 dark:text-amber-400">
          لم يتم منح أي قدرات لنقطة البيع لهذه المحطة. اضبط القسم من الإدارة.
        </div>
      );
    }
    return null;
  })();

  const grid = (
    <section
      className="rounded-2xl bg-surface border border-border/40 p-4"
      aria-label="Catalog"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[16px]">المنتجات</h2>
        {showsKitchen && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <ChefHat className="h-3 w-3" /> توجيه للمطبخ
          </span>
        )}
      </div>
      {!catalogSectionSlug ? (
        <EmptyHint>لم يتم ربط قسم بهذه المحطة.</EmptyHint>
      ) : catalogQuery.isLoading ? (
        <SkeletonGrid />
      ) : catalogQuery.isError ? (
        <p className="text-[12px] text-destructive">تعذّر تحميل الكتالوج.</p>
      ) : entities.length === 0 ? (
        <EmptyHint>لا توجد منتجات في هذا القسم.</EmptyHint>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {entities.map((entity) => {
            const view = inventory.viewFor(entity.entity_id);
            const status = view?.status ?? "out_of_stock";
            const out = status === "out_of_stock";
            const fin = entity.context.financial;
            return (
              <li key={entity.entity_id}>
                <button
                  type="button"
                  disabled={out}
                  onClick={() => handleAdd(entity)}
                  data-stock-status={status}
                  className="group w-full text-start rounded-2xl border border-border/40 bg-background hover:bg-surface-secondary hover:border-primary/40 transition-all p-3 min-h-[88px] flex flex-col justify-between disabled:opacity-40 disabled:hover:border-border/40 disabled:cursor-not-allowed press"
                >
                  <div className="text-[13px] font-medium leading-tight line-clamp-2">
                    {localized(entity.context.identity.name, "ar") ||
                      entity.entity_id}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-mono tabular-nums font-semibold text-foreground">
                      {fmtMoney(fin.base_price)}
                    </span>
                    {out ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <PackageX className="h-3 w-3" /> نفد
                      </span>
                    ) : (
                      <span
                        className={
                          status === "low_stock"
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }
                      >
                        {view?.available ?? 0} متاح
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const cartSidebar = (
    <section
      className="rounded-2xl bg-surface border border-border/40 p-4 flex flex-col gap-3"
      aria-label="Cart"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px]">السلة</h2>
        <button
          type="button"
          onClick={cart.clear}
          disabled={lines.length === 0}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> تفريغ
        </button>
      </div>

      {lines.length === 0 ? (
        <EmptyHint>السلة فارغة. اختر منتجاً للبدء.</EmptyHint>
      ) : (
        <ul className="space-y-1.5 max-h-[40vh] lg:max-h-[55vh] overflow-auto -mx-1 px-1">
          {items.map((item, idx) => {
            const line = lines[idx];
            return (
              <li
                key={item.id}
                className="rounded-xl bg-background border border-border/30 p-2.5 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{item.id}</p>
                  <p className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {fmtMoney(item.line_total)} {currency}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <IconBtn
                    onClick={() =>
                      line && cart.setQty(line.lineId, item.qty - 1)
                    }
                    aria-label="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </IconBtn>
                  <span className="w-6 text-center font-mono text-[12px] tabular-nums">
                    {item.qty}
                  </span>
                  <IconBtn
                    onClick={() =>
                      line && cart.setQty(line.lineId, item.qty + 1)
                    }
                    aria-label="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn
                    onClick={() => line && cart.remove(line.lineId)}
                    aria-label="Remove"
                    tone="destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl bg-muted p-3 space-y-1.5">
        <Row label="عدد الأصناف" value={String(lines.length)} />
        <Row
          label="الإجمالي قبل الضريبة"
          value={`${fmtMoney(totals.subtotal)} ${currency}`}
        />
        <div className="h-px bg-border/40" />
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">المجموع</span>
          <span className="font-display text-[20px] font-semibold tabular-nums">
            {fmtMoney(totals.grand_total)}{" "}
            <span className="text-[12px] font-normal text-muted-foreground">
              {currency}
            </span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCheckoutOpen(true)}
        disabled={lines.length === 0 || shift.snapshot.status !== "open"}
        className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed press"
      >
        <CreditCard className="h-4.5 w-4.5" />
        {shift.snapshot.status !== "open"
          ? "افتح ورديّة للبدء"
          : `إتمام الدفع · ${fmtMoney(totals.grand_total)}`}
      </button>
    </section>
  );

  return (
    <>
      <POSLayout
        header={header}
        main={
          <>
            {modeBanner}
            {grid}
          </>
        }
        sidebar={cartSidebar}
        footer={
          <p className="text-[10px] text-center text-muted-foreground">
            <Receipt className="inline h-3 w-3 ml-1" />
            جميع الحركات مسجَّلة في الدفتر السيادي بشكل غير قابل للتعديل.
          </p>
        }
      />

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-[20px]">
              إتمام الدفع
            </DialogTitle>
            <DialogDescription>
              اختر طريقة الدفع وأكِّد المبلغ المستحق.
            </DialogDescription>
          </DialogHeader>
          <POSErrorBoundary fallbackTitle="خطأ في لوحة الدفع">
            <CheckoutPanel
              onCheckoutComplete={() => {
                setCheckoutOpen(false);
              }}
            />
          </POSErrorBoundary>
        </DialogContent>
      </Dialog>

      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-[20px]">
              تسوية الورديّة
            </DialogTitle>
            <DialogDescription>
              النظام يحسب المتوقَّع تلقائياً من الدفتر السيادي.
            </DialogDescription>
          </DialogHeader>
          <POSErrorBoundary fallbackTitle="خطأ في لوحة التسوية">
            <ShiftSettlementPanel />
          </POSErrorBoundary>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-muted-foreground text-center py-6">
      {children}
    </p>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="h-[88px] rounded-2xl bg-muted/60 animate-pulse"
        />
      ))}
    </ul>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  tone,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "destructive";
}) {
  const cls =
    tone === "destructive"
      ? "text-destructive hover:bg-destructive/10"
      : "text-foreground hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors ${cls}`}
      {...rest}
    >
      {children}
    </button>
  );
}
