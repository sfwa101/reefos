import { Tracer } from "@/core/system/observability/Tracer";

/**
 * sanitizeAiBlocks — Phase 40 AI Sandboxing.
 *
 * Hakim's generative overlay re-orders / injects blocks BEFORE the strict
 * Zod parse. While Zod already drops blocks with unknown `type` or invalid
 * shape, this extra pass guards against payload patterns Zod permits but
 * are dangerous at render time:
 *
 *   - executable / unsafe HTML payloads (`__html`, `dangerouslySetInnerHTML`)
 *   - inline `<script>` strings
 *   - `javascript:` URLs
 *   - excessive recursion depth (props nested deeper than MAX_DEPTH)
 *
 * Any block that fails sanitization is silently stripped — never thrown.
 */

const MAX_DEPTH = 6;
const MAX_KEYS_PER_OBJECT = 64;
const FORBIDDEN_KEYS = new Set([
  "__html",
  "dangerouslySetInnerHTML",
  "__proto__",
  "constructor",
  "prototype",
]);

const SCRIPT_RE = /<\s*script\b/i;
const JS_URL_RE = /^\s*javascript:/i;

function isUnsafeString(value: string): boolean {
  if (value.length > 8000) return true;
  if (SCRIPT_RE.test(value)) return true;
  if (JS_URL_RE.test(value)) return true;
  return false;
}

function isSafe(value: unknown, depth: number): boolean {
  if (depth > MAX_DEPTH) return false;
  if (value === null || value === undefined) return true;
  const t = typeof value;
  if (t === "string") return !isUnsafeString(value as string);
  if (t === "number" || t === "boolean") return true;
  if (t === "function" || t === "symbol" || t === "bigint") return false;
  if (Array.isArray(value)) {
    if (value.length > 256) return false;
    return value.every((v) => isSafe(v, depth + 1));
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length > MAX_KEYS_PER_OBJECT) return false;
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k)) return false;
      if (!isSafe(obj[k], depth + 1)) return false;
    }
    return true;
  }
  return false;
}

/**
 * Filters a raw (pre-Zod) array of AI-augmented blocks. Non-arrays pass
 * through untouched so downstream `parseBlocks` can apply its own defence.
 */
export function sanitizeAiBlocks(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  const out: unknown[] = [];
  for (const block of raw) {
    if (!block || typeof block !== "object") continue;
    if (!isSafe(block, 0)) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        Tracer.warn("runtime-ui", "sdui_ai_block_stripped_by_sandbox", { args: ["[SDUI] AI block stripped by sandbox", {
                    id: (block as { id?: unknown }).id,
                    type: (block as { type?: unknown }).type,
                  }] });
      }
      continue;
    }
    out.push(block);
  }
  return out;
}
