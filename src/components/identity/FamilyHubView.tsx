import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Users, ShieldCheck, Wallet2, Target, Plus, Settings2, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toLatin } from "@/lib/format";
import {
  FamilyGateway,
  type FamilyContextVM,
  type FamilyGroupVM,
  type FamilyMemberVM,
  type FamilyLimitVM,
  type FamilyVaultVM,
  type FamilyRole,
} from "@/core/family";

const ROLE_LABEL: Record<FamilyRole, string> = {
  head: "وليّ الأمر",
  admin: "مشرف",
  spouse: "شريك حياة",
  child: "ابن/ابنة",
  dependent: "تابع",
};

export default function FamilyHub() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<FamilyGroupVM | null>(null);
  const [myRole, setMyRole] = useState<FamilyRole | null>(null);
  const [members, setMembers] = useState<FamilyMemberVM[]>([]);
  const [limits, setLimits] = useState<FamilyLimitVM[]>([]);
  const [vaults, setVaults] = useState<FamilyVaultVM[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editLimitFor, setEditLimitFor] = useState<FamilyMemberVM | null>(null);

  const refresh = async () => {
    if (!uid) return;
    setLoading(true);
    const ctx: FamilyContextVM = await FamilyGateway.getFamilyContext(uid);
    setGroup(ctx.group);
    setMyRole(ctx.myRole);
    setMembers(ctx.members);
    setLimits(ctx.limits);
    setVaults(ctx.vaults);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const isHead = myRole === "head" || myRole === "admin";

  const limitsByWallet = useMemo(() => {
    const map = new Map<string, FamilyLimitVM[]>();
    for (const l of limits) {
      const arr = map.get(l.wallet_id) ?? [];
      arr.push(l);
      map.set(l.wallet_id, arr);
    }
    return map;
  }, [limits]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !uid) return;
    setCreating(true);
    try {
      await FamilyGateway.createFamilyGroup(newGroupName, uid);
      toast.success("تم إنشاء المجموعة العائلية");
      setShowCreate(false);
      setNewGroupName("");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر الإنشاء";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-2xl px-4 lg:px-8 pt-6 pb-24" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-card text-card-foreground p-8 ring-1 ring-border shadow-sm text-center"
        >
          <div className="mx-auto h-14 w-14 grid place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-black">الاقتصاد العائلي السيادي</h2>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            أنشئ مجموعة عائلية لإدارة المحافظ الفرعية، وضع حدود إنفاق آمنة لأبنائك،
            وافتح حصّالات مشتركة للأهداف العائلية.
          </p>
          <Button onClick={() => setShowCreate(true)} className="mt-6">
            <Plus className="h-4 w-4 me-2" /> إنشاء مجموعة عائلية
          </Button>
        </motion.div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء مجموعة عائلية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="gname">اسم المجموعة</Label>
              <Input
                id="gname"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="عائلة الحسيني"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 lg:px-8 pt-4 pb-24 space-y-5" dir="rtl">
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
            الاقتصاد العائلي
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-black">{group.name}</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ring-primary/20">
          <ShieldCheck className="h-3 w-3" />
          {ROLE_LABEL[myRole ?? "dependent"]}
        </span>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl bg-card text-card-foreground ring-1 ring-border shadow-sm p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-extrabold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> أفراد العائلة
          </h3>
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
            {toLatin(members.length)}
          </span>
        </div>
        <ul className="space-y-2">
          {members.map((m) => {
            const memberLimits = m.wallet_id ? limitsByWallet.get(m.wallet_id) ?? [] : [];
            return (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-2xl bg-secondary/40 px-3 py-2.5 ring-1 ring-border/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    {m.role === "head" ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-extrabold truncate">
                      {m.full_name ?? "—"}
                      {m.user_id === uid && (
                        <span className="ms-1.5 text-[10px] font-bold text-primary">(أنت)</span>
                      )}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {ROLE_LABEL[m.role]}
                      {memberLimits.length > 0 && (
                        <span className="ms-1.5 text-primary">
                          · {toLatin(memberLimits.length)} حد فعّال
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {isHead && m.wallet_id && m.user_id !== uid && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditLimitFor(m)}
                    className="text-primary hover:text-primary"
                  >
                    <Settings2 className="h-4 w-4 me-1" /> الحدود
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl bg-card text-card-foreground ring-1 ring-border shadow-sm p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-extrabold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> الحصّالات المشتركة
          </h3>
        </div>
        {vaults.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-4 text-center">
            لا توجد حصّالات مشتركة بعد.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vaults.map((v) => {
              const pct = v.target_amount
                ? Math.min(100, Math.round((Number(v.current_balance) / Number(v.target_amount)) * 100))
                : 0;
              return (
                <div
                  key={v.id}
                  className="rounded-2xl bg-secondary/40 p-3 ring-1 ring-border/40"
                >
                  <p className="text-[12.5px] font-extrabold truncate">{v.name}</p>
                  <p className="mt-1 font-display text-xl font-black tabular-nums">
                    {toLatin(Number(v.current_balance).toLocaleString("en-US"))}
                    <span className="text-[10px] font-bold text-muted-foreground ms-1">ج.م</span>
                  </p>
                  {v.target_amount && (
                    <>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                        {toLatin(pct)}% من {toLatin(Number(v.target_amount).toLocaleString("en-US"))} ج.م
                      </p>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => toast("سيتم تفعيل المساهمة قريباً")}
                  >
                    <Wallet2 className="h-3.5 w-3.5 me-1" /> ساهم
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {editLimitFor && (
        <EditLimitDialog
          member={editLimitFor}
          existing={limitsByWallet.get(editLimitFor.wallet_id!) ?? []}
          onClose={() => setEditLimitFor(null)}
          onSaved={() => {
            setEditLimitFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditLimitDialog({
  member,
  existing,
  onClose,
  onSaved,
}: {
  member: FamilyMemberVM;
  existing: FamilyLimitVM[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const found = existing.find((l) => l.period === period);
    setAmount(found ? String(found.max_amount) : "");
  }, [period, existing]);

  const save = async () => {
    if (!user?.id || !member.wallet_id) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("أدخل قيمة صحيحة");
      return;
    }
    setSaving(true);
    try {
      await FamilyGateway.upsertWalletLimit({
        walletId: member.wallet_id,
        setBy: user.id,
        period,
        maxAmount: amt,
      });
      toast.success("تم حفظ الحد");
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر الحفظ";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>حدود إنفاق · {member.full_name ?? "—"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>الفترة</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as "daily" | "weekly" | "monthly")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">يومي</SelectItem>
                <SelectItem value="weekly">أسبوعي</SelectItem>
                <SelectItem value="monthly">شهري</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الحد الأقصى (ج.م)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
