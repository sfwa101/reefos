# Playbook 05 — Incident Response

## Severity

- **P0** — invariant violated (finance, identity, tenancy, audit).
- **P1** — domain unavailable.
- **P2** — degraded UX.

## Steps

1. Capture `trace_id` of failing requests.
2. Identify affected domain via ownership map.
3. Freeze writes to affected domain if invariant at risk.
4. Diagnose via tracing → logs → audit.
5. Apply minimal fix; emit compensating events if state already corrupted.
6. File post-incident ADR within 48 hours.

## Forbidden

- Editing past events to "fix" data.
- Disabling audit to "unblock" a release.
- Silent rollback without ADR.
