/**
 * ModifierOrchestrator — Universal renderer for modifier group schemas.
 * ---------------------------------------------------------------------
 * Takes a JSON list of `ModifierGroupSchema` and assembles the right
 * Atoms (Selection / Text / Quantity). Fully controlled — parent owns
 * the `state` object and receives diffs through `onChange`.
 *
 * This is the "Brain" shared across Sweets, Meat, Restaurants and any
 * future Salsabil OS app. The System Editor can attach the same JSON to
 * a product in any vertical — Asrab, Nabd, Khalil — without code changes.
 */
import type { ReactNode } from "react";
import type { ModifierGroupSchema, ModifierState } from "./types";
import { SelectionAtom } from "./atoms/SelectionAtom";
import { TextInputAtom } from "./atoms/TextInputAtom";
import { QuantityAtom } from "./atoms/QuantityAtom";

type Props = {
  groups: ModifierGroupSchema[];
  state: ModifierState;
  onChange: (groupId: string, value: string | string[] | number) => void;
};

const GroupHeader = ({
  icon,
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) => (
  <div className="mb-2 flex items-center gap-2">
    {icon && <span className="text-base leading-none">{icon}</span>}
    <h3 className="text-sm font-extrabold">
      {title}
      {hint && (
        <span className="ms-1 text-[10px] font-bold text-muted-foreground">
          {hint}
        </span>
      )}
    </h3>
  </div>
);

export const ModifierOrchestrator = ({ groups, state, onChange }: Props): ReactNode => {
  return (
    <>
      {groups.map((group) => {
        switch (group.kind) {
          case "selection":
            return (
              <section key={group.id}>
                <GroupHeader icon={group.icon} title={group.title} />
                <SelectionAtom
                  group={group}
                  value={
                    (state[group.id] as string | string[]) ??
                    (group.mode === "multi" ? [] : "")
                  }
                  onChange={(v) => onChange(group.id, v)}
                />
              </section>
            );
          case "text":
            return (
              <section key={group.id}>
                <GroupHeader icon={group.icon} title={group.title} hint={group.hint} />
                <TextInputAtom
                  group={group}
                  value={(state[group.id] as string) ?? ""}
                  onChange={(v) => onChange(group.id, v)}
                />
              </section>
            );
          case "quantity":
            return (
              <QuantityAtom
                key={group.id}
                group={group}
                value={(state[group.id] as number) ?? group.min ?? 1}
                onChange={(v) => onChange(group.id, v)}
              />
            );
          default: {
            const _exhaustive: never = group;
            void _exhaustive;
            return null;
          }
        }
      })}
    </>
  );
};
