# Anti-Pattern 03 — Kernel Branching on Identity

## Symptom

```ts
// inside src/core/**
if (section === "meat") renderMeat();
if (tenant === "reef-al-madina") applySpecial();
```

## Why forbidden

- Kernel must be policy-free (Article IX).
- Every new section/tenant/role becomes a kernel patch — unbounded growth.

## Correct pattern

Descriptor lookup via registry. The kernel does not know section names; it knows kinds.
