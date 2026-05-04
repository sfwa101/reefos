/**
 * OMNI-Search Engine — shared types
 * ----------------------------------
 * Federated search across products, restaurants, and services.
 */

export type SearchEntityKind = "product" | "restaurant" | "service";

export interface SearchableEntity {
  /** Stable composite id: `${kind}:${rawId}` */
  readonly id: string;
  readonly kind: SearchEntityKind;
  readonly rawId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly category?: string;
  readonly keywords?: string;
  readonly image?: string;
  /** Optional barcode for products (used by `searchByBarcode`). */
  readonly barcode?: string;
  /** Optional href for direct navigation from search results. */
  readonly href: string;
}

export interface SearchHit extends SearchableEntity {
  readonly score: number;
}

export interface ProductRequestPayload {
  readonly product_name: string;
  readonly description: string | null;
  readonly barcode: string | null;
  readonly image_url: string | null;
  readonly whatsapp: string | null;
}
