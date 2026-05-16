# Runtime: Gateways

A gateway is the **only** way into a domain.

## Required structure

```ts
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireCapability("commerce.order.write")])
  .inputValidator((d) => OrderInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const result = await runtime.placeOrder(data, context);
    await emit({ name: "order.placed", payload: result, ... });
    return result;
  });
```

## Invariants

- Gateways NEVER import UI.
- Gateways NEVER expose raw Supabase tables to callers.
- Every gateway entry/exit is traced.
- Every mutation emits an event or explicitly justifies omission.
