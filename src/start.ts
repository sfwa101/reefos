/**
 * Phase 47-Alt — The Sentinel (Security Headers).
 *
 * Global request middleware that hardens every response coming out of the
 * TanStack Start Worker with strict security headers. Runs on SSR pages,
 * server functions, and server routes alike.
 *
 * What we set (and why):
 *  - Strict-Transport-Security: force HTTPS for 2 years incl. subdomains.
 *  - X-Frame-Options: prevent clickjacking via iframe embedding.
 *  - X-Content-Type-Options: stop MIME sniffing → blocks XSS via wrong types.
 *  - Referrer-Policy: leak only origin to third parties.
 *  - Permissions-Policy: disable powerful APIs we don't use (camera, mic, geo).
 *  - Content-Security-Policy: pragmatic baseline — locks down framing, base
 *    URI, object embeds, and form-action. Inline scripts are still permitted
 *    because TanStack Start ships hydration scripts; tightening to nonces is
 *    a future hardening pass.
 *
 * NOTE: Backend rate-limiting is intentionally NOT implemented here — the
 * platform lacks edge primitives (Redis/token-bucket); a Postgres counter
 * would create hot-row contention worse than the original abuse vector.
 * Phase 47-Alt instead leans on idempotency keys, client-side debounce,
 * and the Phase 46 circuit breaker for burst protection.
 */
import { createMiddleware, createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const securityHeaders = createMiddleware().server(async ({ next, request }) => {
  const result = await next();
  // Skip header injection on non-HTML/JSON streams (e.g. opaque asset
  // responses) — Cloudflare may already set their own.
  const headers = result.response?.headers;
  if (!headers) return result;

  // Phase 47-Hotfix v2 — Host-based gating. The Lovable preview is served by
  // the production Worker bundle (so import.meta.env.DEV is false), but it
  // still needs iframe embedding. Detect Lovable/localhost hosts from the
  // incoming request and relax framing only there.
  const host = new URL(request.url).hostname;
  const isLovableHost =
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev") ||
    host.includes("localhost") ||
    host === "127.0.0.1";

  // HSTS — only meaningful over HTTPS, but harmless to set in dev.
  headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  if (!isLovableHost) {
    headers.set("X-Frame-Options", "DENY");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  );
  // Pragmatic CSP — allow self + Supabase + Google Fonts + R2 image CDN.
  // Inline scripts/styles allowed for TanStack hydration; refine to nonces
  // in a follow-up phase once SSR shell is stable.
  if (!headers.has("Content-Security-Policy")) {
    const frameAncestors = isLovableHost
      ? "frame-ancestors *" // Allow all parent origins ONLY on the preview/dev hosts (fixes mobile wrapper)
      : "frame-ancestors 'none'"; // Strict lockdown on the real production host
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.lovable.app",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.app",
        frameAncestors,
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; "),
    );
  }
  void request;
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}));
