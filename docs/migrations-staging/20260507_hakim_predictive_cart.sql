-- ============================================================
-- Phase 4 (Part 1): Hakim Predictive Cart — DB Sovereignty
-- ============================================================
-- STAGED migration. Not yet executed against the live DB.
-- When approved, this is run via the supabase--migration tool
-- (which will copy it into supabase/migrations/ with a fresh
-- timestamp and apply it).
--
-- Establishes the database primitives required for:
--   1. Cross-device "saved baskets" (manual / predicted / subscription)
--      replacing the legacy localStorage subscription store.
--   2. A materialized per-user purchase-frequency view used by the
--      Hakim Predictive Cart prompt to infer recurring baskets.
--
-- This migration is structural ONLY. No data is moved here; the
-- Phase 4 Part 2 work will migrate localStorage subscriptions into
-- public.saved_baskets via a one-time client-side sync.
-- ============================================================

-- ----- 1. saved_baskets ------------------------------------------------
create table if not exists public.saved_baskets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  source      text not null default 'manual'
              check (source in ('manual', 'predicted', 'subscription')),
  items       jsonb not null default '[]'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists saved_baskets_user_idx
  on public.saved_baskets (user_id, is_active, source);

alter table public.saved_baskets enable row level security;

create policy "saved_baskets_select_own"
  on public.saved_baskets for select
  using (auth.uid() = user_id);

create policy "saved_baskets_insert_own"
  on public.saved_baskets for insert
  with check (auth.uid() = user_id);

create policy "saved_baskets_update_own"
  on public.saved_baskets for update
  using (auth.uid() = user_id);

create policy "saved_baskets_delete_own"
  on public.saved_baskets for delete
  using (auth.uid() = user_id);

-- updated_at trigger (uses existing project helper)
create trigger saved_baskets_set_updated_at
  before update on public.saved_baskets
  for each row execute function public.update_updated_at_column();

-- ----- 2. user_product_frequency (materialized view) -------------------
-- Aggregates per-user, per-product purchase signal to feed Hakim's
-- prediction prompt cheaply (no per-call recomputation of order history).
--
-- Inputs:  public.orders, public.order_items
-- Refresh: scheduled via pg_cron (added in Part 2). Built with a unique
--          index so REFRESH MATERIALIZED VIEW CONCURRENTLY is supported.
create materialized view if not exists public.user_product_frequency as
with line_events as (
  select
    o.user_id,
    oi.product_id,
    oi.qty,
    o.created_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.user_id is not null
    and oi.product_id is not null
),
ordered as (
  select
    user_id,
    product_id,
    qty,
    created_at,
    lag(created_at) over (
      partition by user_id, product_id order by created_at
    ) as prev_at
  from line_events
)
select
  user_id,
  product_id,
  sum(qty)::bigint                              as qty_total,
  count(*)::bigint                              as order_count,
  max(created_at)                               as last_ordered_at,
  -- average days between successive purchases of this product;
  -- null when the user has bought it only once.
  avg(extract(epoch from (created_at - prev_at)) / 86400.0)
    filter (where prev_at is not null)          as avg_interval_days
from ordered
group by user_id, product_id;

create unique index if not exists user_product_frequency_pk
  on public.user_product_frequency (user_id, product_id);

create index if not exists user_product_frequency_user_idx
  on public.user_product_frequency (user_id, last_ordered_at desc);

-- NOTE: Materialized views do not honor RLS. Access is intentionally
-- limited to service-role / SECURITY DEFINER callers (Hakim edge fn).
-- Do NOT grant select to `authenticated` directly.
revoke all on public.user_product_frequency from public, anon, authenticated;
