# Anti-Pattern 09 — AI Auto-Apply

## Symptom

AI suggestion is written to a table or applied to state without a human/operator disposing it.

## Why forbidden

- Violates Article XI and the AI Governance pipeline.
- Eliminates accountability and auditability.

## Correct pattern

`ai_candidates` row with `status=pending` → operator command references `candidate_id` → kernel applies → event emitted with `cause: { kind: "ai_candidate", id }`.
