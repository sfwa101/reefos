/**
 * Phase 65 — Capability Guard.
 *
 * <CapabilityGuard cap="reef.pos.refund">…</CapabilityGuard>
 *
 * Renders children when the active workspace grants `cap` (admins always
 * pass). While the capability set is hydrating, renders the optional
 * `loadingFallback` (default: nothing — prevents UI flash).
 */
import type { ReactNode } from "react";
import { useCapability } from "@/hooks/useCapability";

type Props = {
  cap: string;
  /** Rendered when the user lacks the capability. */
  fallback?: ReactNode;
  /** Rendered while the capability set is loading. */
  loadingFallback?: ReactNode;
  children: ReactNode;
};

export function CapabilityGuard({ cap, fallback = null, loadingFallback = null, children }: Props) {
  const { allowed, loading } = useCapability(cap);
  if (loading) return <>{loadingFallback}</>;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

export default CapabilityGuard;
