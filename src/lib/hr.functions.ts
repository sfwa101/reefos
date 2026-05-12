// HR Gateway — Wave P-D · Phase D-5.
// Sanctioned `createServerFn` handlers covering employee attendance,
// employee-side advance/petty-cash/reimbursement requests, and the
// admin/finance/branch_manager approvals flow.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AttendanceRow = {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
};

export type AdvanceKind = "advance" | "petty_cash" | "reimbursement";

export type AdvanceRequestRow = {
  id: string;
  user_id: string;
  kind: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  branch_id: string | null;
  rejection_reason: string | null;
};

export type EmployeeProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export type EmployeeHubState = {
  todayAttendance: AttendanceRow | null;
  requests: AdvanceRequestRow[];
};

const APPROVER_ROLES = ["admin", "finance", "branch_manager"] as const;

async function assertApproverRole(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => unknown },
  userId: string,
) {
  for (const role of APPROVER_ROLES) {
    try {
      const res = (await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: boolean | null; error: { message: string } | null }>
      )("has_role", { _user_id: userId, _role: role }));
      if (res.data === true) return role;
    } catch {
      // try next role
    }
  }
  throw new Response("Forbidden: approver role required", { status: 403 });
}

// ---- Employee facing ------------------------------------------------------

export const getEmployeeHubFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmployeeHubState> => {
    const { supabase, userId } = context;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            gte?: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => {
                  maybeSingle: () => Promise<{ data: AttendanceRow | null; error: { message: string } | null }>;
                };
              };
            };
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AdvanceRequestRow[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
    const [att, reqs] = await Promise.all([
      sb.from("staff_attendance")
        .select("id, check_in_at, check_out_at")
        .eq("user_id", userId)
        .gte!("check_in_at", start.toISOString())
        .order("check_in_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from("staff_advance_requests")
        .select("id, user_id, kind, amount, reason, status, created_at, branch_id, rejection_reason")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (att.error) throw new Error(att.error.message);
    if (reqs.error) throw new Error(reqs.error.message);
    return {
      todayAttendance: (att.data as AttendanceRow | null) ?? null,
      requests: (reqs.data as AdvanceRequestRow[] | null) ?? [],
    };
  });

export const checkInFn = createServerFn({ method: "POST" })
  .inputValidator((d: { branchId: string | null; lat: number | null; lng: number | null }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .from("staff_attendance")
      .insert({
        user_id: userId,
        branch_id: data.branchId,
        check_in_lat: data.lat,
        check_in_lng: data.lng,
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const checkOutFn = createServerFn({ method: "POST" })
  .inputValidator((d: { attendanceId: string; lat: number | null; lng: number | null }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          update: (v: Record<string, unknown>) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      }
    )
      .from("staff_attendance")
      .update({
        check_out_at: new Date().toISOString(),
        check_out_lat: data.lat,
        check_out_lng: data.lng,
      })
      .eq("id", data.attendanceId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const submitAdvanceRequestFn = createServerFn({ method: "POST" })
  .inputValidator((d: { branchId: string | null; kind: AdvanceKind; amount: number; reason: string }) => {
    if (!d.amount || d.amount <= 0) throw new Error("invalid_amount");
    if (!d.reason || d.reason.trim().length < 3) throw new Error("invalid_reason");
    return d;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .from("staff_advance_requests")
      .insert({
        user_id: userId,
        branch_id: data.branchId,
        kind: data.kind,
        amount: data.amount,
        reason: data.reason.trim(),
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Approver facing ------------------------------------------------------

export type AdvanceApprovalsState = {
  rows: AdvanceRequestRow[];
  profiles: Record<string, EmployeeProfileRow>;
};

export const listAdvanceRequestsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { filter: "pending" | "all" }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<AdvanceApprovalsState> => {
    const { supabase, userId } = context;
    await assertApproverRole(supabase, userId);

    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: AdvanceRequestRow[] | null; error: { message: string } | null }> & {
              eq: (c: string, v: string) => Promise<{ data: AdvanceRequestRow[] | null; error: { message: string } | null }>;
            };
          };
          in: (c: string, v: string[]) => Promise<{ data: EmployeeProfileRow[] | null; error: { message: string } | null }>;
        };
      };
    };

    const base = sb
      .from("staff_advance_requests")
      .select("id, user_id, kind, amount, reason, status, created_at, branch_id, rejection_reason")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: rowsRaw, error } = data.filter === "pending"
      ? await base.eq("status", "pending")
      : await base;
    if (error) throw new Error(error.message);
    const rows = (rowsRaw as AdvanceRequestRow[] | null) ?? [];

    const profiles: Record<string, EmployeeProfileRow> = {};
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs, error: pe } = await sb
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ids);
      if (pe) throw new Error(pe.message);
      (profs ?? []).forEach((p) => { profiles[p.id] = p; });
    }
    return { rows, profiles };
  });

export const approveAdvanceFn = createServerFn({ method: "POST" })
  .inputValidator((d: { requestId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertApproverRole(supabase, userId);
    const { error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
    )("approve_advance_request", { _request_id: data.requestId });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const rejectAdvanceFn = createServerFn({ method: "POST" })
  .inputValidator((d: { requestId: string; reason: string }) => {
    if (!d.reason || d.reason.trim().length < 1) throw new Error("invalid_reason");
    return d;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertApproverRole(supabase, userId);
    const { error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
    )("reject_advance_request", { _request_id: data.requestId, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
