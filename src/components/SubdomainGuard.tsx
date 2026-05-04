/**
 * Phase 10.1 — Subdomain Guard
 * ----------------------------------------------------------------
 * Splits the app into two physically-isolated UX surfaces by hostname:
 *
 *   • `admin.*`  → ONLY `/admin/**` routes are reachable. Any visit to
 *                  a customer-facing path is redirected to `/admin`.
 *   • everything else → `/admin/**` is hidden; visiting it bounces
 *                       back to `/`.
 *
 * SSR-safe: the check runs inside `useEffect`, so server renders are
 * neutral. On localhost / preview hosts (no `admin.` prefix), behaves
 * exactly like a regular customer build.
 */

import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

function getHost(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

// Production customer hosts where /admin must NEVER be exposed.
// Preview / localhost / lovable subdomains keep /admin reachable so that
// staff can QA the admin surface without switching subdomains.
const CUSTOMER_HOSTS = new Set(["reefam.com", "www.reefam.com"]);

export const SubdomainGuard = (): null => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = getHost();
    const path = location.pathname;
    const adminHost = host.startsWith("admin.");
    const customerHost = CUSTOMER_HOSTS.has(host);
    const onAdminPath = path === "/admin" || path.startsWith("/admin/");

    if (adminHost && !onAdminPath) {
      void navigate({ to: "/admin", replace: true });
      return;
    }
    if (customerHost && onAdminPath) {
      // Only the production customer apex hides the admin surface.
      void navigate({ to: "/", replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};
