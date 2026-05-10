/**
 * Runtime Renderer — يحوّل RenderDescriptor إلى JSX عبر BlockRegistry.
 *
 * الواجهات تستهلكه فقط — لا تعرف ما يُرسم بالداخل.
 * البلوكات الفعلية ستسجَّل في Wave 2.C (مع Image Pipeline + Cards).
 * هنا نوفّر الـ harness وميكانيكية fallback آمنة.
 */
import type { ComponentType } from "react";
import type { RenderBlock, RenderDescriptor } from "./types";

export type BlockComponent = ComponentType<{
  block: RenderBlock;
  context: Readonly<Record<string, unknown>>;
}>;

class BlockRegistryClass {
  private map = new Map<string, BlockComponent>();

  register(kind: string, component: BlockComponent): void {
    this.map.set(kind, component);
  }

  registerMany(entries: Record<string, BlockComponent>): void {
    for (const [k, c] of Object.entries(entries)) this.map.set(k, c);
  }

  get(kind: string): BlockComponent | undefined {
    return this.map.get(kind);
  }
}

export const blockRegistry = new BlockRegistryClass();

function MissingBlock({ kind }: { kind: string }) {
  if (import.meta.env.DEV) {
    return (
      <div className="rounded-xl border border-dashed border-warning/50 bg-warning/5 p-3 text-[12px] text-warning">
        Block <code>{kind}</code> not registered.
      </div>
    );
  }
  return null;
}

export function RuntimeRenderer({ descriptor }: { descriptor: RenderDescriptor }) {
  return (
    <>
      {descriptor.blocks.map((b) => {
        const C = blockRegistry.get(b.kind);
        if (!C) return <MissingBlock key={b.id} kind={b.kind} />;
        return <C key={b.id} block={b} context={descriptor.context} />;
      })}
    </>
  );
}
