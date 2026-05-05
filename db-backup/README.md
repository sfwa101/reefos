# Local Database Snapshot

Plain-JSON snapshots of the **public catalog** tables, produced by
`scripts/backup-db.ts`. Committed to the repo so a fresh remix (or an
external IDE like Cursor / Windsurf pointing at a brand-new Supabase
project) can reseed the catalog without losing data.

## Files

| File                         | Source table     | Notes                                    |
| ---------------------------- | ---------------- | ---------------------------------------- |
| `products-snapshot.json`     | `public.products`| Full product catalog                     |
| `sdui_layouts-snapshot.json` | `public.sdui_layouts` | Server-driven UI layouts (if present) |

Each file has the shape:

```json
{ "table": "...", "exported_at": "ISO-8601", "count": N, "rows": [...] }
```

## Refreshing the snapshot

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  bun run scripts/backup-db.ts
```

A publishable/anon key also works but will only export rows visible
under RLS. Use the **service role** key for a true full backup.

## Restoring into a new Supabase project

Use the existing seeders — they accept the same JSON shape:

- `scripts/seed-catalog.ts` — bulk upsert into `products`
- `scripts/db-backup/sync-seed.ts restore` — upsert the four core
  catalog tables from `scripts/db-backup/catalog_seed.json`

## Product images

The 38 product images uploaded during the Phase 23.2 seed live in
**Supabase Storage** (bucket: `product-images`). They are NOT mirrored
into this folder — re-run the seed script (`scripts/seed-catalog.ts`)
against a fresh Supabase project to re-upload them from the local
seed source directory.

## Portability checklist (zero vendor lock-in)

- `src/integrations/supabase/client.ts` uses standard
  `@supabase/supabase-js` `createClient` with
  `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
  (with `VITE_SUPABASE_ANON_KEY` accepted as an alias via `.env`).
- Copy `.env.example` → `.env` and point it at any Supabase instance.
- Run this backup script, then run the restore seeder against the new
  project. Done.
