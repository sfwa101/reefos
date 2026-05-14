/**
 * Sovereign auth-user type — slim projection consumed by UI/feature code.
 * Replaces direct imports of `User` from `@supabase/supabase-js` in the
 * presentation layer (Law 2 — Supabase Sovereignty).
 */
export type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
};

export {
  IdentityGateway,
  type AppRole,
  type KycRowVM,
  type KycStatus,
  type SubmitKycInput,
  type PersonaRowVM,
  type LoyaltyProgressVM,
  type PaymentMethodVM,
} from "./gateway/IdentityGateway";
