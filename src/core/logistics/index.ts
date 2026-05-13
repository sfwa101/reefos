export {
  LogisticsGateway,
  FALLBACK_STANDARD_DELIVERY_METHOD,
} from "./gateway/LogisticsGateway";
export type {
  CreateAddressInput,
  SavedAddressVM,
} from "./gateway/LogisticsGateway";

// Smart logistics runtime (migrated from src/core-os/barq-logistics — Wave P-1).
export * from "./useSmartLogistics";
export { computeLogisticsQuote } from "./core/quote";
export type * from "./core/types";
