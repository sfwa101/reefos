export {
  CAP,
  capabilityRegistry,
  type CapabilityKey,
  type CapabilityDescriptor,
} from "./CapabilityRegistry";

export { SearchAtom, type OmniScope, type OmniHit } from "./SearchAtom";
export { useSovereignContext, type PersonaRow, type WorkspaceKind } from "./store/useSovereignContext";
export {
  decodeEgyptianId,
  normalizeIdInput,
  EGY_GOVERNORATES,
  EGY_GOVERNORATE_LIST,
  type DecodedEgyptianId,
  type DecodedGender,
} from "./identity/egyptianIdDecoder";
export { default as KycUpgradeGate } from "./identity/KycUpgradeGate";
export { reefScope } from "./scopes/reefScope";
