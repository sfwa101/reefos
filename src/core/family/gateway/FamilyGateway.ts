/**
 * FamilyGateway — Sovereign Family Hub boundary (Wave B-5).
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §3 + §10):
 *   • Only place permitted to read/write the `tayseer_family_*` graph and the
 *     `wallets` projection used by the Family Hub from UI-bound code.
 *   • UI consumes typed VMs only.
 */
import { supabase } from "@/integrations/supabase/client";

export type FamilyRole = "head" | "admin" | "spouse" | "child" | "dependent";

export interface FamilyGroupVM {
  id: string;
  name: string;
  created_by: string;
}

export interface FamilyMemberVM {
  group_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
  full_name: string | null;
  short_id: string | null;
  wallet_id: string | null;
}

export interface FamilyLimitVM {
  id: string;
  wallet_id: string;
  period: "daily" | "weekly" | "monthly";
  max_amount: number;
  active: boolean;
}

export interface FamilyVaultVM {
  id: string;
  name: string;
  current_balance: number;
  target_amount: number | null;
  status: string;
  group_id: string | null;
}

export interface FamilyContextVM {
  group: FamilyGroupVM | null;
  myRole: FamilyRole | null;
  members: FamilyMemberVM[];
  limits: FamilyLimitVM[];
  vaults: FamilyVaultVM[];
}

export interface UpsertFamilyLimitInput {
  walletId: string;
  setBy: string;
  period: "daily" | "weekly" | "monthly";
  maxAmount: number;
}

const NIL = "00000000-0000-0000-0000-000000000000";

export const FamilyGateway = {
  async getFamilyContext(userId: string): Promise<FamilyContextVM> {
    const empty: FamilyContextVM = {
      group: null,
      myRole: null,
      members: [],
      limits: [],
      vaults: [],
    };
    if (!userId) return empty;
    
    const sb = supabase;

    const { data: myMemb } = await sb
      .from("tayseer_family_members")
      .select("group_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!myMemb) return empty;

    const { data: g } = await sb
      .from("tayseer_family_groups")
      .select("id, name, created_by")
      .eq("id", myMemb.group_id)
      .maybeSingle();

    const { data: rawMembers } = await sb
      .from("tayseer_family_members")
      .select("group_id, user_id, role, joined_at")
      .eq("group_id", myMemb.group_id);

    type RawMember = { group_id: string; user_id: string; role: FamilyRole; joined_at: string };
    type ProfileRow = { user_id: string; full_name: string | null; short_id: string | null };
    type WalletLookupRow = { user_id: string; id: string };

    const rawMembersTyped = (rawMembers ?? []) as unknown as RawMember[];
    const userIds: string[] = rawMembersTyped.map((m) => m.user_id);
    const idsForLookup = userIds.length ? userIds : [NIL];

    const [{ data: profiles }, { data: walletsRows }] = await Promise.all([
      sb.from("profiles").select("user_id, full_name, short_id").in("user_id", idsForLookup),
      sb.from("wallets").select("id, user_id").eq("currency", "EGP").in("user_id", idsForLookup),
    ]);

    const profileMap = new Map(
      ((profiles ?? []) as unknown as ProfileRow[]).map((p) => [p.user_id, p] as const),
    );
    const walletMap = new Map(
      ((walletsRows ?? []) as unknown as WalletLookupRow[]).map((w) => [w.user_id, w.id] as const),
    );

    const members: FamilyMemberVM[] = rawMembersTyped.map((m) => {
      const p = profileMap.get(m.user_id);
      return {
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: p?.full_name ?? null,
        short_id: p?.short_id ?? null,
        wallet_id: walletMap.get(m.user_id) ?? null,
      };
    });

    const walletIds = members.map((m) => m.wallet_id).filter(Boolean) as string[];
    let limits: FamilyLimitVM[] = [];
    if (walletIds.length) {
      const { data: lim } = await sb
        .from("tayseer_wallet_limits")
        .select("id, wallet_id, period, max_amount, active")
        .in("wallet_id", walletIds);
      limits = (lim ?? []) as FamilyLimitVM[];
    }

    const { data: v } = await sb
      .from("tayseer_shared_vaults")
      .select("id, name, current_balance, target_amount, status, group_id")
      .eq("group_id", myMemb.group_id)
      .order("created_at", { ascending: false });

    return {
      group: (g ?? null) as FamilyGroupVM | null,
      myRole: myMemb.role as FamilyRole,
      members,
      limits,
      vaults: ((v ?? []) as FamilyVaultVM[]),
    };
  },

  async createFamilyGroup(name: string, createdBy: string): Promise<void> {
    
    const { error } = await supabase
      .from("tayseer_family_groups")
      .insert({ name: name.trim(), created_by: createdBy });
    if (error) throw error;
  },

  async upsertWalletLimit(input: UpsertFamilyLimitInput): Promise<void> {
    
    const { error } = await supabase
      .from("tayseer_wallet_limits")
      .upsert(
        {
          wallet_id: input.walletId,
          set_by: input.setBy,
          period: input.period,
          max_amount: input.maxAmount,
          active: true,
        },
        { onConflict: "wallet_id,period" },
      );
    if (error) throw error;
  },
};
