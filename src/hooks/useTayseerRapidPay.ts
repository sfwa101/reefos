/**
 * Phase 51 — Tayseer Rapid Pay Kernel.
 *
 * Wraps the `process_tayseer_payment(p_order_id, p_amount)` RPC. Atomic
 * on the server: validates ownership, locks the user wallet, debits it,
 * credits the Tayseer treasury via a balanced double-entry ledger group,
 * and marks the master order as paid — all in one transaction.
 *
 * On insufficient balance the RPC raises `insufficient_funds:` and the
 * mutation surfaces a friendly Arabic error.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import { tayseerKeys } from "@/hooks/useTayseer";

export type TayseerPayInput = { order_id: string; amount: number };

export type TayseerPayResult = {
  ok: true;
  order_id: string;
  amount: number;
  transaction_group_id: string;
  new_balance: number;
  already_paid?: boolean;
};

const friendly = (raw: string): string => {
  const m = raw.toLowerCase();
  if (m.includes("limit_exceeded") || m.includes("wallet_limit"))
    return "عذراً، لقد تجاوزت حد الإنفاق المسموح به.";
  if (m.includes("insufficient_funds")) return "رصيد محفظة تيسير غير كافٍ لإتمام الدفع";
  if (m.includes("wallet_missing")) return "لا توجد محفظة تيسير لهذا الحساب";
  if (m.includes("wallet_inactive")) return "محفظة تيسير غير مفعّلة حالياً";
  if (m.includes("forbidden")) return "هذا الطلب لا يخصّك";
  if (m.includes("order_not_found")) return "الطلب غير موجود";
  if (m.includes("unauthenticated")) return "يجب تسجيل الدخول";
  return raw;
};

export const callTayseerPayment = async (
  input: TayseerPayInput,
): Promise<TayseerPayResult> => {
  const { data, error } = await FinanceGateway.processTayseerPayment(input);
  if (error) throw new Error(friendly(error.message ?? "payment_failed"));
  return data as TayseerPayResult;
};

export function useTayseerRapidPay() {
  const qc = useQueryClient();
  return useMutation<TayseerPayResult, Error, TayseerPayInput>({
    mutationFn: callTayseerPayment,
    onSuccess: (res) => {
      if (!res.already_paid) {
        toast.success("تم الدفع بنجاح من محفظة تيسير");
      }
      // Invalidate wallet + ledger reads so balances refresh.
      qc.invalidateQueries({ queryKey: tayseerKeys.all });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["master_orders"] });
    },
    onError: (err) => toast.error(err.message),
  });
}
