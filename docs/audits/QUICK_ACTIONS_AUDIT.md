# Quick Actions & Dashboard FAB — Constitutional Audit

**Wave:** Post R-1 · Reconnaissance only (zero source mutations)
**Auditor:** Supreme Constitutional Auditor
**Scope:** Admin Home Dashboard (`/admin`), the global "+" FAB (`SmartActionComposer`), and the Hakim FAB. All routes referenced below were verified to exist in `src/routes/`.

---

## 1. Executive Summary

The mobile Admin Home renders three layers of quick actions:

| Layer | Component | File | Status |
|---|---|---|---|
| Mobile bento "Quick Actions" grid (4 tiles) | inline JSX inside `Dashboard.tsx` | `src/pages/admin/Dashboard.tsx:212-228` | **3 of 4 broken** — links to `/admin/assets` (deleted in Hub migration) and other partially-correct routes |
| Action queues (3 launch cards) | inline JSX inside `Dashboard.tsx` | `src/pages/admin/Dashboard.tsx:332-377` | ✅ Healthy — wired to real routes (`/admin/payouts`, `/admin/topup-approvals`, `/admin/kyc`) |
| Global "+" FAB · Smart Action Composer | `SmartActionComposer.tsx` | `src/components/admin/SmartActionComposer.tsx` | **5 of 6 actions broken** — open the placeholder modal "محرر … قيد التهيئة" instead of routing or invoking a server fn |
| Hakim "✨" FAB | `HakimFAB.tsx` | `src/components/admin/HakimFAB.tsx` | ✅ Functional, but contains a **constitutional violation**: direct `supabase` import in UI |

Net: **8 broken / placeholder buttons** + **1 Article-3a violation** in dashboard chrome.

---

## 2. Broken Buttons — Itemised

### 2.1 SmartActionComposer (the "+" FAB)

File: `src/components/admin/SmartActionComposer.tsx`
Root cause: every action except `new-product` falls through to a static placeholder branch that prints the Arabic string `"قيد التهيئة"` (line 178). No router push, no server fn, no composer.

| # | Action key | Arabic label | Defined at line | Current behaviour | Proposed fix |
|---|---|---|---|---|---|
| 1 | `new-human` | إضافة إنسان جديد | 38–43 (used in `reef`, `tayseer`, `noor_eldin`, `family`, `global`) | Opens placeholder modal | Route to `/admin/humans` (list view exists at `src/routes/admin.humans.tsx`) **or** open a focused `HumanComposer` invoking `createHumanFn` from `src/lib/crm.functions.ts` |
| 2 | `supplier-collect` | تحصيل من مورد | 49, 57, 73 | Placeholder | Route to `/admin/suppliers` for picker, then call a `recordSupplierCollectionFn` (to be added to `src/lib/finance.functions.ts`); alternatively open inline composer pre-filled by Hakim |
| 3 | `expense` | إضافة مصروف / تسجيل مصروف | 50, 55, 67, 72 | Placeholder | Route to `/admin/expenses` (exists) **or** mount `ExpenseComposer` invoking `createExpenseFn` in `src/lib/finance.functions.ts` |
| 4 | `stock-in` | استلام مخزون | 51, 74 | Placeholder | Route to `/admin/inventory` (exists) and open the receive-stock drawer; backend already covered by `recordStockMovementFn` in `src/lib/admin-catalog.functions.ts` |
| 5 | `wallet-topup` | شحن محفظة | 56, 66 | Placeholder | Route to `/admin/wallets` (exists) with `?intent=topup` query param consumed by `Wallets.tsx`; server-side via existing wallet topup approval flow (`/admin/topup-approvals`) |
| 6 | `enroll` | تسجيل متعلم | 61 (workspace=`noor_eldin`) | Placeholder | Out-of-scope for Wave R-1 (Noor Eldin app). Mark as "future" until that app's server fns land. |
| 7 | `mentor` | إسناد مرشد | 62 (workspace=`noor_eldin`) | Placeholder | Same as `enroll` — defer. |

