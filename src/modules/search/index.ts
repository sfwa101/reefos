/**
 * Public surface for the OMNI-Search module.
 */
export { SearchOverlay } from "./components/SearchOverlay";
export { RequestProductForm } from "./components/RequestProductForm";
export { BarcodeScannerSheet } from "./components/BarcodeScannerSheet";
export { useUniversalSearch } from "./hooks/useUniversalSearch";
export { useSearchHistory } from "./hooks/useSearchHistory";
export { useBarcodeScanner } from "./hooks/useBarcodeScanner";
export type { SearchHit, SearchableEntity, SearchEntityKind, ProductRequestPayload } from "./types";
