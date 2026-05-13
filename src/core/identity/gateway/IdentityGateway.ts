/**
 * IdentityGateway — Sovereign Identity, Persona, KYC & Loyalty boundary.
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §2 + §3):
 *   • Only place permitted to read/write identity-shaped tables from UI paths.
 *   • UI / hooks / components MUST consume IdentityGateway only.
 *   • Returns typed VMs, never raw Supabase rows.
 */
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "staff"
  | "cashier"
  | "store_manager"
  | "collector"
  | "delivery"
  | "finance"
  | "vendor"
  | "branch_manager"
  | "inventory_clerk";

const ROLE_PRIORITY: Record<string, number> = {
  admin: 1,
  finance: 2,
  branch_manager: 3,
  store_manager: 4,
  inventory_clerk: 5,
  cashier: 6,
  delivery: 7,
  staff: 8,
  collector: 9,
  vendor: 10,
};

export type KycStatus = "pending" | "verified" | "rejected";

export interface KycRowVM {
  id: string;
  user_id: string;
  national_id: string | null;
  front_image_path: string | null;
  back_image_path: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface SubmitKycInput {
  userId: string;
  nationalId: string;
  frontImagePath: string | null;
  backImagePath: string | null;
}

export interface PersonaRowVM {
  persona_key: string;
  display_name: string;
  display_name_en: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  theme_overlay: Record<string, unknown> | null;
  role_predicates: Record<string, unknown> | null;
}

export interface LoyaltyProgressVM {
  current_level: "bronze" | "silver" | "gold" | "platinum";
  current_count: number;
  next_level: string | null;
  target: number;
  remaining: number;
}

export interface PaymentMethodVM {
  id: string;
  kind: "wallet" | "card";
  brand: string;
  last4: string | null;
  expires_label: string | null;
  is_default: boolean;
}

export const IdentityGateway = {
  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    } catch {
      return null;
    }
  },

  async getActiveRoles(userId: string): Promise<AppRole[]> {
    if (!userId) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);
      return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
    } catch {
      return [];
    }
  },

  async getPrimaryRole(userId: string): Promise<AppRole | null> {
    const roles = await IdentityGateway.getActiveRoles(userId);
    if (roles.length === 0) return null;
    const sorted = [...roles].sort(
      (a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99),
    );
    return sorted[0] ?? null;
  },

  // ─── KYC ────────────────────────────────────────────────────────────────
  async getKycVerification(userId: string): Promise<KycRowVM | null> {
    if (!userId) return null;
    const { data } = await supabase
      .from("kyc_verifications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle<KycRowVM>();
    return data ?? null;
  },

  async submitKycVerification(input: SubmitKycInput): Promise<KycRowVM> {
    const payload = {
      user_id: input.userId,
      national_id: input.nationalId,
      front_image_path: input.frontImagePath,
      back_image_path: input.backImagePath,
      status: "pending" as KycStatus,
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("kyc_verifications")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single<KycRowVM>();
    if (error) throw error;
    return data;
  },

  // ─── Personas ───────────────────────────────────────────────────────────
  async listActivePersonas(): Promise<PersonaRowVM[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("salsabil_persona_matrix")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PersonaRowVM[];
  },

  // ─── Loyalty ────────────────────────────────────────────────────────────
  async getLoyaltyProgress(userId: string): Promise<LoyaltyProgressVM | null> {
    if (!userId) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("progress_to_next_level", {
      _user_id: userId,
    });
    return (data as LoyaltyProgressVM) ?? null;
  },

  // ─── Payment methods ────────────────────────────────────────────────────
  async listPaymentMethods(userId: string): Promise<PaymentMethodVM[]> {
    if (!userId) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("id,kind,brand,last4,expires_label,is_default")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });
      if (error || !Array.isArray(data)) return [];
      return data as PaymentMethodVM[];
    } catch {
      return [];
    }
  },
};
