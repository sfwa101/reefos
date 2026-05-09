# 🌌 VISION.md — Salsabil OS / Reef Al-Madina

> **The Strategic Constitution**
> A foundational document for every human and AI contributor.
> Read this BEFORE writing a single line of code.

---

## 0. The One-Line Truth

> **We are not building an app. We are not building an ERP.**
> We are building a **Multi-Role Adaptive Commerce Civilization** —
> a living operating system where capabilities compose themselves around
> the human using them, not the other way around.

If you ever find yourself asking *"where do I add this page?"* — stop.
You are thinking in the wrong dimension. There are no pages here.
There are **capabilities**, **roles**, **contexts**, and **intents**.
The interface is a *consequence*, not an artifact.

---

## 1. The Four Pillars

### 1.1 🧬 Capability Composer

The system does **not** ship hardcoded screens.
It ships **capabilities** — atomic, reusable units of business power:

- `orders.fulfill`
- `inventory.adjust`
- `staff.dispatch`
- `wallet.transfer`
- `pricing.override`

A "screen" is just a **runtime composition** of capabilities chosen by:
1. The user's active **role** (cashier, driver, vendor, admin, customer…)
2. The user's current **context** (in-store, on-route, peak-hour, offline)
3. The user's **Interface DNA** (see §1.2)
4. The **tenant scope** (Reef, Asrab, Khalil, Nabd…)

> ❌ `pages/CashierScreen.tsx` with hand-wired widgets.
> ✅ `compose(["orders.queue","payments.collect","inventory.lookup"], dna)`

The Composer is the **only** authority that decides what a user sees.
No file under `src/pages/*` is allowed to claim final UI authority —
all pages are *thin shells* over the Composer.

---

### 1.2 🧠 Interface DNA

Every identity in the system carries a **DNA profile** — a structured,
persistent description of *who they are operationally*:

```ts
type InterfaceDNA = {
  scale: "micro" | "small" | "enterprise";   // business scale
  roles: AppRole[];                          // multi-role identity
  cognitiveLoad: "minimal" | "balanced" | "dense";
  motorContext: "thumb" | "stylus" | "mouse" | "voice";
  ambientLight: "bright" | "dim" | "dark";
  literacy: "icon-first" | "text-first" | "mixed";
  preferredFlow: "guided" | "expert" | "shortcut";
  language: "ar" | "en" | "bilingual";
};
```

The DNA dictates **density, motion, color temperature, button size,
keyboard shortcuts, and workflow shape** — automatically. A cashier's
DNA produces tap-targets ≥ 56px and zero animation. A manager's DNA
produces dense data tables and keyboard-first navigation. **Same code,
different organism.**

DNA is **mutable** — it learns from behavior via the Event Bus and
adapts over weeks, not just at signup.

---

### 1.3 🧱 Smart Living Blocks (Block Economy)

A "block" in Salsabil OS is **not** a visual component. It is an
**economic, semantic, and intelligent unit**:

| Layer | What the block carries |
|---|---|
| **Visual** | Render contract (token-driven, theme-aware) |
| **Permissions** | Who may see, edit, dispatch, audit it |
| **Data Contract** | Typed inputs/outputs, validation, idempotency keys |
| **AI Hooks** | Predictions, anomaly probes, summarization slots |
| **Analytics** | Self-reporting telemetry — every render, every interaction |
| **Economics** | Cost-to-render, cost-to-fetch, profit attribution |

Blocks **trade with each other** at runtime. A high-cost block on a
low-end device negotiates downgrade. A block whose AI prediction is
stale defers its own render. The UI is a **marketplace of blocks**,
governed by the Composer.

---

### 1.4 🤖 AI Operational Intelligence (Hakim)

The AI in Salsabil OS is **not** a chatbot bolted to a sidebar.
It is a **proactive operating partner** named **Hakim**, embedded into
the runtime itself:

- **Predicts rush hours** 90 minutes ahead and pre-warms driver pools.
- **Warns about stock** before the buyer notices the gap.
- **Detects anomalies** in cashier sessions in real time.
- **Rewrites flows** on the fly when a user struggles (DNA feedback).
- **Negotiates** between blocks (see §1.3) on resource scarcity.
- **Speaks Arabic natively** — not translated, *thought* in Arabic.

Hakim is **never** asked. Hakim **observes, decides, and acts**, with
auditable traces for every decision (`sovereignTracing.ts`).

The chat interface is the *least interesting* surface of Hakim — the
**operational** surface is where the civilization lives.

---

## 2. The Ten Civilizational Laws

1. **No screen is ever final.** Every UI is a runtime composition.
2. **No user is single-role.** Identity is plural and switchable.
3. **No tenant bleeds into another.** Isolation is structural, not policy.
4. **No price is hardcoded.** All economics flow through the Pricing Engine.
5. **No write is unaudited.** Every mutation has a trace and idempotency key.
6. **No latency is acceptable.** Local-first, optimistic, offline-tolerant.
7. **No role is privileged in code.** Permissions live in `user_roles` + RLS.
8. **No AI is decorative.** Every AI surface must change an outcome.
9. **No block is mute.** Every block self-reports cost and value.
10. **No future is foreclosed.** Architecture must absorb the unknown.

---

## 3. The Civilizational Roadmap

This is the *long arc*. Phases are milestones, not endpoints.

| Era | Theme | Outcome |
|---|---|---|
| **I — Foundation** | Stem-cell modules, pricing engine, RLS | Single-tenant retail |
| **II — Identity** | Multi-role, DNA, role-switcher | One human, many faces |
| **III — Marketplace** | Multi-vendor, hubs, productive families | Many sellers, one trust |
| **IV — Reverse Commerce** | Affiliates, dropshipping, marketers | Customer becomes seller |
| **V — Intelligence** | Hakim operational AI, predictive ops | System runs itself |
| **VI — Composer** | Full SDUI, capability registry, DNA-driven | Pages disappear |
| **VII — Civilization** | Asrab, Khalil, Nabd super-apps on shared OS | One OS, many worlds |

---

## 4. What This Document Forbids

- ❌ Treating Salsabil OS as a "delivery app with extras."
- ❌ Adding a feature without asking *which capability* it extends.
- ❌ Hardcoding any role-specific UI inside a shared component.
- ❌ Building a dashboard before defining the DNA it serves.
- ❌ Calling AI "a feature." AI is the **substrate**.

---

> **The Emperor's mandate:**
> *"Every line of code we write today must serve a million humans tomorrow.
> Build it like you are laying the first stone of a pyramid — because you are."*

— *Principal Enterprise Architect, Salsabil OS*
