# Article VII — Anti-Hardcoding Laws

## Forbidden in kernel and shared code

- Tenant ids, workspace ids, user ids.
- Role names, capability strings as literals outside the registry.
- Section names (`"meat"`, `"offers"`) as switch branches.
- Locale strings, currency symbols, prices, tax rates.
- Copy strings beyond placeholders.
- Magic numbers without a named constant + comment.

## Required pattern

Replace branching-on-identity with **descriptor lookup**:

```ts
// ❌
if (section === "meat") return <MeatGrid />;

// ✅
const block = blockRegistry.get(descriptor.kind);
return block.render(descriptor);
```

## Escape hatch

If a hardcode is unavoidable (vendor quirk, regulatory constant), it MUST:

1. Live in `src/core/constants/` or a domain constants file.
2. Carry a comment with rationale + ADR link.
3. Be referenced in `anti-patterns/` as a known exception.
