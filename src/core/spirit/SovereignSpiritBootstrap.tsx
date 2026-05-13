/**
 * SovereignSpiritBootstrap — mounts the global prayer ticker.
 * Lives inside AuthProvider so it can read the user's governorate.
 */
import { useSovereignPrayer } from "@/core-os/spirit/useSovereignPrayer";

export const SovereignSpiritBootstrap = () => {
  useSovereignPrayer();
  return null;
};

export default SovereignSpiritBootstrap;
