## Phase 14.03 — Master ID & Smart Role Switcher

Goal: turn `AccountTierCard` into a premium identity hub displaying a bank-style Customer ID, plus a glass `RoleSwitcher` dropdown for users with multiple roles (admin / delivery / vendor / staff …).

### 1. New hook — `src/hooks/useUserRoles.ts` (plural)

The current `useUserRole` returns only the highest-priority role. We need the full list for the switcher.

- Returns `{ roles: AppRole[]; primary: AppRole; branchId; loading }`.
- Same query as `useUserRole` but keeps the full sorted array.
- `useUserRole` keeps working unchanged (back-compat).

### 2. Customer ID derivation — `src/features/account/lib/customerId.ts`

- `formatCustomerId(uuid: string): string` → take the first 12 hex chars of the user's UUID, uppercase, format as `2050 8800 6600` style (groups of 4, padded with leading "20" prefix). Pure function, deterministic, no DB call.
- Also export `toBankGroups(s, size=4)` helper.

### 3. New stem-cell — `src/features/account/components/RoleSwitcher.tsx`

Props: `{ roles: AppRole[]; currentView: "customer" | role; }`.

Behavior:
- If `roles.length <= 1` (only customer): render a static premium `ID · 2050 8800 6600` chip — no chevron, no dropdown.
- If multiple roles: render the same chip with a `ChevronDown` and wrap in shadcn `DropdownMenu`.
- Menu items derived from a small map:

  ```
  customer       → "واجهة العميل"  /         🏠
  delivery       → "واجهة المندوب" /driver   🚚
  vendor         → "واجهة البائع"  /vendor   🏪
  admin/manager  → "لوحة الإدارة"  /admin    ⚙️
  cashier        → "نقطة البيع"    /pos      💳
  staff          → "بوابة الموظف"  /employee 👔
  ```

- Selecting an item calls `useNavigate()({ to: path })` AND persists the choice in `localStorage` under `reef.activeView`.
- Styling: `DropdownMenuContent` overridden with `bg-background/70 backdrop-blur-xl border-border/40 shadow-xl rounded-2xl` — Apple glass.
- Typography: `font-mono tracking-[0.25em] text-[11px] opacity-90` for the ID line, mimicking engraved card numbers. Wrapped in `bg-foreground/15 ring-1 ring-foreground/20 rounded-md px-2 py-1`.

All colors via tokens (`foreground/`, `background/`) — zero hardcoded HSL.

### 4. Wire into `AccountTierCard.tsx`

Replace the existing top-left badge:

```
<span>REEF · MEMBER</span>
```

with:

```
<RoleSwitcher roles={roles} currentView="customer" />
```

`AccountTierCard` receives `roles` + `customerId` as new props (keeps it dumb). `Account.tsx` reads them via `useUserRoles()` and `formatCustomerId(user.id)` and passes them down. The Sparkles "REEF · MEMBER" chip moves to a smaller secondary badge or is removed (to avoid duplication) — final card keeps tier badge on the right untouched.

### 5. Smart Default View — `src/lib/defaultView.ts` + root redirect

- Helper `pickDefaultPath(roles, savedView)`:
  - If `savedView` exists in localStorage → return its path.
  - Else if roles include `delivery` → `/driver`.
  - Else if roles include `vendor` → `/vendor`.
  - Else if roles include any admin-tier → `/admin`.
  - Else → `/` (customer).
- Hook this into `src/routes/_app/index.tsx` (or `Home.tsx` mount): on first visit after login, if user has a non-customer role and no `reef.activeView` saved, `navigate({ to: pickedPath, replace: true })`. Customers are never redirected.
- The role switcher in the account page is the user's escape hatch back to `/` (writes `reef.activeView = "customer"`).

### 6. Files

Created:
- `src/hooks/useUserRoles.ts`
- `src/features/account/lib/customerId.ts`
- `src/features/account/components/RoleSwitcher.tsx`
- `src/lib/defaultView.ts`

Edited:
- `src/features/account/components/AccountTierCard.tsx` — accept `roles`, `customerId`; replace static badge.
- `src/pages/Account.tsx` — fetch roles + customerId, pass through.
- `src/routes/_app/index.tsx` — smart default redirect on mount.

### 7. Strictness

- `roles: AppRole[]` typed; all icons typed `LucideIcon`. Zero `any`.
- All colors via CSS variables / tailwind tokens.
- `tsc --noEmit` must pass.
