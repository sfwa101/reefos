# Architecture Overview

## Macro layers

```text
┌─────────────────────────────────────────────────────────────┐
│  Apps           src/apps/**, src/routes/**                  │
│  ─ customer storefront, admin, vendor, driver, POS, KDS     │
├─────────────────────────────────────────────────────────────┤
│  Gateways       src/core/<domain>/gateway/*                 │
│  ─ enforce capability, validate input, emit events          │
├─────────────────────────────────────────────────────────────┤
│  Domain Runtimes  src/core/<domain>/runtime/*               │
│  ─ invariants, projections, business rules                  │
├─────────────────────────────────────────────────────────────┤
│  Kernel         src/core/{runtime-ui,capabilities,events,   │
│                 sections,feeds,search,media}                │
│  ─ mechanism only                                           │
├─────────────────────────────────────────────────────────────┤
│  Integrations   src/integrations/**                         │
│  ─ Supabase, AI Gateway, external HTTP                      │
└─────────────────────────────────────────────────────────────┘
```

## Hard rules

- Dependencies point **downward only**.
- UI never imports `supabase` directly — only via gateways/server fns.
- Gateways never import UI.
- Kernel never imports from `apps/`, `routes/`, `pages/`.

## Server runtime

TanStack Start v1 on Cloudflare Workers. Server-side logic is `createServerFn` + server routes under `src/routes/api/`. No Supabase Edge Functions for new logic.
