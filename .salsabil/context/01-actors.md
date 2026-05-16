# Actors

| Actor | Description | Typical capabilities |
|---|---|---|
| **Customer** | End user of the storefront. | `member.*` |
| **Cashier** | Operates the POS. | `reef.pos.*` |
| **Vendor** | Manages catalog/orders for a vendor workspace. | `vendor.*` |
| **Driver** | Fulfills deliveries. | `logistics.driver.*` |
| **Operator** | Back-office admin. | `operator.*` |
| **Sovereign** | Platform admin with override authority. | `sovereign.*` (audited) |
| **System** | Scheduled jobs, webhooks, background workers. | scoped per job |
| **AI Advisor** | Hakim and other models. | read-only / propose-only |

Capability sets are resolved server-side per `(user_id, workspace_id)`.
