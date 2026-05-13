# 🌅 NOOR EL-DIN UNIVERSITY — Manifesto

> **Constitutional Entry — Salsabil OS**
> Codename: *Noor El-Din* (نور الدين) — "The Light of the Faith".
> Status: **Sovereign Stem Cell** (Law 2 — Stem Cell Architecture).
> Companion to: [`VISION.md`](../../VISION.md), [`TECH_PHILOSOPHY.md`](../../TECH_PHILOSOPHY.md),
> [`SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`](../../SALSABIL_OS_ARCHITECTURAL_MANIFEST.md).

---

## Prime Directive

> **Noor El-Din is NOT a Learning Management System.**
> It is a **Learning Civilization Engine** — a sovereign runtime that
> grows humans into builders, mentors, and economic actors inside the
> Salsabil OS economy.
>
> An LMS *delivers content*. Noor El-Din *grows civilizations*.

If a feature smells like Moodle, Canvas, or Coursera — it does not belong here.

---

## ⚖️ Principle 1 — The Core Unit: Learning Journeys

We **abolish the concept of "Courses"**. The atomic unit of Noor El-Din is the
**Learning Journey** (`رحلة تعلّم`) — a living composition of six dimensions:

| Dimension | Meaning |
|---|---|
| **Identity** | Who the learner is becoming (the future Professional DNA, not the current one) |
| **Skills** | Verified competencies added to the Sovereign Skill Graph |
| **Projects** | Real artifacts built and shipped — never quizzes, never multiple-choice |
| **Mentorship** | Human + Hakim coaching pairs, not lecture videos |
| **Community** | The cohort, the guild, the neighborhood of fellow journeyers |
| **Economy** | The earnings, contracts, and apprenticeships unlocked along the way |

### Mandatory shape

```ts
type LearningJourney = {
  id: string;
  identity_target: ProfessionalDNAKey;   // who you are becoming
  skill_outcomes: SkillNodeId[];          // what gets verified
  projects: ProjectBriefId[];             // what gets shipped
  mentors: MentorshipBinding[];           // who guides
  community_id: CommunityId;              // who walks with you
  economic_hooks: EconomicHookId[];       // what gets earned
};
```

### Forbidden patterns
- ❌ "Course catalog" pages with prices and star ratings
- ❌ Linear video playlists with completion percentages
- ❌ Multiple-choice quizzes as the primary signal of mastery
- ❌ PDF "certificates of completion"

> **A journey is finished when something real exists in the world that did
> not exist before.**

---

## ⚖️ Principle 2 — The Sovereign Skill Graph

Every learner carries a **Sovereign Skill Graph** — a directed, verifiable
graph of competencies, not a static certificate. The graph is owned by the
learner, scoped via `workspace_id`, and signed by the verifying mentor /
Hakim / project outcome.

### Mandatory mechanics
- **Skill nodes** are atomic, observable competencies (`can-deploy-edge-fn`,
  `can-design-token-system`, `can-close-cash-shift`).
- **Edges** encode prerequisites and progressions — the graph powers next-step
  recommendations, not the curriculum committee.
- **Verification sources** are typed: `mentor_signoff`, `project_outcome`,
  `hakim_assessment`, `peer_review`, `economic_proof` (real income from
  exercising the skill inside Reef / Tayseer).
- **Append-only** — verifications are immutable ledger entries (Law 6).
  Revocations are new entries, never edits.
- **Portable** — the graph follows the learner across every Salsabil
  super-app (Reef, Khalil, Asrab, Nabd) and across Workspace morphs.

### Forbidden patterns
- ❌ Static PDF certificates as the source of truth
- ❌ "Course completed" badges with no observable evidence
- ❌ Skills stored on `profiles` — they live in their own ledger table

> **A certificate says "you attended". The graph proves "you can".**

---

## ⚖️ Principle 3 — The Economic Bridge (Digital Apprenticeships)

Noor El-Din is **fused** with Reef Al-Madina, Tayseer, and Barq Logistics.
Learning is never abstract; every meaningful skill unlocks a real economic
task inside the live Salsabil economy.

### Mandatory bindings
- **Digital Apprenticeships** — once a learner reaches a verifiable
  competency tier, the journey emits a real `ApprenticeshipBrief` into
  the Reef vendor / Barq driver / Tayseer treasury queues.
- **Earnings flow into Tayseer** — every apprenticeship payout settles into
  the learner's wallet; no parallel "course credit" currency.
- **Failure is real** — if the apprenticeship work is rejected, the skill
  graph records the regression and Hakim re-routes the journey.
- **Mentor compensation** is also routed via Tayseer; mentorship is paid
  work, not volunteerism.

### Forbidden patterns
- ❌ Simulated "fake assignments" with no economic counterparty
- ❌ In-app "learning coins" or any non-Tayseer currency
- ❌ Apprenticeships routed outside Barq / Reef / Tayseer ledgers

> **The classroom IS the marketplace. The marketplace IS the classroom.**

---

## ⚖️ Principle 4 — The Active Runtime (Hakim as Coach)

Noor El-Din is built on **active learning**. The default loop is **build →
ship → reflect → repeat**, not **watch → quiz → forget**.

