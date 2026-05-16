# Khalil — Future Integrations

Forward-looking integration contracts. Each entry is a **promise about
boundaries**, not a roadmap commitment.

## With Tayseer (finance)

- **Direction**: Khalil → Tayseer (read-only, future).
- **Purpose**: optional sadaqa / charity micro-pledges tied to ritual
  completion. **Opt-in only.** Never default-on.
- **Contract**: `tayseer.wallet.read` capability; Khalil never writes
  ledger entries directly — it requests a transfer intent.
- **Anti-pattern**: do not embed wallet UI inside Khalil. Hand off to
  Tayseer's pledge surface.

## With Hakim (AI gateway)

- **Direction**: Khalil → Hakim (server-side only).
- **Purpose**: model calls for the coach.
- **Contract**: Khalil calls a Hakim server fn with a typed `CoachRequest`,
  receives a typed `CoachProposal`. Hakim handles model selection, retries,
  rate-limits, and provider abstraction. Khalil never touches model SDKs.

## With Noor El-Din (knowledge)

- **Direction**: Khalil ← Noor El-Din (read-only).
- **Purpose**: source-of-truth for Qur'an, dhikr catalogs, prayer ranges,
  authenticated hadith snippets used by the spiritual pillar.
- **Contract**: Khalil consumes versioned content via Noor El-Din's gateway,
  never copies content into its own tables.

## With Salsabil OS shell

- **Direction**: bidirectional, presentation-level only.
- **Purpose**: Khalil appears in the OS Notch / App Switcher; its route
  prefix is `/khalil/*`; its identity card is rendered by the shared
  switcher. No business logic crosses the boundary.

## With Reef Al-Madina (commerce)

- **Direction**: **none**. By design.
- **Justification**: discipline domain and commerce domain must not couple.
  If a future flow requires it (e.g. supplement reorder), it is mediated by
  Tayseer + a published Reef contract, not by a direct import.

## With Asrab Tayba (real estate / travel / hajj)

- **Direction**: Khalil ← Asrab (read-only, future).
- **Purpose**: Hajj / Umrah retreat mode for the spiritual pillar.
- **Contract**: Asrab publishes a `retreat.window.active` event; Khalil's
  orchestrator switches the day plan to a retreat profile.

## With Nabd El-Hayah (health)

- **Direction**: bidirectional, event-only.
- **Purpose**: Nabd publishes verified health signals (e.g. sleep);
  Khalil's recovery engine consumes them. Khalil publishes intent signals
  (e.g. training load) to Nabd for clinical context.
- **Contract**: events only, no shared tables.

## Hard rules for all future integrations

1. Every integration is an **ADR** before a line of code.
2. Every integration crosses domain boundaries via **events + capabilities**.
3. No integration may give another domain write access to Khalil tables.
4. No integration may give Khalil write access to another domain's tables.
5. The user's consent for any cross-domain data flow is **explicit** and
   **revocable** in one tap.
