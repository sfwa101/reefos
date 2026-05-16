# Anti-Pattern 08 — Hardcoded Copy or Pricing

## Symptom

```tsx
<button>اشتري الآن</button>
const tax = price * 0.14;
```

## Why forbidden

- Locks copy to one locale; blocks i18n and admin control.
- Hardcoded math drifts from regulation and finance policy.
- Violates Article VII.

## Correct pattern

- Copy from translation registry or admin-controlled descriptor.
- Pricing/tax via finance domain contract or RPC.
