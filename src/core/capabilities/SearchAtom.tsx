/**
 * SearchAtom — Universal Omni-Search (Phase VIII)
 * -----------------------------------------------
 * A single, multi-tenant search input that fans out to multiple Salsabil
 * domains (Reef products, Asrab trips, Nabd doctors, …) via lightweight
 * scope adapters. UI is deliberately atomic: presentation only — actual
 * fetchers are injected so this atom stays domain-agnostic.
 *
 * The atom emits `search.performed` to the central Event Bus so Hakim
 * can build intent scores across the entire OS.
 */
import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { eventBus, type SalsabilAppId } from "@/core/events";
import { Input } from "@/components/ui/input";

export type OmniScope = {
  appId: SalsabilAppId | string;
  label: string;
  /** Async fetcher returning normalized hits. Must be cancellable-safe. */
  fetch: (query: string, signal: AbortSignal) => Promise<OmniHit[]>;
};

export type OmniHit = {
  id: string;
  title: string;
  subtitle?: string;
  to: string;
  appId: SalsabilAppId | string;
};

type Props = {
  scopes: ReadonlyArray<OmniScope>;
  placeholder?: string;
  autoFocus?: boolean;
};

const DEBOUNCE_MS = 220;

function SearchAtomImpl({ scopes, placeholder = "ابحث في كل سلسبيل…", autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<OmniHit[]>([]);
  const [loading, setLoading] = useState(false);

  const stableScopes = useMemo(() => scopes, [scopes]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          stableScopes.map((s) =>
            s.fetch(term, ctrl.signal).catch(() => [] as OmniHit[]),
          ),
        );
        if (ctrl.signal.aborted) return;
        const flat = results.flat();
        setHits(flat.slice(0, 24));
        eventBus.emit("search.performed", {
          query: term,
          resultCount: flat.length,
        });
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q, stableScopes]);

  return (
    <div dir="rtl" className="w-full">
      <label className="relative flex items-center">
        <Search className="absolute right-3 h-4 w-4 text-muted-foreground" />
        {loading && (
          <Loader2 className="absolute left-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <Input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-2xl border border-border/60 bg-card/80 pr-9 pl-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>

      {q.trim().length >= 2 && (
        <div className="mt-2 max-h-72 overflow-auto rounded-2xl border border-border/60 bg-card shadow-sm">
          {hits.length === 0 && !loading ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">لا توجد نتائج</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {hits.map((h) => (
                <li key={`${h.appId}:${h.id}`}>
                  <Link
                    to={h.to}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-right hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{h.title}</div>
                      {h.subtitle && (
                        <div className="truncate text-[11px] text-muted-foreground">{h.subtitle}</div>
                      )}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {h.appId}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export const SearchAtom = memo(SearchAtomImpl);
