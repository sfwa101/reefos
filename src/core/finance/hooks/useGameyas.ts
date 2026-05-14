import { useCallback, useEffect, useState } from "react";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";

export type GameyaCircle = {
  id: string;
  name: string;
  cycle_amount: number;
  max_members: number;
  current_cycle_index: number;
  status: "pending" | "active" | "completed" | "cancelled";
  starts_at: string | null;
  my_turn: number;
  cycle_duration_months: number | null;
  reward_pool: number;
  min_kyc_tier: number | null;
};

export type OpenCircle = {
  id: string;
  name: string;
  cycle_amount: number;
  max_members: number;
  cycle_duration_months: number | null;
  min_kyc_tier: number | null;
  reward_pool: number;
  status: string;
  starts_at: string | null;
  members_count: number;
  is_member: boolean;
};

export type GameyaInstallment = {
  id: string;
  cycle_index: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: "pending" | "paid" | "late" | "waived";
  user_id: string;
};

export type GameyaMember = {
  id: string;
  user_id: string;
  turn_number: number;
  is_trusted: boolean;
  full_name: string | null;
};

export type TrustScore = {
  score: number;
  tier: number;
  is_trusted: boolean;
};

/**
 * useGameyas — lists all circles the current user belongs to.
 */
export const useGameyas = (userId: string | null) => {
  const [circles, setCircles] = useState<GameyaCircle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCircles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const membership = await FinanceGateway.listGameyaMemberships(userId);

    const rows: GameyaCircle[] = ((membership ?? []) as Array<{
      turn_number: number;
      gam_eyas: Omit<GameyaCircle, "my_turn"> | null;
    }>)
      .filter((m) => m.gam_eyas)
      .map((m) => ({ ...(m.gam_eyas as Omit<GameyaCircle, "my_turn">), my_turn: m.turn_number }));
    setCircles(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { circles, loading, refresh };
};

/** Public list of open circles to discover & join. */
export const useOpenCircles = () => {
  const [circles, setCircles] = useState<OpenCircle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("list_open_gam_eyas");
    setCircles((data ?? []) as OpenCircle[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { circles, loading, refresh };
};

/** Read current user's trust score (defaults to tier=0 if missing). */
export const useTrustScore = (userId: string | null) => {
  const [trust, setTrust] = useState<TrustScore>({ score: 0, tier: 0, is_trusted: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("user_trust_score")
        .select("score, tier, is_trusted")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mounted) return;
      if (data) setTrust(data as TrustScore);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { trust, loading };
};

/** Loads ordered members + next pending installment for a circle. */
export const useGameyaDetails = (circleId: string | null) => {
  const [members, setMembers] = useState<GameyaMember[]>([]);
  const [installments, setInstallments] = useState<GameyaInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: mem }, { data: inst }] = await Promise.all([
        supabase
          .from("gam_eya_members")
          .select("id,user_id,turn_number,is_trusted")
          .eq("gam_eya_id", circleId)
          .order("turn_number", { ascending: true }),
        supabase
          .from("gam_eya_installments")
          .select("id,cycle_index,due_date,amount_due,amount_paid,status,user_id")
          .eq("gam_eya_id", circleId)
          .order("cycle_index", { ascending: true }),
      ]);
      if (!mounted) return;
      const memRows = (mem ?? []) as Array<{
        id: string;
        user_id: string;
        turn_number: number;
        is_trusted: boolean;
      }>;
      const userIds = Array.from(new Set(memRows.map((m) => m.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as Array<{ id: string; full_name: string | null }> };
      const nameMap = new Map(
        ((profs ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [
          p.id,
          p.full_name,
        ]),
      );
      setMembers(
        memRows.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          turn_number: m.turn_number,
          is_trusted: m.is_trusted,
          full_name: nameMap.get(m.user_id) ?? null,
        })),
      );
      setInstallments((inst ?? []) as GameyaInstallment[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [circleId]);

  return { members, installments, loading };
};
