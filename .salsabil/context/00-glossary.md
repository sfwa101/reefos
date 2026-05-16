# Glossary

| Term | Meaning |
|---|---|
| **Sovereign** | Authoritative within its scope; not overridable by lower layers. |
| **Constitution** | The set of inviolable laws under `.salsabil/constitution/`. |
| **Kernel** | Mechanism-only core (`src/core/{runtime-ui,capabilities,events,...}`). |
| **Gateway** | The single ingress to a domain; enforces capability + policy. |
| **Capability** | Atomic named permission key (e.g. `commerce.order.write`). |
| **Descriptor** | Data structure describing what to render or run; consumed by registries. |
| **SDUI** | Server-Driven UI — UI composed from descriptors, not bespoke pages. |
| **Event** | Append-only, past-tense record of a state change. |
| **Projection** | Read model derived from events; rebuildable. |
| **Audit** | Compliance-grade, append-only record of sensitive actions. |
| **Workspace** | The tenant scope within which capabilities are evaluated. |
| **Provenance** | Origin marker on records (`human`, `system`, `ai`). |
| **Propose → Dispose** | Two-step ritual for applying AI candidates. |
| **Hakim** | Internal AI advisor family (`hakim-*`). |
| **Salsabil** | The project's sovereign runtime identity. |
| **Reef Al Madina** | The flagship storefront/POS application. |
| **Taysir / Tayseer** | The wallet / finance facility. |
