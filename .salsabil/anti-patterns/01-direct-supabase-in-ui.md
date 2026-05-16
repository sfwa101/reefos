# Anti-Pattern 01 — Direct Supabase Call in UI

## Symptom

```ts
// in a component, hook, or route
import { supabase } from "@/integrations/supabase/client";
const { data } = await supabase.from("orders").select("*");
```

## Why forbidden

- Bypasses gateways → no capability check, no audit, no event.
- Couples UI to schema; refactors ripple.
- Violates Article II (Sovereign Architecture) and Article IV (Event-Driven).

## Correct pattern

Define a gateway server fn; call via `useServerFn` + `useQuery`.
