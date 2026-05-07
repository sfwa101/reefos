/**
 * Payment Methods catalog.
 * TODO: Migrate to DB table `payment_methods` (id, label, sub, icon_key,
 * is_active, sort_order, requires_online, allowed_zone_kinds...).
 * For now this is a static fallback so the orchestrator stays agnostic and
 * components do not import hardcoded arrays inline.
 */
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet as WalletIcon,
} from "lucide-react";
import type { PaymentId } from "../types/cart.types";

export type PaymentMethod = {
  id: PaymentId;
  label: string;
  sub: string;
  icon: LucideIcon;
  /** When true, COD-style. The orchestrator/logistics engine may disable it. */
  isCash: boolean;
};

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "wallet", label: "المحفظة الذكية", sub: "خصم فوري من رصيدك", icon: WalletIcon, isCash: false },
  { id: "cash", label: "كاش عند الاستلام", sub: "ادفع للمندوب", icon: Banknote, isCash: true },
  { id: "vodafone-cash", label: "فودافون كاش", sub: "تحويل فوري", icon: Smartphone, isCash: false },
  { id: "instapay", label: "إنستا باي", sub: "تحويل بنكي", icon: CreditCard, isCash: false },
] as const;

export const findPaymentMethod = (id: string): PaymentMethod | undefined =>
  PAYMENT_METHODS.find((m) => m.id === id);
