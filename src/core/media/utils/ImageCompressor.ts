/**
 * ImageCompressor — Universal Client-Side Compression Engine (Phase C-4).
 *
 * Constitutional law: every image entering the Empire (uploads + vision
 * inference) is shrunk to ≤ 1024px on its longest edge and re-encoded as
 * WebP (fallback JPEG) at q≈0.8. The output target is < 150 KB so:
 *   • Storage stays cheap.
 *   • Base64 round-trips through Edge Functions stay safe (no Deno OOM).
 *   • The AI Gateway accepts inline data without rejecting Storage URLs.
 *
 * Pure browser API — HTML5 Canvas + createImageBitmap. No Node deps.
 */

export interface CompressOptions {
  /** Max length of the longest edge, in CSS pixels. Default 1024. */
  readonly maxDimension?: number;
  /** Encoder quality (0–1). Default 0.8. */
  readonly quality?: number;
  /** Preferred MIME. Default "image/webp" with JPEG fallback. */
  readonly mimeType?: "image/webp" | "image/jpeg";
  /** Skip compression if the source is already below this size (bytes). */
  readonly skipBelowBytes?: number;
}

const DEFAULTS = {
  maxDimension: 1024,
  quality: 0.8,
  mimeType: "image/webp" as const,
  skipBelowBytes: 80 * 1024, // 80 KB — already tiny, don't re-encode.
};

const NON_COMPRESSIBLE = /^image\/(svg\+xml|gif)$/i;

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to HTMLImageElement */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_decode_failed"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas_blob_failed"))),
      type,
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  // Bypass: non-raster formats or already tiny payloads stay untouched.
  if (NON_COMPRESSIBLE.test(file.type)) return file;
  const skipBelow = opts.skipBelowBytes ?? DEFAULTS.skipBelowBytes;
  if (file.size > 0 && file.size <= skipBelow && file.type.startsWith("image/")) {
    return file;
  }
  if (typeof document === "undefined") return file; // SSR safety.

  const maxDim = opts.maxDimension ?? DEFAULTS.maxDimension;
  const quality = opts.quality ?? DEFAULTS.quality;
  const preferredMime = opts.mimeType ?? DEFAULTS.mimeType;

  const bitmap = await loadBitmap(file);
  const srcW = (bitmap as ImageBitmap).width;
  const srcH = (bitmap as ImageBitmap).height;
  if (!srcW || !srcH) return file;

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, dstW, dstH);

  let blob: Blob;
  let outMime = preferredMime;
  try {
    blob = await canvasToBlob(canvas, preferredMime, quality);
    // Some browsers silently fall back to PNG when WebP is unsupported.
    if (preferredMime === "image/webp" && !blob.type.includes("webp")) {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      outMime = "image/jpeg";
    }
  } catch {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    outMime = "image/jpeg";
  }

  // If the "compressed" output is somehow larger than the source, keep the source.
  if (blob.size >= file.size && file.type.startsWith("image/")) {
    return file;
  }

  const ext = outMime === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, {
    type: outMime,
    lastModified: Date.now(),
  });
}

/** Convert a Blob/File to a base64 `data:` URL — used for inline AI payloads. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("data_url_read_failed"));
    reader.readAsDataURL(blob);
  });
}
