/**
 * useSearchHistory — last 10 successful searches in LocalStorage.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "omni:search-history:v1";
const MAX_ITEMS = 10;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(items: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // quota exceeded — silent
  }
}

export interface UseSearchHistory {
  readonly history: readonly string[];
  readonly push: (term: string) => void;
  readonly remove: (term: string) => void;
  readonly clear: () => void;
}

export function useSearchHistory(): UseSearchHistory {
  const [history, setHistory] = useState<string[]>(() => read());

  useEffect(() => {
    write(history);
  }, [history]);

  const push = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())];
      return next.slice(0, MAX_ITEMS);
    });
  }, []);

  const remove = useCallback((term: string) => {
    setHistory((prev) => prev.filter((x) => x !== term));
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, push, remove, clear };
}
