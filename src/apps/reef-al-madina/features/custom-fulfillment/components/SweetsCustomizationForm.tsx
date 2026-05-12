/**
 * SweetsCustomizationForm — now a thin wrapper around the Universal
 * Modifier Engine (Salsabil OS Kernel). Same external API; the "brain"
 * is delegated to ModifierOrchestrator (TextInputAtom + QuantityAtom).
 */
import { useMemo } from "react";
import {
  ModifierOrchestrator,
  type ModifierGroupSchema,
} from "@/core-os/modifier-engine";

type Props = {
  note: string;
  onNoteChange: (v: string) => void;
  qty: number;
  onQtyChange: (v: number) => void;
  isBooking: boolean;
};

export const SweetsCustomizationForm = ({
  note, onNoteChange, qty, onQtyChange, isBooking,
}: Props) => {
  const groups = useMemo<ModifierGroupSchema[]>(
    () => [
      {
        kind: "text",
        id: "note",
        title: "ملاحظة خاصة",
        hint: "(اختياري)",
        icon: "💬",
        accent: "violet",
        rows: 2,
        placeholder: isBooking
          ? "مثال: اكتب «عيد ميلاد سعيد - أحمد» على التورتة"
          : "أي طلب خاص؟",
      },
      {
        kind: "quantity",
        id: "qty",
        title: "الكمية",
        min: 1,
        accent: "violet",
      },
    ],
    [isBooking],
  );

  const state = { note, qty };

  return (
    <ModifierOrchestrator
      groups={groups}
      state={state}
      onChange={(id, value) => {
        if (id === "note") onNoteChange(value as string);
        else if (id === "qty") onQtyChange(value as number);
      }}
    />
  );
};
