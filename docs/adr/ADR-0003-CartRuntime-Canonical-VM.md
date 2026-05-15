# ADR-0003 — CartRuntime Canonical ViewModel (V3)

- **Status:** Accepted
- **Date:** Phase P-1.1.A (Wave Sovereign Cleanup)
- **Supersedes:** ad-hoc `CartLineMeta` flat shape in `src/store/useCartStore.ts`
- **Related:** `SOVEREIGN_V3_MANDATE.md` §4 (Singularity), `ARCHITECTURE_LAWS.md` Law 8 (Kernel Minimalism), Law 9 (Single Source of Truth)

## Context

Pre-V3 the cart line shape was a flat `CartLineMeta` bag carrying every vertical's fields side-by-side (`bookingDate`, `borrowDuration`, `printConfig`, `prepHours`, …). The kernel had to know about each retail branch by name, in direct violation of Law 8 (Kernel Minimalism) and Law 12 (Anti-Hardcoding).

Singularity enforcement (Law 9) requires a single canonical cart shape consumed by every UI layer through `CartRuntime`.

## Decision

`CartRuntime.AddCartItemIntent` / `CartRuntimeLine` carry **three optional polymorphic blocks** plus the existing identity + financial DNA core:

```text
AddCartItemIntent
├── lineId, productId, dna, qty, modifiers, name, capabilities   ← identity + pricing
├── kindData : CartLineKindData                                  ← polymorphic per-vertical
│     ├── { kind: "buy",     variantId?, addonIds? }
│     ├── { kind: "booking", date, slot?, note?, prepHours?, payDeposit? }
│     ├── { kind: "borrow",  duration: "3d"|"7d"|"14d", days?, deposit? }
│     └── { kind: "print",   config: { pages, copies, colorMode, sided, binding, fileName?, filePath? } }
├── display  : CartLineDisplay                                   ← capturedName/Image/Price/At, unit, vendorId
└── extensions : Readonly<Record<string, JsonValue>>             ← sealed JSON-safe bag
```

### Kernel Minimalism Guardrails

- The kernel branches on `kindData.kind` **only** for line-identity hashing (`computeLineKey`). It never branches on it for pricing, persistence, or rendering.
- New verticals add a `CartLineKindData` member; they MUST NOT add fields to the root intent.
- `extensions` is sealed to `JsonValue`. No domain types may leak through it.
- Pricing math remains exclusively delegated to `CashierBrain.calculateCart`.

### New Surface

| Symbol | Purpose |
|---|---|
| `CartLineKind`, `CartLineKindData` | Polymorphic per-vertical block (discriminated union). |
| `CartLineDisplay` | Display snapshot for offline / hydration-free rendering. |
| `CartLineExtensions` | Sealed JSON-safe metadata bag. |
| `computeLineKey(intent)` | Deterministic line identity (used by both kernel and legacy bridge). |
| `CartRuntime.updateMeta(lineId, patch)` | Patch `display` / `kindData` / `extensions` of an existing line. |
| `CartRuntime.replaceAll(intents)` | Authoritative bulk replace (remote sync, "swap basket"). |
| `CartRuntime.{find,qty,remove,setQty,updateMeta}ByProductId` | Convenience helpers for legacy product-keyed callers (P-1.1.D removes them once consumers move to lineId). |
| Events `cart.line.meta_updated`, `cart.replaced` | Append-only audit on the new mutations. |

## Consequences

- **Singularity restored at the write boundary**: every cart mutation in the OS now flows through `CartRuntime`. The Zustand `useCartStore` is a read-only projection (P-1.1.B).
- **Vertical neutrality**: adding "rental", "subscription", "deposit-only" verticals is a discriminated-union extension — no kernel changes, no UI churn.
- **Backwards compatibility**: legacy `CartLineMeta` survives as the *projection* shape consumed by ~60 UI files; both adapters (`legacyMetaToKindData` / `kindDataToLegacyMeta`) live in `src/store/useCartStore.ts` and are deleted in P-1.1.D when the consumers migrate to `useCartRuntime`.
- **Type safety**: zero `any`, zero `as unknown` introduced; `tsc --noEmit` exits 0.

## Exit Criteria for ADR Closure

ADR-0003 is closed once Wave P-1.1.D completes:
- `rg -l "CartContext|SharedCartContext|useCartStore" src/` → 0
- All UI consumers read via `useCartRuntime` and write via `CartRuntime` methods directly.
- Legacy `CartLineMeta` and the `Product` bridge field are removed.
