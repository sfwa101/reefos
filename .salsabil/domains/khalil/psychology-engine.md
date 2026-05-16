# Khalil — Psychology Engine

The psychology engine governs **how** Khalil speaks to the user, **when** it
nudges, and **what it refuses to do**. It is not a feature — it is a policy
layer enforced in the runtime and the coach.

## Model

We adopt a synthesis of:

- **Identity-based behavior** (you act in line with who you believe you are).
- **Self-determination theory** (autonomy, competence, relatedness).
- **Trauma-informed habit design** (recovery is graceful, not punitive).
- **Islamic discipline of `tazkiya`** (purification framed as evolution, not shame).

The engine never invokes guilt, fear, or social comparison.

## Operating rules

1. **Witness, then suggest.** A new user is observed for ≥ 7 days before the
   coach proposes anything beyond a single anchor habit.
2. **Recovery is first-class.** Entering recovery mode is a single tap, never
   buried in settings, never asked "are you sure?" with friction copy.
3. **No streak shaming.** Missed days produce a soft signal to the
   orchestrator, never a red-flag UI.
4. **Quiet by default.** Push notifications are off unless the user explicitly
   asks. The coach speaks when summoned.
5. **No dopamine traps.** No confetti, no slot-machine animations, no
   "level up" fanfare. Transitions are calm and dignified.
6. **One thing at a time.** The daily orchestrator surfaces at most three
   intentional commitments. Lists are bounded.
7. **Honest mirrors.** Analytics show what *is*, not a sanitized version.
   Truthful, calm, contextual.

## Ethical guardrails

- The engine must not detect or claim to detect clinical conditions.
- The engine must not gate access to recovery, reflection, or coach
  conversation behind paywalls or "earning".
- The engine must surface a crisis-resource link if the user logs sustained
  severe-mood signals — without making it the centerpiece of the UI.
- The engine must allow the user to export and delete all their data at any
  time (`khalil.config.data.export`, `.delete` — to be added in P1).

## Forbidden engineering shortcuts

- ❌ Encoding rules as `if` chains in components. Rules live in the runtime
  and are configurable via DB-backed policy rows (Art. VII).
- ❌ Hardcoding copy strings in components. All copy lives in i18n catalogs.
- ❌ A/B testing recovery flows for engagement metrics. Recovery is not an
  optimization surface.
