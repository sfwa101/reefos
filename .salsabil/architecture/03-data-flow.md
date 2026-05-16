# Data Flow

## Canonical write path

```text
UI intent
  → useServerFn(gateway.command)
    → gateway: capability check → input validation → invariant check
      → runtime: state transition
        → Supabase write (RLS-enforced)
        → event emit (typed)
          → subscribers (idempotent, traced)
          → projections (rebuildable)
          → audit (if sensitivity ≥ financial)
```

## Canonical read path

```text
UI
  → useQuery(gateway.read)
    → server fn → Supabase select (RLS) → typed projection
  → render via descriptor or component
```

## Forbidden paths

- UI → Supabase directly.
- UI → another domain's table.
- Gateway → UI.
- Domain → Domain (without published contract or subscribed event).
