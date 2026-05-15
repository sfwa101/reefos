/**
 * WhatsApp link helpers + robust open-with-fallback.
 *
 * Why this exists:
 *   - `window.open(url, "_blank")` is silently blocked by browsers when
 *     called after `await` because the user-gesture trust is lost.
 *   - Mobile Safari, Chrome iOS, and most popup blockers will return `null`
 *     from `window.open` in that case.
 *   - Arabic text + emoji must be percent-encoded with `encodeURIComponent`,
 *     which `URL`/`URLSearchParams` does correctly.
 *
 * Strategy:
 *   1) Normalize the phone (digits only, no +/spaces).
 *   2) Build a `wa.me` URL — the most reliable cross-platform format.
 *   3) `openWhatsApp()` first redirects a pre-opened window when available,
 *      then tries mobile location navigation, then a final direct popup.
 *   4) If everything fails, return `{ ok: false, url, text }` so the UI can
 *      show a fallback dialog with copy-to-clipboard and a manual link.
 */

export type WaTarget = {
  /** International phone, digits only. e.g. "201080068689". */
  phone: string;
  /** Plain text body — will be URL-encoded. */
  text: string;
};

/** Normalize a phone number: keep digits only, drop leading +. */
export const normalizeWaPhone = (raw: string): string => {
  if (!raw) return "";
  return String(raw).replace(/\D+/g, "");
};

/** Build a wa.me URL. Encodes text safely (Arabic + emoji ok). */
export const buildWaUrl = ({ phone, text }: WaTarget): string => {
  const p = normalizeWaPhone(phone);
  const encoded = encodeURIComponent(text ?? "");
  // wa.me is the canonical short link; falls back to api.whatsapp.com on
  // some platforms automatically. Both desktop and mobile honor it.
  return p
    ? `https://wa.me/${p}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

export type OpenResult =
  | { ok: true; method: "preopened" | "window-open" | "location" }
  | { ok: false; url: string; text: string; reason: string };

/**
 * Robust WhatsApp opener using a hidden anchor click.
 * Anchor clicks survive prior `await` calls and don't trigger iframe
 * X-Frame-Options blocks (unlike `window.location.href`).
 */
export const openWhatsApp = (
  target: WaTarget,
  opts?: {
    preferLocation?: boolean;
    source?: string;
  },
): OpenResult => {
  const url = buildWaUrl(target);
  const text = target.text ?? "";
  const source = opts?.source ?? "unknown";

  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { ok: true, method: "window-open" };
  } catch (e) {
    Tracer.warn("whatsapp", "anchor_click_failed", { source, error: String(e) });
    return { ok: false, url, text, reason: "anchor_failed" };
  }
};

/** Detect mobile (iOS/Android) for routing decisions. */
export const isMobileWaContext = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/** Copy arbitrary text to clipboard with a graceful fallback. */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    Tracer.warn("whatsapp", "clipboard_api_failed", e);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
