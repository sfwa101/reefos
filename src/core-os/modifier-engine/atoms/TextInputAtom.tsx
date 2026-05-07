/**
 * TextInputAtom — Free-form text input (cake messages, special notes).
 */
import { ACCENTS, type TextInputGroupSchema } from "../types";

type Props = {
  group: TextInputGroupSchema;
  value: string;
  onChange: (next: string) => void;
};

export const TextInputAtom = ({ group, value, onChange }: Props) => {
  const accent = ACCENTS[group.accent ?? "primary"];
  return (
    <textarea
      rows={group.rows ?? 2}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={group.placeholder}
      className={`w-full rounded-[14px] bg-foreground/5 px-3 py-2.5 text-sm outline-none ring-1 ring-border/40 transition focus:${accent.ring.replace("border-", "ring-")}`}
    />
  );
};
