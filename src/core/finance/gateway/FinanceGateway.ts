/**
 * FinanceGateway — sovereign boundary for the Wallet / Tayseer / Finance domain.
 *
 * All direct Supabase calls for wallet balances, ledger entries, savings,
 * transfers, Tayseer payments, gameyas, and stealth-mode flags MUST go
 * through the methods exported here. Hooks must NOT import the supabase
 * client directly. This is enforced as part of Wave P-3 sovereignty.
 *
 * Pre-existing `any` / `as never` / `as any` casts were preserved to
 * keep the network-extraction strictly scoped — flagged for Wave P-7.
 */
import { supabase } from "@/integrations/supabase/client";

export type GatewayChannel = { unsubscribe: () => void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = dynamicSb;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = dynamicSb.rpc.bind(supabase);

export const FinanceGateway = {
  // ============= Tayseer ledger / wallet =============

  async getWalletById(walletId: string) {
    const { data, error } = await supabase
      .from("wallets")
      .select("id,user_id,balance,currency,status,created_at,updated_at")
      .eq("id", walletId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listLedgerEntriesPaginated(params: {
    walletId?: string;
    from?: string;
    to?: string;
    offset: number;
    pageSize: number;
  }) {
    let q = supabase
      .from("ledger_entries")
      .select(
        "id,wallet_id,transaction_group_id,amount,currency,description,idempotency_key,counterparty_wallet_id,created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(params.offset, params.offset + params.pageSize - 1);
    if (params.walletId) q = q.eq("wallet_id", params.walletId);
    if (params.from) q = q.gte("created_at", params.from);
    if (params.to) q = q.lte("created_at", params.to);
    const { data, error, count } = await q;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async tayseerTransferFunds(input: {
    sender_wallet_id: string;
    receiver_wallet_id: string;
    transfer_amount: number;
    transfer_currency: string;
    idempotency_key: string;
    transfer_description?: string | null;
  }) {
    const { data, error } = await supabase.rpc("tayseer_transfer_funds", {
      sender_wallet_id: input.sender_wallet_id,
      receiver_wallet_id: input.receiver_wallet_id,
      transfer_amount: input.transfer_amount,
      transfer_currency: input.transfer_currency,
      idempotency_key: input.idempotency_key,
      transfer_description: input.transfer_description ?? undefined,
    });
    if (error) throw error;
    return data as string;
  },

  async processTayseerPayment(input: { order_id: string; amount: number }) {
    const { data, error } = await rpc("process_tayseer_payment", {
      p_order_id: input.order_id,
      p_amount: input.amount,
    });
    return { data, error };
  },

  // ============= Wallet search (Tayseer console) =============

  async searchWalletsByOrUuid(term: string, limit: number) {
    const { data, error } = await supabase
      .from("wallets")
      .select("id,user_id,balance,currency,status,created_at,updated_at")
      .or(`id.eq.${term},user_id.eq.${term}`)
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async searchProfilesByText(term: string, limit: number) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone")
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async listProfilesByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone")
      .in("id", userIds);
    if (error) throw error;
    return data ?? [];
  },

  async listWalletsByUserIds(userIds: string[], limit: number) {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from("wallets")
      .select("id,user_id,balance,currency,status,created_at,updated_at")
      .in("user_id", userIds)
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // ============= Wallet transactions (sovereign ledger) =============

  async getEgpWalletByUser(userId: string) {
    const { data } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .eq("currency", "EGP")
      .maybeSingle();
    return data;
  },

  async listLedgerEntriesByWallet(walletId: string, limit: number) {
    const { data } = await supabase
      .from("ledger_entries")
      .select("id, amount, description, created_at")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  subscribeWalletLedger(walletId: string, onInsert: () => void): GatewayChannel {
    const channel = supabase
      .channel(`wallet-ledger:${walletId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ledger_entries",
          filter: `wallet_id=eq.${walletId}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        () => onInsert(),
      )
      .subscribe();
    return { unsubscribe: () => supabase.removeChannel(channel) };
  },

  // ============= Savings jar =============

  async getSavingsJar(userId: string) {
    const { data } = await supabase
      .from("savings_jar")
      .select("balance,auto_save_enabled,round_to,goal,goal_label")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  },

  async listSavingsTransactions(userId: string, limit: number) {
    const { data } = await supabase
      .from("savings_transactions")
      .select("id,amount,kind,label,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  // ============= Wallet balance (legacy) =============

  async getWalletBalanceLegacy(userId: string) {
    const { data } = await supabase
      .from("wallet_balances")
      .select("balance,points,coupons,cashback")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  },

  async getProfileBasic(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, short_id")
      .eq("id", userId)
      .maybeSingle();
    return data;
  },

  async getUserTrustLimit(userId: string) {
    const { data } = await supabase.rpc("user_trust_limit", { _user_id: userId });
    return data;
  },

  async getUserTotalSpent(userId: string) {
    const { data } = await rpc("user_total_spent", { _user_id: userId });
    return data;
  },

  subscribeWalletBalance(userId: string, onChange: () => void): GatewayChannel {
    const channel = supabase
      .channel(`wallet-balance:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_balances",
          filter: `user_id=eq.${userId}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        () => onChange(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_transactions",
          filter: `user_id=eq.${userId}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        () => onChange(),
      )
      .subscribe();
    return { unsubscribe: () => supabase.removeChannel(channel) };
  },

  // ============= Wallet assets (multi-asset) =============

  async listMultiAssetBalances(userId: string) {
    const { data } = await sb
      .from("wallet_assets")
      .select("asset_type,balance")
      .eq("user_id", userId);
    return data ?? [];
  },

  // ============= Wallet dashboard analytics =============

  async listMasterOrdersWithFulfillmentNodes(userId: string) {
    const res = await supabase
      .from("salsabil_master_orders")
      .select(
        "id, delivery_info, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(id)",
      )
      .eq("customer_id", userId);
    return res.data ?? [];
  },

  async listFulfillmentItemsWithAssets(nodeIds: string[]) {
    const res = await supabase
      .from("salsabil_fulfillment_items")
      .select(
        "price_at_time,quantity,created_at,node_id, salsabil_skus(salsabil_assets(category_path,traits))",
      )
      .in("node_id", nodeIds.length ? nodeIds : ["00000000-0000-0000-0000-000000000000"]);
    return res.data ?? [];
  },

  async listUserReferrals(userId: string) {
    const { data } = await supabase
      .from("referrals")
      .select("id,status,commission,first_order_at,created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async getUserReferralCode(userId: string) {
    const { data } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  },

  async ensureReferralCode(userId: string) {
    const { data, error } = await supabase.rpc("ensure_referral_code", {
      _user_id: userId,
    });
    return { data, error };
  },

  async listCategoryBudgets(userId: string) {
    const { data } = await supabase
      .from("category_budgets")
      .select("category,monthly_limit")
      .eq("user_id", userId);
    return data ?? [];
  },

  // ============= Gameyas =============

  async listGameyaMemberships(userId: string) {
    const { data } = await supabase
      .from("gam_eya_members")
      .select(
        "turn_number, gam_eyas(id, name, cycle_amount, max_members, current_cycle_index, status, starts_at, cycle_duration_months, reward_pool, min_kyc_tier)",
      )
      .eq("user_id", userId);
    return data ?? [];
  },

  async listOpenGameyas() {
    const { data } = await supabase.rpc("list_open_gam_eyas");
    return data ?? [];
  },

  async getUserTrustScore(userId: string) {
    const { data } = await supabase
      .from("user_trust_score")
      .select("score, tier, is_trusted")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  },

  async listGameyaMembers(circleId: string) {
    const { data } = await supabase
      .from("gam_eya_members")
      .select("id,user_id,turn_number,is_trusted")
      .eq("gam_eya_id", circleId)
      .order("turn_number", { ascending: true });
    return data ?? [];
  },

  async listGameyaInstallments(circleId: string) {
    const { data } = await supabase
      .from("gam_eya_installments")
      .select("id,cycle_index,due_date,amount_due,amount_paid,status,user_id")
      .eq("gam_eya_id", circleId)
      .order("cycle_index", { ascending: true });
    return data ?? [];
  },

  async listProfileNamesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    return data ?? [];
  },

  // ============= Transfer logic =============

  async getUserKycLevel() {
    const { data, error } = await supabase.rpc("get_user_kyc_level");
    return { data, error };
  },

  async walletTransfer(payload: {
    recipientPhone: string;
    amount: number;
    note?: string;
  }) {
    const { error } = await supabase.rpc("wallet_transfer", {
      _recipient_phone: payload.recipientPhone,
      _amount: payload.amount,
      _note: payload.note || undefined,
    });
    return { error };
  },

  // ============= Stealth mode (hide balance) =============

  async getProfileHideBalance(userId: string) {
    const { data } = await sb
      .from("profiles")
      .select("hide_balance")
      .eq("id", userId)
      .maybeSingle();
    return data;
  },

  updateProfileHideBalanceFireAndForget(userId: string, value: boolean) {
    sb.from("profiles").update({ hide_balance: value }).eq("id", userId);
  },

  // ============= Finance UI residuals (Sub-Wave 10) =============

  async requestUserPayout(input: {
    amount: number;
    method: string;
    bankDetails: { account: string; holder: string };
  }) {
    const { data, error } = await rpc("request_user_payout", {
      _amount: input.amount,
      _method: input.method,
      _bank_details: input.bankDetails,
    });
    return { data, error };
  },

  async listUserVaults(userId: string) {
    const { data } = await sb
      .from("wallet_vaults")
      .select("id,name,icon,target_amount,current_balance,locked_until")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Array<Record<string, unknown>>;
  },

  async listUserVaultBalances(userId: string) {
    const { data } = await sb
      .from("wallet_vaults")
      .select("current_balance")
      .eq("user_id", userId);
    return (data ?? []) as Array<{ current_balance: number }>;
  },

  async listUserGameyaMembershipsWithCircles(userId: string) {
    const { data } = await sb
      .from("gam_eya_members")
      .select("turn_number, gam_eyas(cycle_amount, max_members, current_cycle_index, status)")
      .eq("user_id", userId);
    return (data ?? []) as Array<Record<string, unknown>>;
  },

  async createGameya(input: {
    name: string;
    cycleAmount: number;
    maxMembers: number;
    cycleDurationMonths: number;
  }) {
    const { data, error } = await rpc("create_gam_eya", {
      _name: input.name,
      _cycle_amount: input.cycleAmount,
      _max_members: input.maxMembers,
      _cycle_duration_months: input.cycleDurationMonths,
    });
    return { data, error };
  },

  async joinGameya(input: { circleId: string; turnNumber: number }) {
    const { error } = await rpc("join_gam_eya", {
      _circle_id: input.circleId,
      _turn_number: input.turnNumber,
    });
    return { error };
  },

  async processSavingsJarOp(input: {
    amount: number;
    kind: "deposit" | "withdraw" | "settings";
    label: string;
    idempotencyKey: string;
    settings: Record<string, unknown> | null;
  }) {
    const { error } = await rpc("process_savings_jar_op", {
      p_amount: input.amount,
      p_kind: input.kind,
      p_label: input.label,
      p_idempotency_key: input.idempotencyKey,
      p_settings: input.settings as never,
    });
    return { error };
  },

  async upsertCategoryBudget(input: {
    userId: string;
    category: string;
    monthlyLimit: number;
  }) {
    return sb
      .from("category_budgets")
      .upsert(
        { user_id: input.userId, category: input.category, monthly_limit: input.monthlyLimit },
        { onConflict: "user_id,category" },
      );
  },

  async deleteCategoryBudget(input: { userId: string; category: string }) {
    return sb
      .from("category_budgets")
      .delete()
      .eq("user_id", input.userId)
      .eq("category", input.category);
  },

  async listActiveCharityCampaigns() {
    const { data, error } = await sb
      .from("charity_campaigns")
      .select(
        "id,auditor_id,title,description,cover_url,target_amount,current_amount,restricted_categories,is_active,ends_at,created_at",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Array<Record<string, unknown>>;
  },

  async donateToCampaign(input: {
    campaignId: string | null;
    amount: number;
    source: "direct" | "general_pool";
  }) {
    const { data, error } = await rpc("donate_to_campaign", {
      _campaign_id: input.campaignId as unknown as string,
      _amount: input.amount,
      _source: input.source,
    });
    return { data, error };
  },

  async getWalletBalanceByUserId(userId: string) {
    const { data } = await sb
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    return Number((data as { balance?: number } | null)?.balance ?? 0);
  },
};

