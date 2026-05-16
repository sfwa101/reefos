# Khalil — P1 i18n Runtime Strategy

## Rule zero (Art. VII)

> Zero Arabic, English, or Turkish literals embedded in TSX. Ever.
> Every visible string is a translation key.

## Languages

| Locale | Direction | MVP status |
|---|---|---|
| `ar` | RTL | **required at launch** (default) |
| `en` | LTR | runtime ready, catalog empty in MVP |
| `tr` | LTR | runtime ready, catalog empty in MVP |

EN/TR catalogs land in P3. The runtime must be ready from day one so that
adding a language is a content task, not an engineering task.

## Catalog ownership

- Khalil owns its own catalogs under `src/apps/khalil/i18n/<locale>/<area>.json`.
- Shared kernel strings are NEVER duplicated into Khalil catalogs.
- Coach prompt strings live in a **server-side** registry (not in client
  catalogs) so model context never depends on shipped bundles.

## Key naming

`khalil.<area>.<surface>.<element>` — flat, predictable, machine-greppable.
Example: `khalil.prayer.today.fajr.cta_log`.

## Hot switching

Locale change must NOT require a reload. Router context exposes `locale`;
i18n runtime re-renders on change; query cache is keyed by locale where
strings affect server-formed responses (e.g. coach proposals).

## Direction handling

- All Khalil layouts use logical CSS properties (`margin-inline-start`, etc.).
- Icons that imply direction (arrows) flip via `dir`-aware utilities.
- Charts/heatmaps that read left-to-right by convention stay LTR even in
  Arabic; only labels translate.

## Forbidden

- ❌ `t("Some Arabic string")` — keys only.
- ❌ Concatenating translated fragments (`t("hello") + " " + name`).
  Use ICU message format.
- ❌ Inlining copy in error toasts, dialog titles, button labels, alt text.
- ❌ Per-component locale subscriptions; use the kernel hook.
