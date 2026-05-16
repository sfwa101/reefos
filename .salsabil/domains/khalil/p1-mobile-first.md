# Khalil — P1 Mobile-First Architecture

## Principle

> Khalil is a mobile-first transformation OS. The phone is the canonical
> surface. Tablet and desktop are derivatives. Never the other way around.

## Breakpoint contract

| Token | Range | Layout intent |
|---|---|---|
| `xs` | 320–389 | smallest supported phone, single column |
| `sm` | 390–639 | reference design width |
| `md` | 640–1023 | larger phone / small tablet, still single column with wider blocks |
| `lg` | 1024–1439 | tablet landscape / small desktop, two-column home |
| `xl` | 1440+ | desktop, max content width clamped (no edge-to-edge sprawl) |

Reference design is `sm` (390px width). Every block must be designed for
390 first, then expanded.

## Touch + gesture rules

- Tap targets ≥ 44×44 CSS pixels.
- Primary actions reachable with the thumb (lower half of screen).
- No hover-only affordances. Everything must work via tap.
- Long-press is allowed only for "secondary action" affordances, with a
  visible alternative always present.
- Horizontal swipe is reserved for the global App Switcher and route-level
  navigation, never for in-block actions.

## Safe areas

- Respect `env(safe-area-inset-*)` on top and bottom.
- Bottom CTAs sit above the system gesture bar.
- The recovery banner, when visible, sits **below** the top safe area but
  **above** the home content.

## Performance budget (mobile)

| Metric | Budget (P75 mid-tier Android, 4G) |
|---|---|
| Initial JS for `/khalil/` | ≤ 180KB gzipped |
| LCP | ≤ 2.5s |
| TTI | ≤ 3.5s |
| Block lazy-load chunk | ≤ 40KB gzipped each |

P2 enforces this via per-route bundle inspection. Blowing the budget
requires an ADR with mitigation.

## Forbidden

- ❌ Designing the desktop view first.
- ❌ Hover-only interactions.
- ❌ Modal stacks deeper than 1 on mobile.
- ❌ Fixed-pixel widths that break < 360px.
- ❌ Loading the analytics chart library on the home route.
