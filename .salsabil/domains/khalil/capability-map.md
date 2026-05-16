# Khalil — Capability Map

All capabilities are registered in the central `CapabilityRegistry`. Khalil
keys are namespaced `khalil.<area>.<verb>`. Unknown keys fail closed.

## Sensitivity ladder

`public → member → operator → financial → sovereign`

Khalil capabilities never exceed `member` sensitivity unless they touch
finance, billing, or AI-coach training data — those escalate to `financial`
or `sovereign` per Art. III.

## Declared keys (P0 design)

| Key | Sensitivity | Description |
|---|---|---|
| `khalil.session.start` | `member` | Begin or resume a Khalil session for the authenticated user. |
| `khalil.identity.read` | `member` | Read own identity level, archetype, history. |
| `khalil.identity.write` | `member` | Record an identity-affecting event (e.g. ritual completion). Server validates eligibility. |
| `khalil.habit.read` | `member` | Read own habit definitions and adherence. |
| `khalil.habit.write` | `member` | Log a habit completion / skip / partial. |
| `khalil.habit.configure` | `member` | Create / edit / archive own habit definitions. |
| `khalil.prayer.read` | `member` | Read own prayer log + qadaa backlog. |
| `khalil.prayer.write` | `member` | Log a prayer (on-time, qadaa, intention mode). |
| `khalil.workout.read` | `member` | Read own training history. |
| `khalil.workout.write` | `member` | Log a session, set, or recovery note. |
| `khalil.weight.read` | `member` | Read own weight history. |
| `khalil.weight.write` | `member` | Log a weight measurement. |
| `khalil.mood.read` | `member` | Read own mood / energy log. |
| `khalil.mood.write` | `member` | Log mood / energy. |
| `khalil.recovery.toggle` | `member` | Enter or exit recovery mode. Always allowed; never gated by "earning". |
| `khalil.coach.read` | `member` | Read coach proposals. |
| `khalil.coach.accept` | `member` | Accept a coach proposal (records consent). |
| `khalil.analytics.self.read` | `member` | Read own analytics (heatmaps, adherence). |
| `khalil.config.theme.write` | `member` | Personal theme overrides. |
| `khalil.admin.content.write` | `operator` | Manage shared Khalil content catalogs (workout templates, dhikr lists). |
| `khalil.admin.coach.tune` | `sovereign` | Adjust coach prompts / policies. Audited. |
| `khalil.admin.analytics.aggregate.read` | `operator` | Anonymized aggregate analytics. PII-stripped at the gateway. |

## Lifecycle of a new Khalil capability

1. Add an ADR under `.salsabil/decisions/` proposing the key and rationale.
2. Declare key + descriptor in `src/core/capabilities/CapabilityRegistry.ts`.
3. Add to a role bundle migration (no per-user grants from UI).
4. Apply server-side middleware + client-side guard in the same patch.
5. If sensitivity ≥ `financial`: emit `khalil.<key>.used` audit event.
6. Update this file in the same commit.

## Forbidden

- `khalil.god`, `khalil.all`, or any wildcard key.
- Capability strings built from user input.
- Capability grants from the client.
- Substituting a capability check for an RLS policy.
