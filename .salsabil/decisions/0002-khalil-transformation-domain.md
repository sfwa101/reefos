# ADR-0002 — Khalil as a sovereign transformation domain

| Field | Value |
|---|---|
| **Status** | `Accepted` |
| **Date** | 2026-05-16 |
| **Phase** | Khalil P0 — Governance Scaffold |
| **Supersedes** | the prior informal framing of "Khalil = super-app launcher" |

## Context

Earlier project notes (and the `OS_COMPANIES` registry) describe Khalil as
"السوبر-أب الموحد" — a WeChat-style launcher. That framing is incompatible
with the actual vision: Khalil is a **sovereign AI-guided human
transformation operating system** — identity, discipline, spirituality,
physical evolution, mood, recovery, AI coaching, adaptive daily orchestration.

The super-app launcher role already exists separately as **Maeen** (route
`/_app/maeen`, content `src/apps/khalil/pages/Hub.tsx` mislabeled as
"Maeen Super-App Hub"). The two concerns must not collide.

## Decision

1. **Khalil is a sovereign domain** under `src/core/khalil/` with its own
   gateway, runtime, sub-domains, events, capabilities, schemas, and i18n
   catalog. It owns the URL prefix `/khalil/*`.
2. **Khalil reuses the Salsabil kernel** (auth, capabilities, events,
   theme, i18n, SDUI, AI gateway, audit) and never forks it.
3. **No code lands inside `src/core/khalil/` or new routes under `/khalil/*`
   until phase P1 is opened by a follow-up ADR.** Phase P0 produces only
   governance documents under `.salsabil/domains/khalil/` and a documented
   scaffold (`src/core/khalil/README.md`, empty `index.ts`).
4. **The misplaced "Maeen Super-App Hub" content** at
   `src/apps/khalil/pages/Hub.tsx` and the file `src/apps/khalil/components/MaeenLauncherGrid.tsx`
   will be migrated under `src/apps/maeen/` in a follow-up patch (P0.1).
   No migration is performed in this ADR's patch to avoid touching live
   routes during governance ratification.
5. **`OS_COMPANIES`** entry for `khalil` will be re-labelled to reflect the
   real Khalil identity in P0.1, alongside the Maeen migration.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Build Khalil features now under the existing `src/apps/khalil/` directory | Conflates Khalil with the Maeen launcher; violates Art. V; produces architectural debt. |
| Treat Khalil as a feature of Reef | Couples discipline to commerce; violates Art. V. |
| Skip the governance layer and start with MVP screens | Violates Art. X (Governance-First). User explicitly required governance first. |

## Consequences

- ✅ Khalil's architecture is documented before any code.
- ✅ Future contributors (human or AI) have authoritative source-of-truth
  files to consult before proposing patches.
- ✅ Misplaced "Maeen" content is identified for a clean P0.1 migration.
- ⚠️ Users selecting `khalil` from the OS Switcher today reach Maeen content
  until P0.1 lands. Acceptable for the duration of P0 (≤ next patch).

## Acceptance criteria

- [x] `.salsabil/domains/khalil/DOMAIN_MEMORY.md` exists and is internally
      consistent with the constitution.
- [x] All eleven governance documents listed in DOMAIN_MEMORY §8 exist.
- [x] `src/core/khalil/README.md` and `src/core/khalil/index.ts` exist and
      contain no business logic.
- [x] No new routes under `/khalil/*` were added in this patch.
- [x] No edits to `OS_COMPANIES`, `src/apps/khalil/pages/Hub.tsx`, or
      `src/apps/khalil/components/MaeenLauncherGrid.tsx` in this patch
      (they are P0.1 work).
- [x] `bunx tsc --noEmit` passes.

## Follow-ups (separate ADRs)

- **ADR-K-P0.1** — Migrate Maeen content out of `src/apps/khalil/`;
  re-label the `khalil` entry in `OS_COMPANIES`.
- **ADR-K001** — Identity level mechanics.
- **ADR-K002** — Coach gateway contract with Hakim.
- **ADR-K003** — Recovery-mode state machine.
- **ADR-K004** — Per-pillar data isolation strategy.
- **ADR-K005** — Khalil onboarding ritual + consent storage.
