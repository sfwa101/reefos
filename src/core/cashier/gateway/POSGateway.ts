/**
 * POSGateway — Sovereign boundary for Point-of-Sale shift & payment ops.
 * Wave P-3 Sub-Wave 11.
 *
 * Constitutional contract:
 *   • Only place permitted to read/write `pos_shifts` and to invoke
 *     `process_pos_cash_payment` from UI-bound POS code paths.
 *   • Returns typed DTOs / status objects; callers never touch the
 *     Supabase client directly.
 *
 * Anomaly flag: The DB tables are accessed via `as any` casts to bypass
 * the generated Supabase typings (which omit several POS columns).
 * Tracked for hardening in Wave P-7.
 */
import { supabase } from "@/integrations/supabase/client";
import { dynamicSb } from "@/integrations/supabase/dynamic";

export type PosShiftRow = {
  id: string;
  cashier_id: string;
  branch_id: string | null;
  status: string;
  opening_balance: number;
  total_sales: number;
  total_orders: number;
  opened_at: string;
};

const fetchOpenShiftForCashier = async (
  cashierId: string,
): Promise<{ shift: PosShiftRow | null; error: string | null }> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await dynamicSb
    .from("pos_shifts")
    .select("*")
    .eq("cashier_id", cashierId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    shift: (data ?? null) as PosShiftRow | null,
    error: error?.message ?? null,
  };
};

const openShift = async (
  cashierId: string,
  branchId: string | null,
  openingBalance: number,
): Promise<{ shift: PosShiftRow | null; error: string | null }> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await dynamicSb
    .from("pos_shifts")
    .insert({ cashier_id: cashierId, branch_id: branchId, opening_balance: openingBalance })
    .select("*")
    .single();
  return {
    shift: (data ?? null) as PosShiftRow | null,
    error: error?.message ?? null,
  };
};

const closeShift = async (
  shiftId: string,
  actualBalance: number,
): Promise<{ shift: PosShiftRow | null; error: string | null }> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await dynamicSb.rpc("close_pos_shift", {
    _shift_id: shiftId,
    _actual_balance: actualBalance,
  });
  return {
    shift: (data ?? null) as PosShiftRow | null,
    error: error?.message ?? null,
  };
};

const processCashPayment = async (
  orderId: string,
  amount: number,
): Promise<{ error: string | null }> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await dynamicSb.rpc("process_pos_cash_payment", {
    p_order_id: orderId,
    p_amount: amount,
  });
  return { error: error?.message ?? null };
};

const incrementShiftCounters = async (
  shiftId: string,
  totalSales: number,
  totalOrders: number,
): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await dynamicSb
    .from("pos_shifts")
    .update({ total_sales: totalSales, total_orders: totalOrders })
    .eq("id", shiftId);
};

export const POSGateway = {
  fetchOpenShiftForCashier,
  openShift,
  closeShift,
  processCashPayment,
  incrementShiftCounters,
};
