# Khalil — P1 Architectural Risk Report

A pre-implementation enumeration of risks and their mitigations. Each risk
has a tripwire: a concrete signal that, if observed, triggers an ADR.

## R1 — Sub-domain cross-imports

**Risk:** A Khalil sub-domain (e.g. `coach`) imports from another
(`habit/runtime`) for "convenience", creating hidden coupling.
**Mitigation:** ESLint boundary rule disallowing
`@/core/khalil/<a>/**` from importing `@/core/khalil/<b>/**` except
through `@/core/khalil/index.ts`.
**Tripwire:** Any PR that adds such an import.

## R2 — UI ⇢ Supabase shortcut

**Risk:** A developer skips the gateway and imports `supabase` directly in
a Khalil block "just for a quick fetch".
**Mitigation:** ESLint boundary rule: `src/apps/khalil/**` forbids importing
`@/integrations/supabase/client`. Anti-pattern doc #01 already enforces this
ecosystem-wide.
**Tripwire:** Lint failure or a PR diff containing the forbidden import.

## R3 — Identity level drift

**Risk:** Client computes or asserts level for "performance", desyncing
from server truth.
**Mitigation:** No client-side level computation exists. `khalil_identity_state`
is the only source. ProposalSchema rejects client-supplied level fields.
**Tripwire:** Any function named `computeLevel` outside
`src/core/khalil/identity/runtime/`.

## R4 — Coach autonomous action

**Risk:** Coach proposal silently executes a write without user accept.
**Mitigation:** Accept is its own gateway call with its own capability check.
Audit row on every `khalil.coach.accept`. The proposal payload contains an
**intent**, not a write.
**Tripwire:** Any code path where a model response triggers a write without
passing through `khalil.coach.accept`.

## R5 — Hardcoded copy in TSX

**Risk:** Quick Arabic strings inlined in components, blocking i18n.
**Mitigation:** Pre-commit grep for non-ASCII characters in `src/apps/khalil/**/*.tsx`
outside of i18n catalogs.
**Tripwire:** CI failure on the grep step.

## R6 — Cross-domain table read

**Risk:** Khalil block reads `orders` or `products` for cross-sell.
**Mitigation:** Khalil tables are prefixed; cross-domain reads require a
published contract (none exist in MVP). Anti-pattern #06.
**Tripwire:** Any `supabase.from("orders" | "products" | "wallets" | …)`
inside `src/apps/khalil/**` or `src/core/khalil/**`.

## R7 — Past-event editing

**Risk:** A "fix typo" mutation rewrites a logged prayer or completed habit.
**Mitigation:** Append-only tables have no UPDATE/DELETE RLS policy.
Corrections insert a correction row. Anti-pattern #07.
**Tripwire:** Any migration that grants UPDATE on `khalil_*_log` /
`*_completion` / `*_event` / `*_set` / `*_measurement`.

## R8 — Bespoke home page

**Risk:** Someone writes `HomePage.tsx` that hard-codes the block order
because "the orchestrator isn't ready yet".
**Mitigation:** No `KhalilHomePage` component exists. The route renders
`<AppBlockRenderer descriptor={composeHomeResult} />` only.
**Tripwire:** PR introducing conditional JSX of more than one Khalil block
inside a route file.

## R9 — Kernel pollution

**Risk:** Khalil-specific concept (e.g. `recoveryMode`) leaks into the
kernel "because every domain might want it later".
**Mitigation:** Kernel additions require ADR + sponsor. Art. IX.
**Tripwire:** PR touching `src/core/runtime-ui/`, `src/core/capabilities/`,
`src/core/events/`, etc., with the word "khalil" anywhere in the diff.

## R10 — Coach prompt leakage

**Risk:** Coach prompt strings exposed to client bundle.
**Mitigation:** Prompt registry is server-only (`*.server.ts`). Client
catalogs hold only display strings.
**Tripwire:** Vite bundle analyzer showing prompt registry in client chunk.

## R11 — Analytics exfiltration

**Risk:** Third-party analytics SDK added "for product insights" that
collects Khalil events.
**Mitigation:** Khalil analytics are projections only; no third-party SDK
is included in MVP. Explicit deferral.
**Tripwire:** Any `posthog`, `mixpanel`, `amplitude`, `ga4` import inside
Khalil paths.

## R12 — Offline write divergence

**Risk:** Queue replay produces duplicate or out-of-order events that
corrupt projections.
**Mitigation:** Idempotency on `client_event_id`; server timestamp wins;
projections are rebuildable. ADR-K006 finalizes the contract.
**Tripwire:** Projection drift detected by replay job.

## R13 — Feature creep via the "tiny add"

**Risk:** A "tiny" notification, streak badge, or social share lands during
P2 because "it's just one component".
**Mitigation:** `p1-feature-deferral.md` is the contract. Any item there
requires ADR before code.
**Tripwire:** Any PR title containing `notif`, `streak`, `share`, `social`
before its ADR merges.

## R14 — Mobile-last regression

**Risk:** A block is designed for desktop because it "looks better wide".
**Mitigation:** Reference width is 390px. Bundle + visual budget enforced.
**Tripwire:** Lighthouse mobile score < 85 on `/khalil/` after P2.

## R15 — Dependency on optional ecosystem domains

**Risk:** Khalil starts importing from `reef-al-madina` or `maeen` for
shared UI that doesn't belong in shared kernel.
**Mitigation:** Khalil depends only on `@/core/khalil/*`, `@/integrations/supabase/auth-middleware`,
kernel utilities, and shared `@/components/ui/*`.
**Tripwire:** Any import from `@/apps/<other>` or `@/core/<other-domain>`
inside Khalil.
