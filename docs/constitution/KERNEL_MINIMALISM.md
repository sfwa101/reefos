# REEFOS — Kernel Minimalism

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Defines what may live in the kernel and what MUST NOT.

---

## 1. Doctrine

> **The kernel is mechanism. Policy lives outside.**

A kernel that knows about products, sections, tenants, or roles is no longer a kernel — it is a monolith.

---

## 2. What is the Kernel?

The kernel comprises:

- `src/core/runtime-ui/*` — descriptor trees, block registry, renderer
- `src/core/capabilities/*` — capability registry + resolver
- `src/core/sections/*` — section identity registry (mechanism, not section content)
- `src/core/events/*` — event catalog + bus primitives (when extracted)
- `src/core/feeds/*` — feed runtime (kind-based, no per-section branches)
- `src/core/search/*` — search registry (provider abstraction)
- `src/core/media/*` — media resolver and lazy image primitives
- `src/integrations/*` — typed clients (gateway-only consumption)

## 3. Kernel Constraints

- ✅ The kernel exposes registries, resolvers, contracts, and renderers.
- ✅ The kernel is **policy-free**: no `if (section === "meat")`, no `if (role === "vendor")`, no `if (tenant === "x")`.
- ✅ The kernel is **stateless** at module scope (no top-level I/O, no singletons holding tenant data).
- ❌ The kernel MUST NOT import from `src/apps/**`, `src/pages/**`, `src/routes/**`, or any domain UI.
- ❌ The kernel MUST NOT contain pricing math, eligibility, scoring, copy strings beyond placeholders, or workflow rules.
- ❌ The kernel MUST NOT switch on tenant, role, locale, or section — those decisions resolve via descriptors and registries.

## 4. Mechanism vs Policy — Examples

| Mechanism (kernel) | Policy (domain / config) |
|---|---|
| `blockRegistry.register(kind, component)` | which blocks compose the meat section |
| `capabilityRegistry.declare(key, descriptor)` | which capabilities a `vendor` role bundles |
| `sectionRegistry.declare(identity)` | which sections exist in a given tenant |
| `feedRuntime.run(descriptor)` | what `kind: "offers"` means for the supermarket |
| `eventBus.subscribe(name, handler)` | which side-effects follow `order.placed` |

If a kernel function has to learn a new `case` for every new section/tenant/role, the kernel is wrong.

## 5. Allowed Knowledge

The kernel MAY know about:

- the **shape** of capabilities, sections, blocks, events, descriptors;
- **error classes** and **failure contracts**;
- **tracing** primitives;
- **schema validation** primitives.

The kernel MAY NOT know:

- which products exist;
- what discounts apply;
- which roles a workspace defines;
- which AI provider is configured;
- which copy a section displays.

## 6. Extension Pattern

To add a new capability/section/block:

1. Declare a **descriptor** (data) in the appropriate registry.
2. Provide a **handler/component** that the registry can invoke.
3. Done — no kernel code change.

If your change requires editing kernel files to add a branch, **stop**: you are encoding policy into mechanism. Convert to descriptor.

## 7. Forbidden Patterns

- ❌ Tenant-aware code inside `src/core/**`.
- ❌ App-specific imports in kernel modules.
- ❌ Singletons in kernel that hold per-request data.
- ❌ Kernel functions that throw user-facing copy.
- ❌ "Temporary" hardcodes inside kernel "until we generalize".

## 8. Review Heuristic

> If you removed every domain and app from the repo, the kernel should still build, test, and run with synthetic descriptors.

Apply this heuristic to every kernel PR.

---

*A small, sharp kernel scales. A kernel that grows with every feature collapses under its own ambition.*
