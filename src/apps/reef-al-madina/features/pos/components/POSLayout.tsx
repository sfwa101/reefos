/**
 * Salsabil OS — Phase 1 · Wave 7
 * Layer 6 (UI) · POSLayout.
 *
 * Pure presentational shell. Splits the POS surface into:
 *   - header chrome (mode + shift status + actions)
 *   - main canvas (catalog / morphing body)
 *   - cart sidebar (sticky on desktop, stacked on mobile/tablet)
 *
 * No data fetching, no runtime imports — slots only. Apple/MBP aesthetic:
 * generous whitespace, large hit areas, high-contrast typography.
 */
import type { ReactNode } from "react";

export interface POSLayoutProps {
  readonly header: ReactNode;
  readonly main: ReactNode;
  readonly sidebar: ReactNode;
  readonly footer?: ReactNode;
}

export function POSLayout({ header, main, sidebar, footer }: POSLayoutProps) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground flex flex-col"
      data-pos-layout
    >
      <div className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/40">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5">{header}</div>
      </div>

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-3 sm:gap-4">
          <main className="min-w-0 space-y-3 sm:space-y-4">{main}</main>
          <aside className="lg:sticky lg:top-[64px] lg:self-start lg:max-h-[calc(100vh-80px)] lg:overflow-auto space-y-3">
            {sidebar}
          </aside>
        </div>
      </div>

      {footer ? (
        <footer className="border-t border-border/40 bg-surface/40">
          <div className="max-w-[1600px] mx-auto px-4 py-2">{footer}</div>
        </footer>
      ) : null}
    </div>
  );
}
