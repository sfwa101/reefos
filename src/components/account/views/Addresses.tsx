import { useEffect, useState } from "react";
import BackHeader from "@/components/BackHeader";
import {
  MapPin, Plus, Home, Briefcase, Trash2, Loader2, Star, Building2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { deleteAddressFn, listMyAddressesFn, setDefaultAddressFn } from "@/core/identity/user.functions";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import { toLatin } from "@/lib/format";
import AddressSheet from "@/apps/reef-al-madina/features/logistics/components/AddressSheet";
import { Tracer } from "@/core/system/observability/Tracer";

type Addr = {
  id: string;
  label: string;
  city: string;
  district: string | null;
  street: string | null;
  building: string | null;
  floor: string | null;
  apartment_no: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_instructions: string | null;
  notes: string | null;
  is_default: boolean;
};

const labelIcon = (label: string) =>
  label.includes("عمل") ? Briefcase : label.includes("أخرى") ? Star : Home;

/* ============ Address Card ============ */
const AddressCard = ({
  a, onSetDefault, onRemove,
}: { a: Addr; onSetDefault: () => void; onRemove: () => void }) => {
  const Icon = labelIcon(a.label);
  const lineParts = [a.street, a.building, a.district, a.city].filter(Boolean);
  const meta = [
    a.floor ? `الدور ${a.floor}` : null,
    a.apartment_no ? `شقة ${a.apartment_no}` : null,
  ].filter(Boolean).join(" • ");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`relative overflow-hidden rounded-2xl bg-card p-4 shadow-[0_4px_18px_-10px_rgba(0,0,0,0.15)] ring-1 transition ${
        a.is_default ? "ring-2 ring-primary" : "ring-border/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${a.is_default ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-extrabold">{a.label}</p>
            {a.is_default && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground">
                افتراضي
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{lineParts.join("، ")}</p>
          {meta && <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>}
          {a.recipient_phone && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              📱 {toLatin(a.recipient_phone)}
              {a.recipient_name ? ` — ${a.recipient_name}` : ""}
            </p>
          )}
          {a.delivery_instructions && (
            <p className="mt-1 text-[11px] text-muted-foreground">📝 {a.delivery_instructions}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!a.is_default && (
              <button
                onClick={onSetDefault}
                className="rounded-full bg-foreground/5 px-3 py-1.5 text-[11px] font-extrabold text-foreground"
              >
                جعله افتراضيًا
              </button>
            )}
            <button
              onClick={onRemove}
              className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-[11px] font-extrabold text-destructive"
            >
              <Trash2 className="h-3 w-3" /> حذف
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ============ Page ============ */
const Addresses = () => {
  const { user } = useAuth();
  const { setFromAddress } = useLocation();

  const [list, setList] = useState<Addr[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listMyAddressesFn();
      setList(data as Addr[]);
    } catch (e) {
      Tracer.error("account", "addresses_load_error", { args: ["addresses load error", e] });
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  // Sync default address → global zone, on each load
  useEffect(() => {
    const def = list.find((a) => a.is_default) ?? list[0];
    if (def) setFromAddress(def.city, def.district);
  }, [list, setFromAddress]);

  const setDefault = async (id: string) => {
    if (!user) return;
    try {
      await setDefaultAddressFn({ data: { id } });
      toast.success("تم تعيين العنوان الافتراضي");
      load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "تعذّر التحديث";
      toast.error(m);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAddressFn({ data: { id } });
      toast("تم حذف العنوان");
      load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "تعذّر الحذف";
      toast.error(m);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <BackHeader title="العناوين" subtitle={`${toLatin(list.length)} عناوين محفوظة`} accent="حسابي" />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : list.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((a) => (
              <AddressCard
                key={a.id}
                a={a}
                onSetDefault={() => setDefault(a.id)}
                onRemove={() => remove(a.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center ring-1 ring-border/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MapPin className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <div>
            <p className="font-display text-base font-extrabold">لا توجد عناوين بعد</p>
            <p className="mt-1 text-xs text-muted-foreground">
              أضف عنوانك الأول وحدد موقعك على الخريطة لحساب رسوم وأوقات التوصيل بدقة.
            </p>
          </div>
        </div>
      )}

      {/* Add new — opens Map-first AddressSheet */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setSheetOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-extrabold text-primary"
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} />
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.6} />
        إضافة عنوان جديد على الخريطة
      </motion.button>

      <div className="flex items-start gap-2 rounded-2xl bg-foreground/[0.03] p-3 text-[11px] text-muted-foreground">
        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p>
          اضغط على عنوان لجعله افتراضيًا. منطقتك تحدّد رسوم وأوقات التوصيل تلقائيًا في السلة.
        </p>
      </div>

      <AddressSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={() => load()}
      />
    </div>
  );
};

export default Addresses;
