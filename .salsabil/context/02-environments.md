# Environments

| Env | Purpose | URL pattern |
|---|---|---|
| Preview | Per-branch ephemeral build | `id-preview--<project>.lovable.app` |
| Dev | Latest preview, stable URL | `project--<id>-dev.lovable.app` |
| Production | Published deployment | `project--<id>.lovable.app`, custom domain |

## Runtime

- Browser: Vite-built React 19 SPA shell, TanStack Router SSR.
- Server: Cloudflare Workers (`nodejs_compat`).
- Database: Lovable Cloud (Supabase under the hood; never referenced as such to users).
- AI: Lovable AI Gateway.

## Forbidden in server code

`child_process`, `sharp`, `canvas`, `puppeteer`, `fs.watch`, native addons. See `useful-context > server-runtime` in the agent system prompt.