### Hakim's role
Hakim AI is a **Coach**, not an Answer Machine.

| Hakim does | Hakim does not |
|---|---|
| Ask better questions | Hand back finished code |
| Surface the next struggling skill | Solve the project for the learner |
| Propose the next ship-worthy slice | Auto-grade quizzes |
| Pair the learner with a human mentor | Replace the human mentor |
| Detect plateau and re-route the journey | Optimize for engagement metrics |

All Hakim outputs in the learning loop pass through Law 5 gates: Zod
validation, profit / safety guardrails, rate limiters, and the sovereign
tracing ledger. Hakim never writes directly to the Skill Graph — only
verified humans, verified projects, and verified economic outcomes can.

> **A coach does not run the race for you. A coach makes you faster.**

---

## ⚖️ Principle 5 — The Reputation Economy

Advancement inside Salsabil OS is **earned**, not purchased. Noor El-Din
maintains a **Meaningful Reputation Score** (`MRS`) per learner, computed
from observable contributions:

| Signal | Weight |
|---|---|
| Helping another learner ship (verified) | High |
| Mentoring (verified by mentee outcomes) | High |
| Projects shipped into Reef / Tayseer / Barq production | Highest |
| Apprenticeship outcomes (delivered, accepted, paid) | High |
| Community contributions (answered questions, reviewed code) | Medium |
| Pure consumption (videos watched, lessons opened) | **Zero** |

### What MRS unlocks
- **Sovereign rights** — proposal voting, capability publishing in the
  Marketplace (Law 1), local-guild leadership.
- **Tayseer financial opportunities** — higher Murabaha caps, lower
  apprenticeship fees, savings-vault co-signer rights, employer match-making.
- **Workspace morphing** — new Professional DNA archetypes unlock as the
  graph + MRS qualify the learner for them.

### Forbidden patterns
- ❌ Buying reputation, badges, or graph nodes
- ❌ Pay-to-skip on apprenticeship gating
- ❌ Engagement metrics (time-on-app, streaks) feeding MRS

> **Reputation is the only currency that cannot be printed.**

---

## 🧬 Architectural Binding

Noor El-Din is a **Sovereign Stem Cell** under Law 2.

### Required compliance
1. **Lives at** `src/apps/noor-eldin/` — sibling of `reef-al-madina`,
   `khalil`, `asrab`, `nabd`. Registered in `src/core-os/app-registry/`.
2. **Consumes the kernel only** via `@/core-os/*`:
   - `@/core/finance` (Tayseer) — wallet, apprenticeship payouts, MRS unlocks
   - `@/core/hakim-ai` — the Coach runtime
   - `@/core/runtime-ui/sdui` — every learning surface is a composed intent (Law 1)
   - `@/core/logistics` — physical apprenticeship routing
   - `@/core/events` — emits `journey.*`, `skill.*`, `apprenticeship.*` events
3. **Uses the same Professional DNA** runtime as the rest of Salsabil OS —
   no custom theming, no hard-coded archetype branching (Law 4).
4. **All sensitive writes** (skill verification, MRS mutation, apprenticeship
   payout) go through `SECURITY DEFINER` RPCs and are logged in the
   sovereign tracing ledger (Law 6). Never raw client writes.
5. **Local-first** (Law 3) — journey progress, skill graph snapshots, and
   reflection notes persist via the IndexedDB query cache and offline sync
   queue. The learner never loses work to a flaky network.
6. **No cross-stem-cell imports** — Noor El-Din never imports from
   `reef-al-madina/`, `khalil/`, etc. All sharing happens through
   `@/core-os/*`, `@/context/*`, `@/lib/*`.

### Forbidden patterns (instant rejection)
- Hand-rolled "course player" pages outside the SDUI Composer
- Hard-coded archetype branches (`if (role === "student") …`)
- Direct `supabase.from("skill_graph").update(…)` from any client component
- Storing reputation or roles on `profiles`
- Any currency that is not Tayseer

---

## 🎯 Definition of Done — Noor El-Din Features

A Noor El-Din change is **done** when:
1. It composes a Learning Journey through SDUI intents — never a hard-wired page.
2. Every new Skill node, MRS mutation, and Apprenticeship write goes through
   a `SECURITY DEFINER` RPC and lands in the sovereign ledger.
3. RLS policies scope every new table by `learner_id` and / or `workspace_id`.
4. Hakim hooks pass through Zod gates and the Coach guardrails.
5. The journey survives offline — progress queues and reconciles cleanly.
6. No new currency, no new identity store, no new role table — reuses
   Tayseer, the Sovereign Identity Graph (Phase 61), and `user_roles`.
7. Logged in `ARCHITECTURAL_ROADMAP.md` with a phase id.

---

## The Educator's Oath

> I will not measure attendance — I will measure transformation.
> I will not grade memorization — I will witness construction.
> I will not sell certificates — I will forge competence.
> I will not simulate — I will apprentice.
> I will not gamify — I will dignify.
> I will not let Hakim answer — I will let Hakim coach.
> I will not isolate the classroom from the marketplace.
> I will leave the learner stronger, freer, and wealthier than I found them.

— *Principal Enterprise Architect, Salsabil OS*
