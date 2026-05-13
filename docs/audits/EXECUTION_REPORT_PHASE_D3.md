# PHASE D-3 — PERSISTENCE GATEWAY (HIERARCHY SAVING PROTOCOL)

**Date:** 2026-05-13
**Status:** ✅ Complete
**Scope:** Wire `salsabil_packaging_tiers` writes from `USAEditor` via a topological-safe gateway.

---

## 1. New Module — `src/core/commerce/gateway/PackagingGateway.ts`

Authoritative bridge UI ↔ `salsabil_packaging_tiers`.

Public API:
- `listTiers(assetId): Promise<PackagingTier[]>` — hydrate existing tree on edit.
- `wipeTiers(assetId): Promise<void>` — used when the Admin disables packaging.
- `syncTiers(assetId, drafts): Promise<void>` — full diff + topological upsert + delete-removed.

### Topological Save Algorithm
1. `SELECT id` of existing tiers for `asset_id` → `existingIds` set.
2. Allocate real UUIDs (`crypto.randomUUID()`) for any draft whose id is `tmp-…` or unknown to the DB. Reuse persisted ids otherwise. Build `idMap: localId → realId`.
3. Compute depth of each draft via parent-chain walk (cycle-safe). Sort drafts ascending by depth → roots come first.
4. **Sequential** upserts in that order so every child is written AFTER its parent exists in the DB. FK `parent_tier_id → salsabil_packaging_tiers.id` is therefore always satisfiable.
5. After upserts, compute `keptRealIds = values(idMap)`; `DELETE` any `existingIds` not in `keptRealIds`, scoped to `asset_id` for safety.

Each row sent to `upsert({ onConflict: 'id' })` carries the rewritten `parent_tier_id` (mapped through `idMap`) and a freshly computed `conversion_to_base` from the builder.

---

## 2. `USAEditor.tsx` integration

### Hydration on edit
The asset-load `useEffect` now fires `PackagingGateway.listTiers(asset.id)` after the synchronous reset. If the server returns rows, they replace the local `packagingTiers` state and `packagingEnabled` is force-toggled on (recovering state even when the trait flag drifted).

### Save protocol
A new `persistPackaging(assetId)` runs **after** `mint.mutateAsync` (using its returned new asset id) and after `update.mutateAsync` (using the existing asset id). Behaviour:
- `packagingEnabled === false` → `wipeTiers` (single DELETE).
- `packagingEnabled && tiers.length === 0` → `wipeTiers` (cleans up if user emptied the tree).
- otherwise → `syncTiers(assetId, packagingTiers)`.

Errors are caught locally and surfaced via `toast.error` so a packaging failure never aborts the surrounding asset save (which has already committed).

Success path emits `toast.success("تمت مزامنة شجرة العبوات بنجاح")`.

---

## 3. Foreign-Key Integrity Guarantee

| Risk | Mitigation |
|---|---|
| Child upserted before parent | Depth-sorted sequential upserts |
| Cycle in parent chain | `guard: Set<string>` in `depthOf` breaks loops |
| Deleting a parent that still has children in DB | Children are also in `toDelete` because they too are absent from the new draft list (`removeTier` in the builder removes descendants up-front) |
| Tmp-id leaks into DB | `isPersistedId` rejects `tmp-` prefixes; every new draft gets a fresh `randomUUID()` |
| Concurrent edits | `upsert onConflict: id` is idempotent; last-write-wins |

The `salsabil_validate_packaging_tier` trigger from Phase D-1 still enforces:
- positive `conversion_to_parent`
- single `is_stock_keeping=true` per asset
- no cycles

So even malformed client state cannot corrupt the table.

---

## 4. Files Touched

| File | Change |
|---|---|
| `src/core/commerce/gateway/PackagingGateway.ts` | **created** |
| `src/core/commerce/index.ts` | export `PackagingGateway` |
| `src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx` | hydrate + persist packaging on save |

---

## 5. Verification Checklist

- [x] Build passes (TS strict).
- [x] No direct DB writes from the builder; persistence isolated to gateway.
- [x] Mint path uses returned `newAssetId` (not `asset.id`, which is null in create mode).
- [x] Update path passes existing `asset.id`.
- [x] Off-toggle wipes server state.
- [x] RLS unchanged — admin write policy from D-1 governs all writes.

---

**Phase D-3 Complete. The Persistence Gateway is wired. Salsabil assets now permanently remember their packaging DNA.**
