// Persisted favorites store: Supabase when logged in, localStorage fallback otherwise.
// Uses an external-store pattern so per-card subscriptions only re-render the
// cards whose favorite state actually flipped (huge win on the long lists).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { useAuth } from "@/context/AuthContext";

const KEY = "reef-favs-v1";

const loadLocal = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const saveLocal = (next: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
};

type Ctx = {
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => string[];
  toggle: (id: string) => Promise<void> | void;
};

const FavCtx = createContext<Ctx | null>(null);
const EMPTY: string[] = [];

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const favsRef = useRef<string[]>(EMPTY);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const emit = useCallback(() => {
    listenersRef.current.forEach((l) => l());
  }, []);

  const set = useCallback(
    (next: string[]) => {
      favsRef.current = next;
      saveLocal(next);
      emit();
    },
    [emit],
  );

  // Initial hydrate from localStorage on the client.
  useEffect(() => {
    favsRef.current = loadLocal();
    emit();
  }, [emit]);

  // Sync with cloud on auth changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        favsRef.current = loadLocal();
        emit();
        return;
      }
      const cloud = await IdentityGateway.listFavoriteIds(user.id);
      const local = loadLocal();
      const missing = local.filter((id) => !cloud.includes(id));
      if (missing.length > 0) {
        await IdentityGateway.addFavorites(user.id, missing);
      }
      if (cancelled) return;
      const merged = Array.from(new Set([...cloud, ...missing]));
      set(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, emit, set]);

  const toggle = useCallback(
    async (id: string) => {
      const current = favsRef.current;
      const isFav = current.includes(id);
      const next = isFav ? current.filter((x) => x !== id) : [...current, id];
      set(next);
      if (user) {
        if (isFav) {
          await IdentityGateway.removeFavorite(user.id, id);
        } else {
          await IdentityGateway.addFavorite(user.id, id);
        }
      }
    },
    [user, set],
  );

  const value = useMemo<Ctx>(
    () => ({
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => {
          listenersRef.current.delete(cb);
        };
      },
      getSnapshot: () => favsRef.current,
      toggle,
    }),
    [toggle],
  );

  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
};

const useFavCtx = () => {
  const v = useContext(FavCtx);
  if (!v) throw new Error("Favorites hooks must be used within FavoritesProvider");
  return v;
};

const serverSnapshot = () => EMPTY;

/** Per-id subscription — re-renders only when this id's fav state flips. */
export const useIsFavorite = (id: string) => {
  const { subscribe, getSnapshot } = useFavCtx();
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().includes(id),
    () => false,
  );
};

/** Toggle action (stable). */
export const useToggleFavorite = () => useFavCtx().toggle;

/**
 * Read the full list (for the favorites page). Re-renders on any change.
 */
export const useFavorites = () => {
  const { subscribe, getSnapshot, toggle } = useFavCtx();
  const favs = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const has = useCallback((id: string) => favs.includes(id), [favs]);
  return { favs, has, toggle };
};
