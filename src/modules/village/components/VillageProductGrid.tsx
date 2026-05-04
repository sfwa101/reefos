import { memo } from "react";
import type { Product } from "@/lib/products";
import VillageProductCard from "./VillageProductCard";
import type { RoutineFrequency } from "../types";

interface Props {
  items: Product[];
  isRoutineActive: (productId: string) => boolean;
  onToggleRoutine: (id: string, discount: number, freq: RoutineFrequency) => void;
}

const VillageProductGrid = memo(function VillageProductGrid({
  items,
  isRoutineActive,
  onToggleRoutine,
}: Props) {
  if (items.length === 0) {
    return (
      <p
        className="rounded-2xl p-6 text-center text-xs"
        style={{
          background: "#FFFDF8",
          color: "#7B6A3F",
          border: "1px dashed #D9CDA4",
        }}
      >
        لا توجد منتجات تطابق المعايير المختارة
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((p) => (
        <VillageProductCard
          key={p.id}
          product={p}
          onToggleRoutine={onToggleRoutine}
          routineActive={isRoutineActive(p.id)}
        />
      ))}
    </div>
  );
});

export default VillageProductGrid;
