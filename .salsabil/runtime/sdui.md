# Runtime: Server-Driven UI (SDUI)

Both storefront sections and admin dashboards render from **descriptors**, not bespoke components.

## Storefront

- `ui_layouts` table holds layout descriptors per page.
- `LayoutFactory` resolves and renders via `blockRegistry`.
- Adding a block = register kind + component. No renderer changes.

## Admin

- Entity definitions declare tables, forms, filters, actions.
- `AdminTableEngine` / `AdminFormEngine` render from definitions.
- New admin view = new entity definition, never a bespoke page.

## Invariants

- Descriptors are schema-validated; unknown kinds fail closed.
- No raw HTML or inline styles from the DB — only enum tokens mapped to safe classes.
- All custom logic enters via registered handlers.
