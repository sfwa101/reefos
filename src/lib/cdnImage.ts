/**
 * Supabase Storage CDN Image transformer.
 * Rewrites `/storage/v1/object/public/...` URLs to the on-the-fly
 * `/storage/v1/render/image/public/...` endpoint, which serves
 * resized + auto-WebP/AVIF images via the Supabase Image CDN.
 *
 * Non-Supabase URLs and data URIs are returned untouched.
 */

const OBJECT_SEG = "/storage/v1/object/public/";
const RENDER_SEG = "/storage/v1/render/image/public/";

export type CdnFormat = "origin" | "auto";

export type CdnImageOptions = {
  width?: number;
  height?: number;
  quality?: number; // 20–100
  resize?: "cover" | "contain" | "fill";
  format?: CdnFormat;
};

const isTransformable = (url: string): boolean =>
  typeof url === "string" &&
  url.length > 0 &&
  !url.startsWith("data:") &&
  url.includes(OBJECT_SEG);

export const cdnImage = (url: string | undefined, opts: CdnImageOptions = {}): string => {
  if (!url || !isTransformable(url)) return url ?? "";
  const base = url.replace(OBJECT_SEG, RENDER_SEG);
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(Math.round(opts.width)));
  if (opts.height) params.set("height", String(Math.round(opts.height)));
  if (opts.quality) params.set("quality", String(Math.max(20, Math.min(100, opts.quality))));
  if (opts.resize) params.set("resize", opts.resize);
  // `origin` keeps source format; omitting lets Supabase auto-negotiate WebP/AVIF.
  if (opts.format === "origin") params.set("format", "origin");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

/** Build a responsive srcSet string for the given widths. */
export const cdnSrcSet = (
  url: string | undefined,
  widths: number[],
  quality = 70,
): string | undefined => {
  if (!url || !isTransformable(url)) return undefined;
  return widths.map((w) => `${cdnImage(url, { width: w, quality })} ${w}w`).join(", ");
};
