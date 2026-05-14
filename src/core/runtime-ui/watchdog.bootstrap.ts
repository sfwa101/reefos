/**
 * Wave P-0 — Watchdog bootstrap.
 *
 * Side-effect module: importing it at the app root installs the DEV-only
 * Constitution Article 3 tripwire on the Supabase singleton. Production is
 * a no-op (the installer guards on `import.meta.env.DEV`).
 *
 * Wired from `src/routes/__root.tsx` via a single side-effect import.
 * Wave P-3 Sub-Wave 9: routed through `RuntimeUIGateway` so this module no
 * longer touches the Supabase client directly.
 */
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";

RuntimeUIGateway.installDevWatchdog();