Note ✅: `new-product` (line 30) is correctly wired — `handlePick` short-circuits and opens `<SmartProductComposer/>`.

---

### 2.2 Mobile Quick-Actions grid (Dashboard.tsx)

File: `src/pages/admin/Dashboard.tsx`, lines **212–228**.

| # | Tile | `to` prop | Status | Proposed fix |
|---|---|---|---|---|
| 8 | الطلبات | `/admin/orders` | ✅ Valid | — |
| 9 | الأصول | `/admin/assets` | **BROKEN** — route was removed when "الأصول" tab was replaced by the Admin Hub. Renders the global 404. | Re-point to `/admin/hub` (the new Engines hub) **or** to `/admin/inventory`. Recommended: `/admin/hub` for parity with bottom nav. |
| 10 | العملاء | `/admin/customers` | ✅ Valid | — |
| 11 | المحافظ | `/admin/wallets` | ✅ Valid | — |

---

### 2.3 Action queues row (Dashboard.tsx)

File: `src/pages/admin/Dashboard.tsx`, lines **332–377**.
All three (`/admin/payouts`, `/admin/topup-approvals`, `/admin/kyc`) resolve to existing routes. **No fixes required.**

---

## 3. Constitutional Violations Surfaced During Audit

| # | File | Line | Article | Violation | Remediation |
|---|---|---|---|---|---|
| V-1 | `src/components/admin/HakimFAB.tsx` | 5, 51–60 | **Article 3a** (no direct Supabase imports in UI) | Imports `supabase` client; calls `supabase.auth.getSession()` and `fetch`s `/functions/v1/hakim-chat` directly from a presentational FAB | Move streaming logic into the existing `useHakimChatStream` hook (`src/hooks/useHakimChatStream.ts` — built in Wave R-1 Batch 6); FAB becomes a pure consumer of `{ messages, send, streaming }`. |

No violations introduced by `SmartActionComposer.tsx` — it is currently pure presentation (the placeholders just don't *do* anything). Wiring the actions per §2.1 must therefore go through server functions, never the raw client.

---

## 4. Recommended Remediation Plan (Wave R-2 candidate)

1. **Hot-fix the broken `/admin/assets` link** in `Dashboard.tsx` line ~219 → `/admin/hub`. (1 line.)
2. **Wire the 5 in-scope composer actions** in `SmartActionComposer.tsx`:
   - Add an optional `route?: string` field to the `Action` type.
   - In `handlePick`, prefer `route` (use `useNavigate` from `@tanstack/react-router`) before falling back to a real composer or — as a last resort during transition — the existing placeholder.
   - Map: `new-human → /admin/humans`, `supplier-collect → /admin/suppliers`, `expense → /admin/expenses`, `stock-in → /admin/inventory`, `wallet-topup → /admin/wallets?intent=topup`.
3. **Replace placeholder branch** with a focused composer per action (Hakim-pre-filled), invoking server fns already authored in Wave R-1 (`crm.functions.ts`, `finance.functions.ts`, `admin-catalog.functions.ts`).
4. **Defer `enroll` / `mentor`** until Noor Eldin server fns exist; gate them behind a "قريباً" badge instead of a broken modal.
5. **Refactor `HakimFAB.tsx`** to consume `useHakimChatStream` and remove the direct `supabase` import (Article 3a compliance).

---

## 5. Files Touched by This Audit

- **Read:** `src/pages/admin/Dashboard.tsx`, `src/components/admin/SmartActionComposer.tsx`, `src/components/admin/HakimFAB.tsx`, `src/routes/admin.*.tsx` (route inventory).
- **Created:** `docs/audits/QUICK_ACTIONS_AUDIT.md` (this file).
- **Modified source:** none. ✅ Read-only constraint upheld.
