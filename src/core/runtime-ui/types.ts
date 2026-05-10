/**
 * Runtime UI — Render Descriptor Tree.
 *
 * شجرة بلوكات نقية (لا React) تصف ماذا يجب أن يُعرض.
 * RuntimeRenderer يحوّلها لـ JSX بدون if/else ضخمة.
 */

export interface RenderBlock {
  /** مفتاح بلوك مسجّل في BlockRegistry. */
  kind: string;
  /** id فريد ضمن الشجرة. */
  id: string;
  /** props ديناميكية للبلوك. */
  props?: Readonly<Record<string, unknown>>;
  /** بلوكات أبناء (للـ containers). */
  children?: RenderBlock[];
}

export interface RenderDescriptor {
  /** سياق هذه الشجرة (e.g. section_slug, view = "list" | "details"). */
  context: Readonly<Record<string, unknown>>;
  blocks: RenderBlock[];
}
