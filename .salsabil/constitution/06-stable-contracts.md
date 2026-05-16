# Article VI — Stable Contracts, Replaceable Implementations

## Rules

- Every exported symbol from a domain or kernel module is a **contract**.
- Contracts are versioned with the module; breaking changes bump the major.
- Implementations are private; consumers import the contract, never the impl path.
- Deprecations follow: **announce → dual-run → remove**, each step recorded in an ADR.

## Test

> If a junior engineer rewrites the implementation tomorrow, will every consumer still compile and behave the same? If no, the contract is incomplete or leaking.
