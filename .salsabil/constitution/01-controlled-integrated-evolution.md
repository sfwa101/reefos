# Article I — Controlled Integrated Evolution

## Principle

The system evolves continuously, but never chaotically. Every change is:

- **Controlled** — scoped, reviewed, capability-checked.
- **Integrated** — consistent with constitution, architecture, and existing contracts.
- **Evolutionary** — additive when possible; breaking only via deprecation window.

## Rules

1. No change merges without a referenced governance source (ADR, domain memory, or open issue tagged `governance`).
2. Schema changes require migration + rollback + ADR.
3. Contract changes require version bump and consumer audit.
4. Kernel changes require constitutional review.
5. AI-authored changes require human disposition before merge.

## Forbidden

- Silent refactors of shared contracts.
- "Temporary" hardcodes.
- Deleting events, audit rows, or ADRs.
- Bypassing governance "to ship faster".
