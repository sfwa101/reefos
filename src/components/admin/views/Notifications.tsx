import { useState } from "react";
import { Bell, Send, Users, Crown, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { broadcastNotificationFn } from "@/core/crm/crm.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type NotifRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  icon: string | null;
  created_at: string;
};

type Segment = "all" | "vip";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("العنوان مطلوب");
      const res = await broadcastNotificationFn({
        data: { title: title.trim(), body: body.trim() || null, segment },
      });
      return res.recipients;
    },
    onSuccess: (count) => {
      toast.success(`تم إرسال الإشعار إلى ${count} مستلم`);
      setOpen(false);
      setTitle("");
      setBody("");
      setSegment("all");
      qc.invalidateQueries({ queryKey: ["notifications"] });
      window.location.reload();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "فشل الإرسال"),
  });

  return (
    <>
      <UniversalAdminGrid<NotifRow>
        title="مركز الإشعارات"
        subtitle="سجل الإشعارات المرسلة للعملاء"
        metrics={[
          { key: "total", label: "إجمالي الإشعارات", icon: Bell, tone: "primary", compute: (r) => r.length },
          {
            key: "today",
            label: "اليوم",
            icon: Send,
            tone: "info",
            compute: (r) => {
              const t = new Date().toDateString();
              return r.filter((x) => new Date(x.created_at).toDateString() === t).length;
            },
          },
          {
            key: "recipients",
            label: "مستلمون مميزون",
            icon: Users,
            tone: "success",
            compute: (r) => new Set(r.map((x) => x.user_id).filter(Boolean)).size,
          },
        ]}
        topSlot={
          <Button
            onClick={() => setOpen(true)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-semibold text-[14px] shadow-soft press"
          >
            <Plus className="h-4 w-4" />
            إرسال إشعار جديد
          </Button>
        }
        dataSource={{
          table: "notifications",
          select: "id,user_id,title,body,icon,created_at",
          orderBy: { column: "created_at", ascending: false },
          limit: 300,
          searchKeys: ["title", "body"],
        }}
        searchPlaceholder="بحث في الإشعارات..."
        columns={[
          {
            key: "title",
            className: "flex-1 min-w-0",
            render: (r) => (
              <div className="min-w-0">
                <p className="font-display text-[14px] truncate">{r.title}</p>
                {r.body && <p className="text-[12px] text-foreground-secondary truncate mt-0.5">{r.body}</p>}
              </div>
            ),
          },
          {
            key: "time",
            hideOnMobile: true,
            className: "shrink-0 w-32 text-left",
            render: (r) => <span className="text-[12px] text-foreground-tertiary num">{fmtDate(r.created_at)}</span>,
          },
        ]}
        empty={{ icon: Bell, title: "لا توجد إشعارات بعد", hint: "اضغط 'إرسال إشعار جديد' لإطلاق أول حملة" }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إرسال إشعار جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الإشعار</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: عرض الجمعة الكبير 🎉"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">نص الإشعار</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="وصف مختصر للعرض..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>الشريحة المستهدفة</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => setSegment("all")}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-[13px] font-semibold press ${
                    segment === "all"
                      ? "bg-primary-soft border-primary/30 text-primary"
                      : "bg-surface border-border/50 text-foreground-secondary"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  كل العملاء
                </Button>
                <Button
                  type="button"
                  onClick={() => setSegment("vip")}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-[13px] font-semibold press ${
                    segment === "vip"
                      ? "bg-primary-soft border-primary/30 text-primary"
                      : "bg-surface border-border/50 text-foreground-secondary"
                  }`}
                >
                  <Crown className="h-4 w-4" />
                  VIP فقط
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-xl bg-surface border border-border/50 text-[13px] font-semibold press"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending || !title.trim()}
              className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold press disabled:opacity-50"
            >
              {sendMut.isPending ? "جاري الإرسال..." : "إرسال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
