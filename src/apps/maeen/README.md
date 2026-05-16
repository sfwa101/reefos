# Maeen (معين) — Unified Empire Hub

**Sovereign owner of:** the cross-civilization super-app launcher surface
(`/maeen`, page_key `maeen_hub`, section `MaeenLauncherGrid`).

**Not Khalil.** Khalil is the sovereign AI-guided human transformation OS
(`/khalil`, `src/core/khalil/`). Khalil does NOT own launcher concerns.
See ADR-0003 (`.salsabil/decisions/0003-p0.1-maeen-khalil-decoupling.md`).

## Boundaries

- UI under `src/apps/maeen/` MAY consume kernel modules (`@/core/*`,
  `@/components/ui/*`) and the SDUI runtime.
- MUST NOT import from `src/apps/khalil/**` or `src/core/khalil/**`.
- The SDUI row slug `khalil_hub` is retained for DB-identity continuity
  and will be renamed in a dedicated schema-migration ADR (P0.2+).
