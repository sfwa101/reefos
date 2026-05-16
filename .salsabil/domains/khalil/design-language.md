# Khalil — Design Language

## Aesthetic axis

> **Cyber-minimal spiritual elegance** — Apple Health's restraint, Headspace's
> calm, Notion's typographic discipline, with a quiet masculine gravity.

Inspirations explicitly named: Apple Health, Headspace, Notion, elite-athlete
training apps. Explicitly rejected: childish gamification, neon hype, hustle
culture aesthetics, social-feed visual noise.

## Tokens (to be ratified in P0.1)

Khalil layers its own tokens on top of the global system. None of these may
appear as raw values in components — only as semantic token references.

```css
:root {
  --khalil-bg: oklch(0.16 0.01 260);          /* deep night */
  --khalil-surface: oklch(0.20 0.012 260);
  --khalil-text: oklch(0.96 0.005 95);
  --khalil-muted: oklch(0.70 0.01 260);
  --khalil-accent: oklch(0.72 0.12 165);      /* tahara green */
  --khalil-accent-soft: oklch(0.85 0.05 165);
  --khalil-warn: oklch(0.78 0.10 70);
  --khalil-recovery: oklch(0.78 0.06 230);    /* dignified blue */
  --khalil-radius: 22px;
  --khalil-elev-1: 0 8px 24px -12px oklch(0 0 0 / 0.35);
}
```

## Typography

- **Display / headings**: a humanist serif paired with a precise sans
  (final choice ratified in P0.1 typography ADR). Default candidates:
  *Instrument Serif* + *Inter*, or *Cormorant* + *Söhne*.
- **Arabic**: a contemporary naskh with strong rhythm — candidates:
  *IBM Plex Sans Arabic* or *Rubik*. Never use a decorative thuluth for body.
- Body sizes scale on an 8pt grid; no font-size literals in components.

## Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entrances, `cubic-bezier(0.4, 0, 0.2, 1)` for transitions.
- Duration: 240–360ms for most surfaces. Recovery transitions are slower (480ms).
- Reduced motion: every animated surface MUST honor `prefers-reduced-motion`.

## Layout

- Mobile-first, single-column by default.
- Generous vertical rhythm. Never cram.
- Apple-style notches and pill chrome reused from the shared shell — Khalil
  does not invent new chrome primitives.

## Forbidden visual patterns

- ❌ Confetti, sparkle bursts, slot-machine animations.
- ❌ Loud red "you missed" banners.
- ❌ Trophy / medal iconography.
- ❌ Bright multi-color gradients used to signal "energy".
- ❌ Pixel-art / playful illustrations.
