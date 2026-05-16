# Anti-Pattern 02 — Role-Based Checks

## Symptom

```ts
if (user.role === "admin") { ... }
if (["admin","manager"].includes(user.role)) { ... }
```

## Why forbidden

- Roles are bundles; checks must be on **capabilities**.
- Hardcoded role strings drift; org changes silently break authorization.
- Violates Article III.

## Correct pattern

```ts
const can = useCapability("finance.payout.write");
<CapabilityGuard cap="finance.payout.write">…</CapabilityGuard>
```
