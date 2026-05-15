// requireAdmin middleware — composes on top of requireSupabaseAuth and
// verifies the authenticated user holds the 'admin' role via the
// security-definer `public.has_role(uuid, app_role)` RPC.
//
// Usage:
//   createServerFn({ method: 'POST' })
//     .middleware([requireAdmin])
//     .handler(async ({ context }) => { ... })
//
// On failure throws a Response with the appropriate HTTP status:
//   401 — no/invalid session (delegated to requireSupabaseAuth)
//   403 — authenticated but not an admin
//   500 — RPC failure / misconfiguration
import { createMiddleware } from '@tanstack/react-start'
import { requireSupabaseAuth } from './auth-middleware'
import { Tracer } from "@/core/system/observability/Tracer";

export const requireAdmin = createMiddleware({ type: 'function' })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context

    const { data, error } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    })

    if (error) {
      Tracer.error("integrations", "requireadmin_has_role_rpc_failed", { args: ['[requireAdmin] has_role RPC failed', error] })
      throw new Response('Forbidden: role check failed', { status: 500 })
    }

    if (data !== true) {
      throw new Response('Forbidden: admin role required', { status: 403 })
    }

    return next({ context })
  })
