import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GameyaCircle = {
  id: string;
  name: string;
  cycle_amount: number;
  max_members: number;
  current_cycle_index: number;
  status: "pending" | "active" | "completed" | "cancelled";
  starts_at: string | null;
  my_turn: number;
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

/**
 * useGameyas — lists all circles the current user belongs to (creator
 * or member). Reads `gam_eya_members` first then enriches with `gam_eyas`.
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
    const { data: membership } = await supabase
      .from("gam_eya_members")
      .select(
        "turn_number, gam_eyas(id, name, cycle_amount, max_members, current_cycle_index, status, starts_at)",
      )
      .eq("user_id", userId);

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
          .select("id,user_id,turn_number,is_trusted,profiles(full_name)")
          .eq("gam_eya_id", circleId)
          .order("turn_number", { ascending: true }),
        supabase
          .from("gam_eya_installments")
          .select("id,cycle_index,due_date,amount_due,amount_paid,status,user_id")
          .eq("gam_eya_id", circleId)
          .order("cycle_index", { ascending: true }),
      ]);
      if (!mounted) return;
      setMembers(
        ((mem ?? []) as Array<{
          id: string;
          user_id: string;
          turn_number: number;
          is_trusted: boolean;
          profiles: { full_name: string | null } | null;
        }>).map((m) => ({
          id: m.id,
          user_id: m.user_id,
          turn_number: m.turn_number,
          is_trusted: m.is_trusted,
          full_name: m.profiles?.full_name ?? null,
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
