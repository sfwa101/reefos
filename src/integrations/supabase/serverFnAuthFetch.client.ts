/**
 * Client-side fetch interceptor that forwards the active Supabase access
 * token to TanStack Start server functions (`/_serverFn/...`).
 *
 * `requireSupabaseAuth` reads the bearer token from the `authorization`
 * request header. Browsers don't attach Supabase sessions automatically
 * (we use localStorage persistence, not cookies), so without this shim
 * every authenticated `createServerFn` call returns 401.
 *
 * This module is `*.client.ts` so the bundler keeps it out of SSR.
 */
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    __serverFnAuthInstalled?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__serverFnAuthInstalled) {
  window.__serverFnAuthInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url && url.includes("/_serverFn/")) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers.set("authorization", `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
      }
    } catch {
      // fall through to default fetch — never break unrelated requests
    }
    return originalFetch(input, init);
  };
}

export {};
