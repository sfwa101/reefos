/**
 * Khalil — generic sub-route placeholder (P2.1).
 *
 * Used for prayer / habits / workout / weight / insights / coach until
 * their owning capabilities land in P2.2+. Single source = no per-page
 * bespoke logic.
 */
import { kt } from "@/core/khalil";
import { KhalilEmpty } from "../primitives/StateViews";

export function KhalilPlaceholderPage({ titleKey }: { titleKey: string }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt(titleKey)}
        </h1>
      </header>
      <KhalilEmpty body={kt("khalil.placeholder.coming_soon")} />
    </div>
  );
}
