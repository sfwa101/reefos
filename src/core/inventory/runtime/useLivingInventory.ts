/**
 * Salsabil OS — Phase 1 · Wave 3
 * Layer 5 binding for the {@link LivingInventoryRuntime}.
 */
import { useEffect, useState } from "react";
import {
  livingInventoryRuntime as defaultRuntime,
  type InventorySnapshot,
  type InventoryView,
  type LivingInventoryRuntime,
} from "./LivingInventoryRuntime";
import type { CommerceEntity } from "@/core/commerce/entity/CommerceEntity";

export interface UseLivingInventory {
  readonly snapshot: InventorySnapshot;
  readonly canFulfill: (productId: string, qty: number) => boolean;
  readonly viewFor: (productId: string) => InventoryView | null;
}

export function useLivingInventory(
  entities: ReadonlyArray<CommerceEntity> | undefined,
  runtime: LivingInventoryRuntime = defaultRuntime,
): UseLivingInventory {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(() =>
    runtime.getSnapshot(),
  );

  useEffect(() => {
    if (entities && entities.length > 0) runtime.hydrate(entities);
  }, [entities, runtime]);

  useEffect(() => runtime.subscribe(setSnapshot), [runtime]);

  return {
    snapshot,
    canFulfill: (id, qty) => runtime.canFulfill(id, qty),
    viewFor: (id) => runtime.getView(id),
  };
}
