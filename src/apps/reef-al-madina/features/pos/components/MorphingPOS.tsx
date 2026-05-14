/**
 * Salsabil OS — Phase 1 · Wave 3
 * Layer 6 (Runtime UI) · Morphing POS shell.
 *
 * Capability-driven shell + Product DNA grid. The grid is hydrated via
 * the {@link CatalogGateway} (CommerceEntity stream) and gated by the
 * {@link LivingInventoryRuntime}. The UI never performs inventory math
 * itself — it asks `canFulfill` before dispatching cart intents.
 */
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CAP } from "@/core/capabilities/CapabilityRegistry";
import { useCashierBrainRuntime } from "@/core/cashier/hooks/useCashierBrainRuntime";
import { useCartRuntime } from "@/core/orders/runtime/useCartRuntime";
import { useAuth } from "@/context/AuthContext";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import {
  ChefHat,
  ScanBarcode,
  Zap,
  Layers,
  Trash2,
  PackageX,
} from "lucide-react";
import type { POSMode } from "@/core/cashier/domain/POSMode";
import { CatalogGateway } from "@/core/commerce/gateway/CatalogGateway";
import type { CommerceEntity } from "@/core/commerce/entity/CommerceEntity";
import { useLivingInventory } from "@/core/inventory/runtime/useLivingInventory";

export interface MorphingPOSProps {
  /** Capability keys assigned to the active workspace section/terminal. */
  readonly sectionCapabilities: ReadonlyArray<string>;
  /** Render slots per mode. Any omitted slot falls back to a neutral panel. */
  readonly slots?: Partial<Record<POSMode, React.ReactNode>>;
  /** Catalog section to populate the product grid. */
  readonly catalogSectionSlug?: string;
  /** Cap on entities loaded into the grid. */
  readonly catalogLimit?: number;
}

const MODE_META: Record<POSMode, { label: string; Icon: typeof ChefHat }> = {
  kitchen: { label: "Kitchen routing", Icon: ChefHat },
  retail: { label: "Retail scanning", Icon: ScanBarcode },
  quick_buy: { label: "Quick buy", Icon: Zap },
  hybrid: { label: "Hybrid floor", Icon: Layers },
};

const localized = (t: { ar: string; en?: string } | undefined, locale: "ar" | "en"): string => {
  if (!t) return "";
  return locale === "en" ? (t.en ?? t.ar) : t.ar;
};

export function MorphingPOS(props: MorphingPOSProps) {
  const {
    sectionCapabilities,
    slots,
    catalogSectionSlug,
    catalogLimit = 24,
  } = props;
  const { user } = useAuth();
  const runtime = useCashierBrainRuntime({
    cashierId: user?.id ?? null,
    sectionCapabilities,
  });
  const { capabilities, mode, shift, shiftLoading, shiftError } = runtime;
  const cart = useCartRuntime();
  const totals = cart.state.snapshot.totals;
  const currency = cart.state.snapshot.currency;

  const meta = MODE_META[mode];

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

  const entities = catalogQuery.data ?? [];
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

  const body = useMemo(() => {
    const slot = slots?.[mode];
    if (slot) return slot;
    if (capabilities.has(CAP.SUPPORTS_KITCHEN_MODE)) {
      return (
        <IOSCard className="p-4 text-[13px] text-foreground-secondary">
          Kitchen-mode pipeline ready: tickets will route to the KDS station
          assigned to this workspace section.
        </IOSCard>
      );
    }
    if (capabilities.has(CAP.SUPPORTS_BARCODE_SCANNING)) {
      return (
        <IOSCard className="p-4 text-[13px] text-foreground-secondary">
          Retail-mode pipeline ready: barcode scanner is primary input,
          line-items resolve via the local product cache.
        </IOSCard>
      );
    }
    if (capabilities.has(CAP.SUPPORTS_QUICK_BUY) || capabilities.has(CAP.QUICK_BUY)) {
      return (
        <IOSCard className="p-4 text-[13px] text-foreground-secondary">
          Quick-buy tile board ready: high-frequency SKUs are pinned for
          one-tap entry.
        </IOSCard>
      );
    }
    return (
      <IOSCard className="p-4 text-[13px] text-foreground-tertiary">
        No POS capabilities granted to this section. Configure the workspace
        section in the admin to enable a checkout flow.
      </IOSCard>
    );
  }, [slots, mode, capabilities]);

  const grid = (
    <IOSCard className="p-3">
      <div className="text-[13px] font-medium mb-2">Catalog</div>
      {!catalogSectionSlug ? (
        <div className="text-[12px] text-foreground-tertiary">
          No section bound to this terminal.
        </div>
      ) : catalogQuery.isLoading ? (
        <div className="text-[12px] text-foreground-tertiary">Loading…</div>
      ) : catalogQuery.isError ? (
        <div className="text-[12px] text-destructive">
          Failed to load catalog.
        </div>
      ) : entities.length === 0 ? (
        <div className="text-[12px] text-foreground-tertiary">
          No products in this section.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                  className="w-full text-start rounded-2xl border border-border/40 bg-surface px-3 py-2 hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-[12px] font-medium truncate">
                    {localized(entity.context.identity.name, "ar")}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-foreground-secondary">
                    <span className="tabular-nums">
                      {fmtMoney(fin.base_price)} {fin.currency}
                    </span>
                    {out ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <PackageX className="h-3 w-3" /> Out
                      </span>
                    ) : (
                      <span
                        className={
                          status === "low_stock"
                            ? "text-amber-600"
                            : "text-foreground-tertiary"
                        }
                      >
                        {view?.available ?? 0} left
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </IOSCard>
  );

  return (
    <div className="space-y-3" data-pos-mode={mode}>
      <IOSCard className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <meta.Icon className="h-4 w-4 text-primary" />
          <div className="text-[13px] font-medium">{meta.label}</div>
        </div>
        <div className="text-[11px] text-foreground-tertiary">
          {shiftLoading
            ? "Loading shift…"
            : shiftError
              ? `Shift error: ${shiftError}`
              : shift
                ? `Shift open · ${shift.total_orders} orders`
                : "No open shift"}
        </div>
      </IOSCard>
      {body}
      {grid}
      <IOSCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-medium">Cart</div>
          <button
            type="button"
            onClick={cart.clear}
            disabled={cart.state.lines.length === 0}
            className="flex items-center gap-1 text-[11px] text-foreground-tertiary disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        </div>
        {cart.state.lines.length === 0 ? (
          <div className="text-[12px] text-foreground-tertiary">Empty cart.</div>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-auto">
            {cart.state.snapshot.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="truncate">{item.id}</span>
                <span className="tabular-nums text-foreground-secondary">
                  ×{item.qty} · {fmtMoney(item.line_total)} {currency}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[13px]">
          <span className="text-foreground-secondary">Total</span>
          <span className="font-semibold tabular-nums">
            {fmtMoney(totals.grand_total)} {currency}
          </span>
        </div>
      </IOSCard>
    </div>
  );
}
