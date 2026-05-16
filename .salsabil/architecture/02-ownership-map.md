# Ownership Map

Each domain has a **single sovereign owner**. Cross-domain changes require explicit handoff.

## Kernel / runtime domains (`src/core/*`)

| Domain | Path | Memory |
|---|---|---|
| Catalog | `src/core/catalog/` | `domains/catalog.md` |
| Cashier (POS) | `src/core/cashier/` | `domains/cashier.md` |
| Commerce / Cart | `src/core/commerce/` | `domains/commerce.md` |
| Orders | `src/core/orders/` | `domains/orders.md` |
| Finance / Wallet | `src/core/finance/` | `domains/finance.md` |
| Identity | `src/core/identity/` | `domains/identity.md` |
| Inventory | `src/core/inventory/` | `domains/inventory.md` |
| Logistics | `src/core/logistics/` | `domains/logistics.md` |
| Marketing | `src/core/marketing/` | `domains/marketing.md` |
| KDS | `src/core/kds/` | `domains/kds.md` |
| Vendor | `src/core/vendor/` | `domains/vendor.md` |
| Family | `src/core/family/` | `domains/family.md` |
| Hakim AI | `src/core/hakim-ai/` | `domains/hakim-ai.md` |
| Vision | `src/core/vision/` | `domains/vision.md` |
| Notifications | `src/core/notifications/` | `domains/notifications.md` |
| Analytics | `src/core/analytics/` | `domains/analytics.md` |
| Spirit | `src/core/spirit/` | `domains/spirit.md` |
| Library | `src/core/library/` | `domains/library.md` |
| Theme | `src/core/theme/` | `domains/theme.md` |
| Sections | `src/core/sections/` | `domains/sections.md` |
| Media | `src/core/media/` | `domains/media.md` |
| Search | `src/core/search/` | `domains/search.md` |
| Feeds | `src/core/feeds/` | `domains/feeds.md` |
| Capabilities | `src/core/capabilities/` | `domains/capabilities.md` |
| Runtime UI (SDUI) | `src/core/runtime-ui/` | `domains/runtime-ui.md` |
| Events | `src/core/events/` | `domains/events.md` |
| System | `src/core/system/` | `domains/system.md` |
| Khalil (transformation OS) | `src/core/khalil/` | `domains/khalil/DOMAIN_MEMORY.md` |

## Civilization apps (`src/apps/*`)

A civilization is a sovereign user-facing application that consumes
kernel domains. It MAY have its own gateway under `src/core/<civ>/`,
but its presentation layer always lives under `src/apps/<civ>/`.

| Civilization | App path | Core path | Memory |
|---|---|---|---|
| Reef Al-Madina | `src/apps/reef-al-madina/` | (multiple) | various |
| Maeen (super-app hub) | `src/apps/maeen/` | — (consumes kernel only) | `domains/maeen.md` *(pending — ADR-M001)* |
| Khalil (transformation OS) | `src/apps/khalil/` | `src/core/khalil/` | `domains/khalil/DOMAIN_MEMORY.md` |
| Asrab Tayba | `src/apps/asrab/` | *(planned)* | *(pending)* |
| Nabd Al-Hayat | `src/apps/nabd/` | *(planned)* | *(pending)* |

## Boundary rules

- A civilization MUST NOT import from another civilization
  (`src/apps/<civA>/**` → `src/apps/<civB>/**` is forbidden).
- A civilization MAY consume any kernel domain via that domain's public
  gateway (`@/core/<domain>` barrel exports — never internal paths).
- Kernel domains MUST NOT import from any civilization
  (Art. IX — Kernel Minimalism).
- `LayoutFactory` directly importing civilization components
  (`@/apps/<civ>/components/*`) is **transitional** and tracked as a
  coupling risk; the long-term target is SDUI-registry resolution.

Each domain memory is created on first material change to that domain.
The template lives at `domains/_template.md`.
