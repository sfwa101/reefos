/**
 * Salsabil OS — Phase 1 · Wave 5
 * Layer 1 (Events) · KDS Order-Placed Reactor.
 *
 * Bridges the sovereign `order.placed` event into the KDS state machine.
 * Routing is strictly capability-driven: only lines carrying the
 * `SUPPORTS_KITCHEN_MODE` capability are forwarded to the kitchen.
 * Retail lines (canned drinks, packaged goods) are intentionally ignored.
 */
import { eventBus, type SalsabilEvents } from "@/core/events";
import { CAP } from "@/core/capabilities/CapabilityRegistry";
import { kdsRuntime, type KDSRuntime, type KDSTicketLine } from "@/core/kds/runtime/KDSRuntime";

export interface KDSOrderPlacedReactorOptions {
  readonly runtime?: KDSRuntime;
}

const KITCHEN_CAP: string = CAP.SUPPORTS_KITCHEN_MODE;

const filterKitchenLines = (
  lines: SalsabilEvents["order.placed"]["lines"],
): KDSTicketLine[] =>
  lines
    .filter((l) => l.capabilities.includes(KITCHEN_CAP))
    .map((l) => ({
      lineId: l.lineId,
      productId: l.productId,
      name: l.name ?? l.productId,
      qty: l.qty,
      capabilities: l.capabilities,
    }));

export class KDSOrderPlacedReactor {
  private readonly runtime: KDSRuntime;
  private attached = false;
  private readonly handler = (payload: SalsabilEvents["order.placed"]): void => {
    const kitchenLines = filterKitchenLines(payload.lines);
    if (kitchenLines.length === 0) return;
    this.runtime.createTicket({
      orderId: payload.orderId,
      lines: kitchenLines,
    });
  };

  constructor(opts?: KDSOrderPlacedReactorOptions) {
    this.runtime = opts?.runtime ?? kdsRuntime;
  }

  /** Subscribe to the bus. Idempotent — repeat calls are no-ops. */
  attach(): () => void {
    if (this.attached) return () => this.detach();
    eventBus.on("order.placed", this.handler);
    this.attached = true;
    return () => this.detach();
  }

  detach(): void {
    if (!this.attached) return;
    eventBus.off("order.placed", this.handler);
    this.attached = false;
  }
}

export const kdsOrderPlacedReactor = new KDSOrderPlacedReactor();
