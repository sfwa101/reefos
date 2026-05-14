/**
 * useEntityMutation — calls the unified `admin_entity_upsert` RPC.
 * Cache invalidation is strict and ONLY runs on success.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";
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
      const { data, error } = await RuntimeUIGateway.entityUpsert({
        entity_key: input.entity_key,
        record_id: input.record_id ?? null,
        payload: input.payload,
        idempotency_key: idem,
      });
      if (error) throw error;
      return (data ?? {}) as Record<string, unknown>;
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
