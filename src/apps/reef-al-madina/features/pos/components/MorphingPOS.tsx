/**
 * Salsabil OS — Phase 1 · Wave 1
 * Layer 6 (Runtime UI) · Morphing POS shell.
 *
 * Pure capability-driven renderer. Vertical-name-free: branches strictly on
 * CAP keys exposed via the {@link CashierBrain} runtime hook.
 */
import { useMemo } from "react";
import { CAP } from "@/core/capabilities/CapabilityRegistry";
import { useCashierBrainRuntime } from "@/core/cashier/hooks/useCashierBrainRuntime";
import { useCartRuntime } from "@/core/orders/runtime/useCartRuntime";
import { useAuth } from "@/context/AuthContext";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import { ChefHat, ScanBarcode, Zap, Layers, Trash2 } from "lucide-react";
import type { POSMode } from "@/core/cashier/domain/POSMode";

export interface MorphingPOSProps {
  /** Capability keys assigned to the active workspace section/terminal. */
  readonly sectionCapabilities: ReadonlyArray<string>;
  /** Render slots per mode. Any omitted slot falls back to a neutral panel. */
  readonly slots?: Partial<Record<POSMode, React.ReactNode>>;
}

const MODE_META: Record<POSMode, { label: string; Icon: typeof ChefHat }> = {
  kitchen: { label: "Kitchen routing", Icon: ChefHat },
  retail: { label: "Retail scanning", Icon: ScanBarcode },
  quick_buy: { label: "Quick buy", Icon: Zap },
  hybrid: { label: "Hybrid floor", Icon: Layers },
};

export function MorphingPOS(props: MorphingPOSProps) {
  const { sectionCapabilities, slots } = props;
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
    </div>
  );
}
