/**
 * Khalil — block registry boot.
 *
 * Registers `khalil.*` block ids with the shared `blockRegistry` so the
 * RuntimeRenderer can resolve them. Imported once from the Khalil shell.
 * Per Art. IX (kernel minimalism) the shared registry stays domain-agnostic;
 * Khalil registers its own blocks at boot.
 */
import { blockRegistry } from "@/core/runtime-ui";
import { KhalilWelcomeBlock } from "./WelcomeBlock";

let registered = false;

export function registerKhalilBlocks(): void {
  if (registered) return;
  blockRegistry.register("khalil.home.welcome", () => <KhalilWelcomeBlock />);
  registered = true;
}
