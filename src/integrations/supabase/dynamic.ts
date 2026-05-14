/**
 * Dynamic Supabase access helpers.
 *
 * For tables / RPCs not yet present in the generated `Database` types,
 * use these typed wrappers instead of unsafe escape casts. They
 * preserve the chainable Supabase fluent surface while returning
 * `unknown` payloads at the leaves — callers must validate / narrow.
 *
 * NOTE: This file deliberately uses an internal escape only inside the
 * implementation cast (single, isolated). The public surface is fully
 * typed with `unknown` so consumers must narrow before use.
 */
import { supabase } from "./client";

export type DynamicResult<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string; details?: string } | null;
};

// A chainable proxy over PostgREST query builders. Returns `unknown` at
// the leaves; callers narrow / Zod-parse before use.
export interface DynamicQuery<T = unknown> extends PromiseLike<DynamicResult<T>> {
  select: (...args: unknown[]) => DynamicQuery<T>;
  insert: (...args: unknown[]) => DynamicQuery<T>;
  update: (...args: unknown[]) => DynamicQuery<T>;
  upsert: (...args: unknown[]) => DynamicQuery<T>;
  delete: (...args: unknown[]) => DynamicQuery<T>;
  eq: (...args: unknown[]) => DynamicQuery<T>;
  neq: (...args: unknown[]) => DynamicQuery<T>;
  in: (...args: unknown[]) => DynamicQuery<T>;
  is: (...args: unknown[]) => DynamicQuery<T>;
  gt: (...args: unknown[]) => DynamicQuery<T>;
  gte: (...args: unknown[]) => DynamicQuery<T>;
  lt: (...args: unknown[]) => DynamicQuery<T>;
  lte: (...args: unknown[]) => DynamicQuery<T>;
  like: (...args: unknown[]) => DynamicQuery<T>;
  ilike: (...args: unknown[]) => DynamicQuery<T>;
  or: (...args: unknown[]) => DynamicQuery<T>;
  not: (...args: unknown[]) => DynamicQuery<T>;
  contains: (...args: unknown[]) => DynamicQuery<T>;
  containedBy: (...args: unknown[]) => DynamicQuery<T>;
  match: (...args: unknown[]) => DynamicQuery<T>;
  filter: (...args: unknown[]) => DynamicQuery<T>;
  order: (...args: unknown[]) => DynamicQuery<T>;
  limit: (...args: unknown[]) => DynamicQuery<T>;
  range: (...args: unknown[]) => DynamicQuery<T>;
  single: () => DynamicQuery<T>;
  maybeSingle: () => DynamicQuery<T>;
  returns: <U>() => DynamicQuery<U>;
  throwOnError: () => DynamicQuery<T>;
  abortSignal: (signal: AbortSignal) => DynamicQuery<T>;
}

export interface DynamicSupabase {
  from: <T = unknown>(table: string) => DynamicQuery<T>;
  rpc: <T = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ) => DynamicQuery<T>;
  channel: (name: string) => unknown;
  removeChannel: (channel: unknown) => unknown;
}

// Single, isolated, eslint-justified cast at the implementation boundary.
// All public types above are strict (`unknown`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dynamicSb = supabase as unknown as DynamicSupabase;

/** Cast an arbitrary Supabase-like client (e.g. middleware-attached) to the
 *  dynamic surface. Use inside server functions when `context.supabase` is
 *  produced by `requireSupabaseAuth`. */
export function asDynamic(client: unknown): DynamicSupabase {
  return client as unknown as DynamicSupabase;
}

/** Typed RPC dispatcher for RPCs missing from the generated Database map. */
export async function dynamicRpc<TReturn = unknown>(
  name: string,
  args?: Record<string, unknown>,
): Promise<DynamicResult<TReturn>> {
  return dynamicSb.rpc<TReturn>(name, args);
}
