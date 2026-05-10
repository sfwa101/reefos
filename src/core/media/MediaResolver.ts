/**
 * Media pipeline — hero/gallery resolution + responsive srcset.
 * MVP: يبني srcset من URL إذا كان CDN-aware (Supabase Storage يدعم render?width=...).
 */
import type { MediaRefVM } from "@/core/catalog/types";

const SUPABASE_RENDER_RE = /\/storage\/v1\/object\/public\//;

export function resolveHero(items: readonly MediaRefVM[] | undefined): MediaRefVM | undefined {
  if (!items?.length) return undefined;
  return items.find((m) => m.kind === "hero") ?? items[0];
}

export function resolveGallery(items: readonly MediaRefVM[] | undefined): MediaRefVM[] {
  if (!items?.length) return [];
  const hero = resolveHero(items);
  return items.filter((m) => m !== hero);
}

/** يولّد srcset مناسب للـ CDN (Supabase Storage transformations). */
export function srcSet(url: string, widths: number[] = [320, 480, 768, 1024]): string | undefined {
  if (!url || !SUPABASE_RENDER_RE.test(url)) return undefined;
  const base = url.replace("/object/public/", "/render/image/public/");
  return widths.map((w) => `${base}?width=${w}&quality=75 ${w}w`).join(", ");
}

export function sizesAttr(): string {
  return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";
}
