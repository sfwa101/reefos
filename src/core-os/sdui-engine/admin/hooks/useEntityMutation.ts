/**
 * useEntityMutation — calls the unified `admin_entity_upsert` RPC.
 * Cache invalidation is strict and ONLY runs on success.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EntityUpsertInput {
  entity_key: string;
  record_id?: string | null;
  payload: Record<string, unknown>;
  idempotency_key?: string;
}

export function useEntityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EntityUpsertInput) => {
      const idem = input.idempotency_key
        ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_entity_upsert", {
        p_entity_key: input.entity_key,
        p_record_id: input.record_id ?? null,
        p_payload: input.payload,
        p_idempotency_key: idem,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "list", vars.entity_key] });
      const id = (data?.id as string | undefined) ?? vars.record_id;
      if (id) qc.invalidateQueries({ queryKey: ["admin", "record", vars.entity_key, id] });
      toast.success("تم الحفظ بنجاح");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "تعذّر الحفظ";
      toast.error(msg);
    },
  });
}
