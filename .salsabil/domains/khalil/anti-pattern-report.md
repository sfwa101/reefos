# Khalil — Anti-Pattern Report

This document catalogs the traps Khalil must actively reject. Each anti-pattern
mirrors a constitutional article and is rejection criteria in code review.

## A. Architecture

| # | Anti-pattern | Why forbidden |
|---|---|---|
| A1 | Direct `supabase.from("khalil_*")` in a component | Violates Art. IV. UI talks to gateways, never to the DB. |
| A2 | Cross-domain import (`@/core/reef-*` from `@/core/khalil`) | Violates Art. V. Use events. |
| A3 | Duplicating `useAuth`, `useCapabilities`, theme, or i18n inside Khalil | Violates Art. IX. Reuse the kernel. |
| A4 | New bespoke admin page that bypasses `AdminBlockRenderer` | Violates Art. VIII. |
| A5 | Reading `process.env` at module scope (even inside `*.server.ts`) | Cloudflare Workers inject env per-request. Read inside `.handler()`. |

## B. Identity & Capability

| # | Anti-pattern | Why forbidden |
|---|---|---|
| B1 | `if (user.email === "...")` or any literal-identity branch | Violates Art. III. Use capabilities. |
| B2 | Computing identity level on the client | Violates `identity-system.md`. Server-only, event-derived. |
| B3 | Storing roles on `profiles` | Privilege escalation vector. Use `user_roles` + `has_role()` SECURITY DEFINER. |
| B4 | Capability strings built from user input | Trivially bypassable. Static keys only. |

## C. Psychology & UX

| # | Anti-pattern | Why forbidden |
|---|---|---|
| C1 | Streak-loss notification copy ("You broke your 12-day streak!") | Violates `psychology-engine.md`. |
| C2 | Confetti / slot-machine animations on completion | Dopamine trap. Use calm motion. |
| C3 | Public profiles, leaderboards, or shareable badges | Violates `identity-system.md`. |
| C4 | Friction copy on "enter recovery mode" | Recovery must be one tap, dignified. |
| C5 | Hardcoded Arabic literals in TSX | Violates Art. VII + i18n strategy. |

## D. AI Coach

| # | Anti-pattern | Why forbidden |
|---|---|---|
| D1 | Coach prompts as TS string literals | Violates `ai-coach-philosophy.md`. Prompts live in DB, versioned, audited. |
| D2 | Coach output mutating user state directly | AI proposes; user disposes. |
| D3 | Unvalidated coach text rendered to the user | Schema-validate every proposal. |
| D4 | Coach reading another user's data | Server-side context must be RLS-scoped to the caller. |

## E. Analytics

| # | Anti-pattern | Why forbidden |
|---|---|---|
| E1 | Third-party analytics SDK on `/khalil/*` | Violates `analytics-architecture.md`. |
| E2 | Client-side heatmap computation | Server-only. |
| E3 | Operator dashboard that resolves an aggregate to a user | k-anonymity (k ≥ 25) at the gateway is mandatory. |

## F. Events & Data

| # | Anti-pattern | Why forbidden |
|---|---|---|
| F1 | Mutating a past event row | Append-only. Insert a `correction` event. |
| F2 | Synchronous chained writes across sub-domains | Use the event bus. |
| F3 | Event payload containing raw journal text without explicit opt-in | Privacy by default. |

## Current debt (as of P0)

- ⚠️ `src/apps/khalil/pages/Hub.tsx` is **Maeen** content (super-app launcher),
  not Khalil. This file must move under `src/apps/maeen/` in P0.1 and Khalil's
  shell must start empty pending P1.
- ⚠️ `OS_COMPANIES` currently labels khalil as "السوبر-أب الموحد". The label
  must be updated to reflect Khalil's actual identity in P0.1 — but only via
  ADR + a single coordinated patch.
