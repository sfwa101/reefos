# Khalil — P1 Capability Ownership Map

Every Khalil action is gated by a capability key registered in the central
`CapabilityRegistry`. No role checks. No string concatenation. No client-side
grants. Unknown keys fail closed (Art. III).

## Sensitivity ladder

`public → member → operator → financial → sovereign`

Khalil MVP uses only `member` and `sovereign`. Nothing in Khalil is financial
(no payments touch Khalil tables in MVP).

## MVP capability registry (locked)

| Key | Sub-domain | Sensitivity | Owner | Audit |
|---|---|---|---|---|
| `khalil.auth.session.read` | identity (shared) | member | kernel | no |
| `khalil.home.compose.read` | orchestrator | member | khalil | no |
| `khalil.prayer.log.write` | prayer | member | khalil | no |
| `khalil.prayer.qadaa.write` | prayer | member | khalil | no |
| `khalil.prayer.read` | prayer | member | khalil | no |
| `khalil.habit.define.write` | habit | member | khalil | no |
| `khalil.habit.complete.write` | habit | member | khalil | no |
| `khalil.habit.read` | habit | member | khalil | no |
| `khalil.workout.session.write` | workout | member | khalil | no |
| `khalil.workout.set.write` | workout | member | khalil | no |
| `khalil.workout.read` | workout | member | khalil | no |
| `khalil.weight.measurement.write` | weight | member | khalil | no |
| `khalil.weight.read` | weight | member | khalil | no |
| `khalil.recovery.toggle` | recovery | member | khalil | **yes** |
| `khalil.recovery.read` | recovery | member | khalil | no |
| `khalil.identity.read` | identity-evolution | member | khalil | no |
| `khalil.identity.recompute` | identity-evolution | sovereign | khalil | **yes** |
| `khalil.analytics.private.read` | analytics | member | khalil | no |
| `khalil.coach.propose.read` | coach | member | khalil | no |
| `khalil.coach.accept` | coach | member | khalil | **yes** |
| `khalil.coach.dismiss` | coach | member | khalil | no |

## Audit rule

Even though MVP has no financial capability, three keys emit audit events:
- `khalil.recovery.toggle` — emotional state change must be reconstructable.
- `khalil.identity.recompute` — sovereign override of level engine.
- `khalil.coach.accept` — proves dispose authority remained with the user (Art. XI).

## Forbidden patterns (enforced in P2 review)

```ts
// ❌ Role check
if (user.role === "admin") { ... }

// ❌ Dynamic key
const key = `khalil.${area}.write`;
requireCapability(key);

// ❌ Client-side grant
session.capabilities.push("khalil.identity.recompute");

// ❌ UI-only guard, no server check
{can("khalil.habit.complete.write") && <Button onClick={() => supabase.from(...)} />}
```

## Lifecycle of a new Khalil capability (post-MVP)

1. ADR proposes the key, sensitivity, owner, audit decision.
2. Register in `CapabilityRegistry` + role bundle migration.
3. Apply on server middleware AND client guard in the same patch.
4. If sensitivity ≥ financial OR explicitly flagged: wire audit emission.
5. Update `p1-capability-ownership.md` (or successor) in the same patch.
6. Update domain memory.

A key that exists in code but not in this document is treated as **invalid**.
