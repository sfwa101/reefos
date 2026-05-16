# Khalil — i18n Strategy

## Languages (P1)

- **Arabic** (`ar`) — default, RTL.
- **English** (`en`) — LTR.
- **Turkish** (`tr`) — LTR.

Adding a language is a content task, never a code change inside components.

## Catalog ownership

- Catalogs live at `src/apps/khalil/i18n/<locale>/<namespace>.json`.
- Namespaces follow the sub-domain layout: `identity`, `prayer`, `habit`,
  `workout`, `weight`, `mood`, `recovery`, `coach`, `analytics`, `shell`,
  `onboarding`.
- Every key uses `dot.case` and is globally unique within its namespace.

## Rules

1. **Zero string literals in TSX.** Every visible character routed through
   the i18n hook. Lint rule to be added in P0.1.
2. **No string concatenation** to build sentences. Use ICU placeholders.
3. **Pluralization** via ICU `plural` rules — never hand-rolled.
4. **Numbers and dates** routed through the shared formatter (uses
   `Intl.NumberFormat`, `Intl.DateTimeFormat`); never `.toString()`.
5. **Direction-aware**: components consume the direction from the runtime,
   never assume `rtl`.
6. **Coach output** is treated as content, not UI — the coach itself
   produces locale-appropriate text from prompt catalogs (see
   `ai-coach-philosophy.md`).
7. **Translation drift detector** runs in CI to flag any key present in
   `ar` but missing in `en` or `tr` (and vice versa).

## Switching language

Language is switched at runtime without a reload. The runtime updates:
- the `lang` and `dir` attributes on the document root,
- the active i18n catalog,
- the date/number formatter locale,
- the active font stack (Arabic naskh vs. Latin sans).

## Forbidden

- ❌ Storing localized strings in the database keyed by language column
  (use the i18n catalogs; DB stores content-only fields with locale variants).
- ❌ A Khalil-private i18n runtime. Use the kernel's.
- ❌ "Translate later" placeholder strings in production code.
