/**
 * Server functions — Section identity reads.
 *
 * تُرجع SectionIdentity جاهزة (مع capabilities) من DB. لا تُسرّب أعمدة DB
 * للواجهة. مصدر وحيد لتعريف القسم في الـ runtime.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resolveSectionIdentity } from "./SectionIdentityResolver";
import type { SectionIdentity } from "./types";

const SlugSchema = z.object({ slug: z.string().min(1).max(64) });

export const getSectionIdentityFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SlugSchema.parse(input))
  .handler(async ({ data }): Promise<SectionIdentity | null> => {
    const { data: row, error } = await supabase
      .from("sections")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const { data: caps } = await supabase
      .from("section_capabilities")
      .select("capability_key")
      .eq("section_id", row.id);
    const capabilities = (caps ?? []).map((c) => c.capability_key);
    return resolveSectionIdentity(row, capabilities);
  });

export const listSectionsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SectionIdentity[]> => {
    const { data: rows, error } = await supabase
      .from("sections")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (!rows?.length) return [];
    const { data: caps } = await supabase
      .from("section_capabilities")
      .select("section_id, capability_key");
    const map = new Map<string, string[]>();
    for (const c of caps ?? []) {
      const list = map.get(c.section_id) ?? [];
      list.push(c.capability_key);
      map.set(c.section_id, list);
    }
    return rows.map((r) => resolveSectionIdentity(r, map.get(r.id) ?? []));
  },
);
