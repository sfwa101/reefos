/**
 * Salsabil OS — Phase 1 · Wave 4
 * Layer 6 (Runtime UI) · CheckoutPanel for Morphing POS.
 *
 * Pure intent surface. Reads totals from `useCartRuntime()` and dispatches
 * a checkout intent to the sovereign {@link CheckoutRuntime}. NEVER computes
 * grand totals, NEVER constructs database payloads, NEVER touches the
 * ledger directly.
 */
import { useCallback, useMemo, useState } from "react";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import {
  useCartRuntime,
  CheckoutRuntime,
  checkoutRuntime as defaultCheckoutRuntime,
  type CheckoutResult,
  type PaymentMethod,
} from "@/core/orders/runtime";
import { Banknote, CreditCard, Wallet, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYMENT_METHODS: ReadonlyArray<{
  readonly id: PaymentMethod;
  readonly label: string;
  readonly Icon: typeof Banknote;
}> = [
  { id: "cash", label: "Cash", Icon: Banknote },
  { id: "card", label: "Card", Icon: CreditCard },
  { id: "wallet", label: "Wallet", Icon: Wallet },
  { id: "tayseer", label: "Tayseer", Icon: CircleDollarSign },
];

export interface CheckoutPanelProps {
  /** Optional override — useful in tests or alternate workspaces. */
  readonly runtime?: CheckoutRuntime;
  /** Notified after a successful checkout (for receipts, KDS routing, etc.). */
  readonly onCheckoutComplete?: (result: CheckoutResult) => void;
}

export function CheckoutPanel(props: CheckoutPanelProps) {
  const { runtime = defaultCheckoutRuntime, onCheckoutComplete } = props;
  const cart = useCartRuntime();
  const totals = cart.state.snapshot.totals;
  const currency = cart.state.snapshot.currency;
  const itemCount = cart.state.lines.length;

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<CheckoutResult | null>(null);

  // Idempotency key bound to the current cart snapshot — refreshes whenever
  // the cart changes so each finalized intent gets a unique key.
  const idempotencyKey = useMemo(
    () => CheckoutRuntime.newIdempotencyKey(),
    [cart.state.snapshot.snapshot_hash, itemCount],
  );

  const disabled = pending || itemCount === 0;

  const handleCheckout = useCallback(() => {
    if (disabled) return;
    setPending(true);
    setError(null);
    try {
      const result = runtime.checkout({
        idempotencyKey,
        paymentMethod: method,
      });
      setLast(result);
      onCheckoutComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPending(false);
    }
  }, [disabled, runtime, idempotencyKey, method, onCheckoutComplete]);

  return (
    <IOSCard className="p-3 space-y-3" data-pos-checkout-panel>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium">Checkout</div>
        <div className="text-[11px] text-foreground-tertiary tabular-nums">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {PAYMENT_METHODS.map(({ id, label, Icon }) => {
          const active = method === id;
          return (
            <Button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              disabled={pending}
              data-active={active}
              className={
                "rounded-2xl border px-2 py-2 text-[11px] flex flex-col items-center gap-1 transition-colors " +
                (active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/40 bg-surface text-foreground-secondary hover:bg-surface-secondary")
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[13px]">
        <span className="text-foreground-secondary">Amount due</span>
        <span className="font-semibold tabular-nums">
          {fmtMoney(totals.grand_total)} {currency}
        </span>
      </div>

      <Button
        type="button"
        onClick={handleCheckout}
        disabled={disabled}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-2.5 text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending
          ? "Processing…"
          : itemCount === 0
            ? "Add items to charge"
            : `Charge ${fmtMoney(totals.grand_total)} ${currency}`}
      </Button>

      {error ? (
        <div className="text-[12px] text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      {last ? (
        <div className="text-[11px] text-foreground-tertiary">
          Last order <span className="font-mono">{last.orderId}</span> · ledger
          tx <span className="font-mono">{last.transaction.transaction_id}</span>
        </div>
      ) : null}
    </IOSCard>
  );
}
