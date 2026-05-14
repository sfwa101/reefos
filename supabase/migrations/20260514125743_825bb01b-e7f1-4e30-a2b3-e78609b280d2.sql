-- Wave P-7 Batch A: Sovereign Workspace Identity (JWT Custom Claim Hook)
-- Injects `workspace_id` into every issued access token.
-- Single-tenant fallback: "reef-al-madina". Multi-workspace tables can be
-- introduced later by extending the lookup inside this function.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  resolved_workspace text;
begin
  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Future-proof: when a `user_workspaces` table exists, look up the
  -- workspace for (event->>'user_id') here. For now we hard-code the
  -- single deployed workspace.
  resolved_workspace := 'reef-al-madina';

  claims := jsonb_set(claims, '{workspace_id}', to_jsonb(resolved_workspace), true);

  -- Mirror under app_metadata so older client SDKs that read
  -- `user.app_metadata.workspace_id` see the same value.
  claims := jsonb_set(
    claims,
    '{app_metadata,workspace_id}',
    to_jsonb(resolved_workspace),
    true
  );

  event := jsonb_set(event, '{claims}', claims, true);
  return event;
end;
$$;

-- Permissions: the auth admin role invokes this hook.
grant execute on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;
