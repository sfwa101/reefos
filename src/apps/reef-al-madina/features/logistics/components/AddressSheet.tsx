/**
 * AddressSheet — Map-first BottomSheet for adding/editing an address.
 *
 * Layout: Map (top, ~45vh) + Smart Form (bottom, scrollable).
 * The form auto-fills city/district/street from Nominatim reverse-geocoding
 * whenever the pin moves (debounced 600ms).
 *
 * Stays inside the cart route — never navigates away.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Loader2, MapPin, Check, Building2, Home, Briefcase, Star } from "lucide-react";
import { toast } from "sonner";
import { LogisticsGateway } from "@/core/logistics";
import { useAuth } from "@/context/AuthContext";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { ClientOnly } from "@tanstack/react-router";
import type { BuildingType } from "@/core/logistics/core/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RealMap = lazy(() => import("./RealMap"));

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (addressId: string) => void;
}

const LABELS: { id: string; Icon: typeof Home }[] = [
  { id: "المنزل", Icon: Home },
  { id: "العمل", Icon: Briefcase },
  { id: "أخرى", Icon: Star },
];

const BUILDING_TYPES: { id: BuildingType; label: string }[] = [
  { id: "apartment", label: "شقة" },
  { id: "villa", label: "فيلا" },
  { id: "office", label: "مكتب" },
  { id: "other", label: "أخرى" },
];

export const AddressSheet = ({ open, onOpenChange, onSaved }: Props) => {
  const { user } = useAuth();
  // useHardwareBackModal(open, () => onOpenChange(false));
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [label, setLabel] = useState("المنزل");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [buildingType, setBuildingType] = useState<BuildingType>("apartment");
  const [floor, setFloor] = useState("");
  const [apartmentNo, setApartmentNo] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: geo, loading: geoLoading } = useReverseGeocode(lat, lng);

  // Auto-fill from reverse geocode (only when fields are empty/match previous geo)
  useEffect(() => {
    if (!geo) return;
    if (geo.city && !city) setCity(geo.city);
    if (geo.district && !district) setDistrict(geo.district);
    if (geo.street && !street) setStreet(geo.street);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  const reset = () => {
    setLat(null); setLng(null);
    setLabel("المنزل"); setCity(""); setDistrict(""); setStreet("");
    setBuildingType("apartment"); setFloor(""); setApartmentNo("");
    setRecipientName(""); setRecipientPhone(""); setInstructions("");
  };

  const save = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!city.trim() || !street.trim()) { toast.error("أكمل المدينة والشارع"); return; }
    if (!recipientPhone.trim()) { toast.error("رقم هاتف المستلم مطلوب"); return; }

    setSaving(true);
    const newId = await LogisticsGateway.createAddress({
      userId: user.id,
      label,
      city,
      district: district || null,
      street,
      buildingType,
      floor: floor || null,
      apartmentNo: apartmentNo || null,
      recipientName: recipientName || null,
      recipientPhone,
      instructions: instructions || null,
      lat,
      lng,
    });
    setSaving(false);

    if (!newId) { toast.error("تعذّر حفظ العنوان"); return; }
    toast.success("تم حفظ العنوان");
    onSaved?.(newId);
    onOpenChange(false);
    reset();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2 text-base font-extrabold">
            <MapPin className="h-4 w-4 text-primary" /> عنوان جديد على الخريطة
          </DrawerTitle>
        </DrawerHeader>

        {/* Map (top half) */}
        <div className="px-4 pt-3">
          <div className="h-[40vh] min-h-[260px] w-full">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-xl bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full animate-pulse rounded-xl bg-muted" />}>
                <RealMap
                  lat={lat}
                  lng={lng}
                  onPinChange={(la, ln) => { setLat(la); setLng(ln); }}
                />
              </Suspense>
            </ClientOnly>
          </div>
          {geoLoading && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> جاري التعرف على المنطقة…
            </p>
          )}
          {geo?.raw && !geoLoading && (
            <p className="mt-2 line-clamp-1 text-[11px] text-muted-foreground">📍 {geo.raw}</p>
          )}
        </div>

        {/* Smart Form (bottom half, scrollable) */}
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          {/* Label chips */}
          <div className="grid grid-cols-3 gap-2">
            {LABELS.map(({ id, Icon }) => (
              <Button
                key={id}
                type="button"
                onClick={() => setLabel(id)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-2.5 text-xs font-extrabold transition ${
                  label === id ? "border-primary bg-primary/10 text-primary" : "border-border/60"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.6} /> {id}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Inp v={city} on={setCity} ph="المدينة *" />
            <Inp v={district} on={setDistrict} ph="الحي / المنطقة" />
          </div>
          <Inp v={street} on={setStreet} ph="الشارع *" />

          {/* Building type chips */}
          <div className="grid grid-cols-4 gap-2">
            {BUILDING_TYPES.map((b) => (
              <Button
                key={b.id}
                type="button"
                onClick={() => setBuildingType(b.id)}
                className={`rounded-xl border-2 py-2 text-[11px] font-extrabold ${
                  buildingType === b.id ? "border-primary bg-primary/10 text-primary" : "border-border/60"
                }`}
              >
                {b.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Inp v={floor} on={setFloor} ph="الدور" />
            <Inp v={apartmentNo} on={setApartmentNo} ph="رقم الشقة" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Inp v={recipientName} on={setRecipientName} ph="اسم المستلم" />
            <Inp v={recipientPhone} on={setRecipientPhone} ph="هاتف المستلم *" />
          </div>

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="تعليمات للسائق (مثال: اتصل قبل الوصول)"
            rows={2}
            className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />

          <Button
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-pill active:scale-[0.99] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ العنوان
          </Button>

          <p className="flex items-start gap-1.5 pt-1 text-[10px] text-muted-foreground">
            <Building2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            البيانات تُحفظ مباشرة وتُستخدم لحساب رسوم التوصيل في السلة.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const Inp = ({ v, on, ph }: { v: string; on: (s: string) => void; ph: string }) => (
  <Input
    value={v}
    onChange={(e) => on(e.target.value)}
    placeholder={ph}
    className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm font-bold outline-none focus:border-primary"
  />
);

export default AddressSheet;
