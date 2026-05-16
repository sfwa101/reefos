# System Invariants

These hold at all times. A violation is a P0.

1. UI never imports the Supabase client directly.
2. Every mutation that affects financial state emits an event AND an audit row.
3. Every server function with capability ≥ `financial` re-checks the capability on the server.
4. `routeTree.gen.ts`, `src/integrations/supabase/{client,types,client.server,auth-*}.ts` are never hand-edited.
5. No kernel file imports from `src/apps/**`, `src/routes/**`, `src/pages/**`.
6. Events are append-only. Audit rows are append-only.
7. Capability strings never originate from user input.
8. AI output never reaches state without a disposing actor.
9. RLS is enforced on every table that holds user-scoped data.
10. Every server fn entry creates or continues a `trace_id`.
