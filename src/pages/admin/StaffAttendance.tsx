import { Clock, LogIn, LogOut, Users } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtNum, fmtRelative } from "@/lib/format";

interface AttendanceRow {
  id: string;
  user_id: string;
  branch_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
}

export default function StaffAttendance() {
  return (
    <UniversalAdminGrid<AttendanceRow>
      title="حضور وانصراف الموظفين"
      subtitle="مراقبة جلسات العمل اليومية لكل فروع ريف المدينة"
      dataSource={{
        table: "staff_attendance",
        select: "id,user_id,branch_id,check_in_at,check_out_at,notes",
        orderBy: { column: "check_in_at", ascending: false },
        limit: 300,
        searchKeys: ["user_id", "notes"],
      }}
      metrics={[
        {
          key: "active",
          label: "موظفون داخل الوردية",
          icon: LogIn,
          tone: "success",
          compute: (rows) => fmtNum(rows.filter((r) => !r.check_out_at).length),
          urgent: (rows) => rows.some((r) => !r.check_out_at),
        },
        {
          key: "today",
          label: "تسجيلات اليوم",
          icon: Clock,
          tone: "info",
          compute: (rows) => {
            const today = new Date().toDateString();
            return fmtNum(rows.filter((r) => new Date(r.check_in_at).toDateString() === today).length);
          },
        },
        {
          key: "checkout",
          label: "انصرافات اليوم",
          icon: LogOut,
          tone: "warning",
          compute: (rows) => {
            const today = new Date().toDateString();
            return fmtNum(
              rows.filter((r) => r.check_out_at && new Date(r.check_out_at).toDateString() === today).length,
            );
          },
        },
        {
          key: "total",
          label: "إجمالي السجلات",
          icon: Users,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
      ]}
      columns={[
        {
          key: "user",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate num">#{r.user_id.slice(0, 8).toUpperCase()}</p>
              <p className="text-[11px] text-foreground-tertiary num">دخول: {fmtRelative(r.check_in_at)}</p>
              {r.notes && <p className="text-[11px] text-foreground-secondary truncate">{r.notes}</p>}
            </div>
          ),
        },
        {
          key: "checkout",
          className: "shrink-0 text-left",
          hideOnMobile: true,
          render: (r) => (
            <p className="text-[12px] num text-foreground-secondary">
              {r.check_out_at ? `خروج: ${fmtRelative(r.check_out_at)}` : "—"}
            </p>
          ),
        },
        {
          key: "status",
          className: "shrink-0",
          render: (r) => (
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                (r.check_out_at ? "bg-success/10 text-success" : "bg-warning/10 text-warning")
              }
            >
              {r.check_out_at ? "انصرف" : "داخل الوردية"}
            </span>
          ),
        },
      ]}
      empty={{ title: "لا توجد سجلات حضور بعد", hint: "ستظهر الجلسات بمجرد تسجيل أول موظف دخوله." }}
    />
  );
}
