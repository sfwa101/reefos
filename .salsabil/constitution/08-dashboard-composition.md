# Article VIII — Dashboard Composition Rules

All admin/dashboard UI is **composed from descriptors**, not bespoke pages.

## Rules

- Admin pages render via `AdminBlockRenderer` over a descriptor tree.
- New admin views are added by registering a block + descriptor, not by writing a new route by hand.
- Forms, tables, filters, and actions are declared in entity definitions.
- Custom logic enters via registered handlers, not by forking the renderer.

## Forbidden

- One-off admin pages that bypass the renderer.
- Hardcoded entity lists in components.
- Direct Supabase calls from admin views (use `useEntityList` / `useEntityMutation`).

See `runtime/sdui.md` for the descriptor schema.
