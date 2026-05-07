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
  on public.saved_baskets for select using (auth.uid() = user_id);
create policy "saved_baskets_insert_own"
  on public.saved_baskets for insert with check (auth.uid() = user_id);
create policy "saved_baskets_update_own"
  on public.saved_baskets for update using (auth.uid() = user_id);
create policy "saved_baskets_delete_own"
  on public.saved_baskets for delete using (auth.uid() = user_id);

create trigger saved_baskets_set_updated_at
  before update on public.saved_baskets
  for each row execute function public.update_updated_at_column();

create materialized view if not exists public.user_product_frequency as
with line_events as (
  select o.user_id, oi.product_id, oi.quantity as qty, o.created_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.user_id is not null and oi.product_id is not null
),
ordered as (
  select user_id, product_id, qty, created_at,
    lag(created_at) over (partition by user_id, product_id order by created_at) as prev_at
  from line_events
)
select
  user_id,
  product_id,
  sum(qty)::bigint as qty_total,
  count(*)::bigint as order_count,
  max(created_at) as last_ordered_at,
  avg(extract(epoch from (created_at - prev_at)) / 86400.0)
    filter (where prev_at is not null) as avg_interval_days
from ordered
group by user_id, product_id;

create unique index if not exists user_product_frequency_pk
  on public.user_product_frequency (user_id, product_id);
create index if not exists user_product_frequency_user_idx
  on public.user_product_frequency (user_id, last_ordered_at desc);

revoke all on public.user_product_frequency from public, anon, authenticated;