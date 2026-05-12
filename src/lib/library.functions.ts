// Library Gateway — Wave P-D · Phase D-4.
// Sanctioned `createServerFn` handlers covering KYC status reads and
// cloud-print job submission (file upload + DB insert) so library UI
// no longer touches `@/integrations/supabase/client` directly.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KycStatus = "approved" | "pending" | "rejected" | "none";

export const getMyKycStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: KycStatus; verified: boolean }> => {
    const { supabase, userId } = context;
    const { data, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => {
                maybeSingle: () => Promise<{
                  data: { status: string } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      }
    )
      .from("kyc_verifications")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const status = (data?.status as KycStatus | undefined) ?? "none";
    return { status, verified: status === "approved" };
  });

export type PrintJobInput = {
  filePath: string | null;
  fileName: string | null;
  pages: number;
  copies: number;
  colorMode: "bw" | "color";
  sided: "single" | "double";
  binding: string;
  total: number;
};

export const submitPrintJobFn = createServerFn({ method: "POST" })
  .inputValidator((d: PrintJobInput) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: Record<string, unknown>) => Promise<{
            error: { message: string } | null;
          }>;
        };
      }
    )
      .from("print_jobs")
      .insert({
        user_id: userId,
        file_path: data.filePath,
        file_name: data.fileName,
        pages: data.pages,
        copies: data.copies,
        color_mode: data.colorMode,
        sided: data.sided,
        binding: data.binding,
        total: data.total,
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Upload a print file to the `print-files` storage bucket. Accepts FormData
// from the client (multipart) so the binary stream travels through the
// sanctioned server-fn channel instead of the bare browser supabase client.
export const uploadPrintFileFn = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error("FormData required");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("file field required");
    return { file };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ path: string }> => {
    const { supabase, userId } = context;
    const file = data.file;
    const path = `${userId}/${Date.now()}-${file.name}`;
    const arrayBuf = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("print-files")
      .upload(path, new Uint8Array(arrayBuf), {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
    if (error) throw new Error(error.message);
    return { path };
  });
