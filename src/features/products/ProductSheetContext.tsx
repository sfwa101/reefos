/**
 * ProductSheetContext — global mount point for SmartProductSheet so any
 * SDUI product card can open it without prop-drilling.
 */
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";
import { SmartProductSheet } from "./sheet/SmartProductSheet";

interface Ctx {
  readonly open: (p: Product) => void;
}

const ProductSheetCtx = createContext<Ctx | null>(null);

export const ProductSheetProvider = memo(({ children }: { children: ReactNode }) => {
  const [product, setProduct] = useState<Product | null>(null);

  const open = useCallback((p: Product) => setProduct(p), []);
  const close = useCallback(() => setProduct(null), []);

  const value = useMemo<Ctx>(() => ({ open }), [open]);

  return (
    <ProductSheetCtx.Provider value={value}>
      {children}
      {product && (
        <SmartProductSheet
          product={product}
          open
          onClose={close}
        />
      )}
    </ProductSheetCtx.Provider>
  );
});
ProductSheetProvider.displayName = "ProductSheetProvider";

export function useProductSheet(): Ctx {
  const ctx = useContext(ProductSheetCtx);
  if (!ctx) {
    // Soft-fail: log once and return a no-op so SDUI surfaces don't crash
    // when the provider is missing in legacy trees.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[ProductSheet] used outside ProductSheetProvider");
    }
    return { open: () => undefined };
  }
  return ctx;
}
