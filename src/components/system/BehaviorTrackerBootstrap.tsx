import { useTrackBehavior } from "@/core-os/event-bus/useTrackBehavior";

/**
 * Headless mount — wires the global Salsabil Event Bus to the
 * `user_behavior_events` table. Must live under <AuthProvider>.
 */
export const BehaviorTrackerBootstrap = (): null => {
  useTrackBehavior();
  return null;
};
