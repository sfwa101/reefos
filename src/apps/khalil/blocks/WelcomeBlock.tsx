/**
 * Khalil — `khalil.home.welcome` block (P2.1 scaffold).
 *
 * Single placeholder block surfaced by the home orchestrator until pillar
 * sub-domains land. Owns its own visual treatment; no logic, no I/O.
 */
import { Sparkles } from "lucide-react";
import { kt } from "@/core/khalil";

export function KhalilWelcomeBlock() {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50 to-white p-6 ring-1 ring-amber-200/40 dark:from-amber-950/40 dark:via-rose-950/30 dark:to-background dark:ring-amber-900/30">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-soft">
        <Sparkles className="h-6 w-6" strokeWidth={2.2} aria-hidden />
      </span>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground">
        {kt("khalil.home.welcome")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {kt("khalil.home.phase.note")}
      </p>
    </section>
  );
}
