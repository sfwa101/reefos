# Catalog Disaster-Recovery Seed

This folder is the **last line of defense** for the public catalog (products,
categories, loyalty rules, incentive milestones). Customer data lives
exclusively in Supabase Cloud Backups and is **never** mirrored here.

## Allowed tables

| Table                  | Why it's safe to mirror              |
|------------------------|--------------------------------------|
| `categories`           | Public taxonomy                      |
| `products`             | Public catalog                       |
| `loyalty_tier_rules`   | Public business rules                |
| `incentive_milestones` | Public business rules                |

## FORBIDDEN tables (hardcoded blocklist in `sync-seed.ts`)

`profiles`, `orders`, `order_items`, `cart_items`, `carts`,
`wallet_transactions`, `wallet_balances`, `addresses`, `user_roles`,
`audit_logs`, `payments`, `invoices`, `referral_codes`, `messages`,
`notifications`, anything containing user PII.

## CLI usage

```bash
# 1) Pull the latest catalog from Supabase into catalog_seed.json
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  bun run scripts/db-backup/sync-seed.ts backup

# 2) Restore catalog_seed.json into a fresh DB (idempotent UPSERT)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  bun run scripts/db-backup/sync-seed.ts restore
```

## In-app usage (admin only)

`/admin/catalog-backup` exposes two buttons (Download backup / Restore from
file). Guarded by `RoleGuard roles={['admin']}` — staff/cashier/etc. cannot
even reach the page. Restore runs through the same UPSERT logic and is
idempotent: running it twice produces no duplicates.
