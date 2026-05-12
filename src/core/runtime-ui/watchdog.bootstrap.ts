/**
 * Wave P-0 — Watchdog bootstrap.
 *
 * Side-effect module: importing it at the app root installs the DEV-only
 * Constitution Article 3 tripwire on the Supabase singleton. Production is
 * a no-op (the installer guards on `import.meta.env.DEV`).
 *
 * Wired from `src/routes/__root.tsx` via a single side-effect import.
 * `client.ts` is auto-generated and MUST NOT be edited; this is the
 * sanctioned injection point.
 */
import { supabase } from "@/integrations/supabase/client";
import { installSupabaseUiWatchdog } from "@/core/runtime-ui/watchdog";

installSupabaseUiWatchdog(supabase);
