/**
 * IdentityGateway — Sovereign Identity, Persona, KYC & Loyalty boundary.
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §2 + §3):
 *   • Only place permitted to read/write identity-shaped tables from UI paths.
 *   • UI / hooks / components MUST consume IdentityGateway only.
 *   • Returns typed VMs, never raw Supabase rows.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

export type AuthSession = Session;
export type AuthUser = User;
export type AuthEvent = AuthChangeEvent;
export type AuthSubscription = { unsubscribe: () => void };

export type SignUpOptions = {
  emailRedirectTo?: string;
  data?: Record<string, unknown>;
};

export type AuthResult = {
  data: { user: User | null; session: Session | null };
  error: { message: string } | null;
};

export type RoleWithBranch = { role: AppRole; branch_id: string | null };

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
      
      const { data } = await supabase
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
    
    const { data, error } = await supabase
      .from("salsabil_persona_matrix")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as PersonaRowVM[];
  },

  // ─── Loyalty ────────────────────────────────────────────────────────────
  async getLoyaltyProgress(userId: string): Promise<LoyaltyProgressVM | null> {
    if (!userId) return null;
    
    const rpc = supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data } = await rpc("progress_to_next_level", { _user_id: userId });
    return (data as unknown as LoyaltyProgressVM) ?? null;
  },

  // ─── Payment methods ────────────────────────────────────────────────────
  async listPaymentMethods(userId: string): Promise<PaymentMethodVM[]> {
    if (!userId) return [];
    try {
      
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id,kind,brand,last4,expires_label,is_default")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });
      if (error || !Array.isArray(data)) return [];
      return data as unknown as PaymentMethodVM[];
    } catch {
      return [];
    }
  },

  // ─── Auth session ───────────────────────────────────────────────────────
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  onAuthStateChange(
    cb: (event: AuthEvent, session: Session | null) => void,
  ): AuthSubscription {
    const { data } = supabase.auth.onAuthStateChange(cb);
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },

  async signUpWithEmailPassword(
    email: string,
    password: string,
    options?: SignUpOptions,
  ): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    return { data, error: error ? { message: error.message } : null };
  },

  async signInWithEmailPassword(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: error ? { message: error.message } : null };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // ─── Profiles ───────────────────────────────────────────────────────────
  async fetchProfile<T = Record<string, unknown>>(uid: string): Promise<T | null> {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    return (data as unknown as T) ?? null;
  },

  async upsertProfile<T = Record<string, unknown>>(
    payload: { id: string } & Record<string, unknown>,
  ): Promise<T | null> {
    const { data } = await supabase
      .from("profiles")
      .upsert(payload as never, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    return (data as unknown as T) ?? null;
  },

  async updateProfileFields(
    uid: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from("profiles").update(patch as never).eq("id", uid);
  },

  async ensureWalletBalance(userId: string): Promise<void> {
    await supabase
      .from("wallet_balances")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
  },

  async fetchLoyaltyTier(userId: string): Promise<unknown> {
    const { data, error } = await supabase
      .from("profiles")
      .select("loyalty_tier")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return (data as { loyalty_tier?: unknown } | null)?.loyalty_tier ?? null;
  },

  // ─── Phone / referrals ──────────────────────────────────────────────────
  async checkPhoneExists(normalizedPhone: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("check_phone_exists", { p_phone: normalizedPhone });
      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  },

  async applyReferralCode(code: string): Promise<void> {
    try {
      await supabase.rpc("apply_referral_code" as never, { p_code: code } as never);
    } catch { /* non-fatal */ }
  },

  async ensureReferralCode(userId: string): Promise<void> {
    try {
      await supabase.rpc("ensure_referral_code" as never, { _user_id: userId } as never);
    } catch { /* non-fatal */ }
  },

  // ─── Roles (with branch) ────────────────────────────────────────────────
  async getActiveRolesWithBranch(userId: string): Promise<RoleWithBranch[]> {
    if (!userId) return [];
    try {
      
      const { data } = await supabase
        .from("user_roles")
        .select("role, branch_id, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);
      return ((data ?? []) as Array<{ role: AppRole; branch_id: string | null }>).map(
        (r) => ({ role: r.role, branch_id: r.branch_id ?? null }),
      );
    } catch {
      return [];
    }
  },

  // ─── Capabilities ───────────────────────────────────────────────────────
  async syncCapabilitiesFromRoles(userId: string): Promise<void> {
    await (supabase.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<unknown>)("sync_user_capabilities_from_roles", { p_uid: userId });
  },

  async listMyWorkspaces<T = Record<string, unknown>>(): Promise<T[]> {
    const { data } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: T[] | null }>)("my_workspaces");
    return (data ?? []) as T[];
  },

  async listUserCapabilities(
    userId: string,
    workspaceId: string,
  ): Promise<Array<{ capability: string; expires_at: string | null }>> {
    const { data } = await (supabase
      .from("user_capabilities" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => Promise<{ data: Array<{ capability: string; expires_at: string | null }> | null }>;
        };
      };
    })
      .select("capability, expires_at")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId);
    return data ?? [];
  },

  /* ─── Wave P-3 §12 — Theme preference / display name / wallet / favorites ─── */

  async getThemePreference(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from("profiles")
      .select("theme_preference")
      .eq("id", userId)
      .maybeSingle();
    const v = (data as { theme_preference?: string | null } | null)?.theme_preference;
    return v ?? null;
  },

  async setThemePreference(userId: string, value: string): Promise<void> {
    await supabase.from("profiles").update({ theme_preference: value }).eq("id", userId);
  },

  async getProfileFullName(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    return (data?.full_name as string | undefined) ?? null;
  },

  async getWalletBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.balance as number | undefined) ?? 0;
  },

  async listFavoriteIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", userId);
    return (data ?? []).map((r) => r.product_id as string);
  },

  async addFavorites(userId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    await supabase
      .from("favorites")
      .insert(productIds.map((product_id) => ({ user_id: userId, product_id })));
  },

  async addFavorite(userId: string, productId: string): Promise<void> {
    await supabase.from("favorites").insert({ user_id: userId, product_id: productId });
  },

  async removeFavorite(userId: string, productId: string): Promise<void> {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
  },
};
