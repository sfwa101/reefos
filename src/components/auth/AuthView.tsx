/**
 * Salsabil OS — Phone-First Identity Gateway (Phase 19).
 *
 * Doctrine 9.1 — Algorithmic Hydration.
 *  Step 1 (PHONE)  : Country code (+20 default) + national number.
 *                    On submit, RPC `check_phone_exists` decides:
 *                      • known number → step PIN (sign-in)
 *                      • new   number → step REGISTER (Level-1 onboarding)
 *  Step 2 (PIN)    : 6-digit PIN unlock for returning Citizens.
 *  Step 3 (REGISTER): Level-1 Resident form — name, governorate (default
 *                    "الدقهلية - جمصة"), GPS auto-locate, 6-digit PIN.
 *                    No DOB / no gender / no email — those flow later via the
 *                    KYC Soft-Wall when the user touches the Wallet.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Phone, Lock, User, Sparkles, Eye, EyeOff, MapPin, Loader2, ChevronRight, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import reefLogo from "@/assets/reef-logo.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toLatin } from "@/lib/format";
import { IdentityGateway } from "@/core/identity";
import { pathForRole, type AppRole } from "@/hooks/useUserRole";
import { EGY_GOVERNORATE_LIST } from "@/core/capabilities/identity/egyptianIdDecoder";

// Country codes (Egypt-first; others added for diaspora resilience).
const COUNTRIES = [
  { code: "+20",  flag: "🇪🇬", label: "مصر" },
  { code: "+966", flag: "🇸🇦", label: "السعودية" },
  { code: "+971", flag: "🇦🇪", label: "الإمارات" },
  { code: "+965", flag: "🇰🇼", label: "الكويت" },
  { code: "+974", flag: "🇶🇦", label: "قطر" },
  { code: "+1",   flag: "🇺🇸", label: "أمريكا" },
];

async function resolveRedirectPath(userId: string): Promise<string> {
  const primary = await IdentityGateway.getPrimaryRole(userId);
  return primary ? pathForRole(primary as AppRole) : "/";
}

type Step = "phone" | "pin" | "register";

const Auth = () => {
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  // Level-1 register fields
  const [fullName, setFullName] = useState("");
  const [governorate, setGovernorate] = useState("الدقهلية");
  const [city, setCity] = useState("جمصة");
  const [gpsBusy, setGpsBusy] = useState(false);

  const { user, loading, signInWithPhone, signUpWithPhone, checkPhoneExists } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      resolveRedirectPath(user.id).then((to) => navigate({ to, replace: true }));
    }
  }, [loading, navigate, user]);

  const fullPhone = useMemo(() => `${country}${toLatin(phone).replace(/\D/g, "")}`, [country, phone]);
  const phoneDigitsOnly = toLatin(phone).replace(/\D/g, "");

  // Step 1 — submit phone, decide route.
  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    if (phoneDigitsOnly.length < 9) { toast.error("أدخل رقم هاتف صحيح"); return; }
    setBusy(true);
    try {
      const exists = await checkPhoneExists(fullPhone);
      setStep(exists ? "pin" : "register");
    } finally {
      setBusy(false);
    }
  };

  // Step 2 — sign in with PIN.
  const submitPin = async (e: FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) { toast.error("الرقم السري ٦ أرقام"); return; }
    setBusy(true);
    try {
      const res = await signInWithPhone(fullPhone, pin);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const uid = await IdentityGateway.getCurrentUserId();
      const to = uid ? await resolveRedirectPath(uid) : "/";
      toast.success("أهلاً بعودتك");
      navigate({ to, replace: true });
    } finally { setBusy(false); }
  };

  // Step 3 — Level-1 registration.
  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) { toast.error("أدخل اسمك الكامل"); return; }
    if (pin.length < 6) { toast.error("الرقم السري ٦ أرقام"); return; }
    setBusy(true);
    try {
      const res = await signUpWithPhone(fullPhone, pin, fullName.trim(), { governorate, city });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("تم إنشاء حسابك — مرحباً بك في ريف المدينة");
      navigate({ to: "/", replace: true });
    } finally { setBusy(false); }
  };

  // GPS auto-locate → city via reverse geocode (lightweight inline call).
  const useGps = () => {
    if (!navigator.geolocation) { toast.error("الموقع غير متاح"); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14&addressdetails=1`;
        const r = await fetch(url, { headers: { "Accept-Language": "ar" } });
        const j = await r.json();
        const a = j?.address ?? {};
        const detectedCity = a.city || a.town || a.village || a.suburb || null;
        const detectedGov = a.state || null;
        if (detectedCity) setCity(detectedCity);
        if (detectedGov) setGovernorate(detectedGov);
        toast.success(detectedCity ? `تم تحديد ${detectedCity}` : "تم تحديد الموقع");
      } catch { toast.error("تعذّر تحديد الموقع"); }
      finally { setGpsBusy(false); }
    }, () => { setGpsBusy(false); toast.error("تعذّر الوصول للموقع"); });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background" dir="rtl">
      <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />

      <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft shadow-tile">
            <img src={reefLogo} alt="" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
            {step === "phone" && "أدخل رقم هاتفك"}
            {step === "pin" && "أهلاً بعودتك"}
            {step === "register" && "أنشئ حسابك"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "phone" && "هاتفك هو هويتك في ريف المدينة"}
            {step === "pin" && fullPhone}
            {step === "register" && "خطوة واحدة لتصبح من سكان ريف المدينة"}
          </p>
        </header>

        {/* STEP 1 — PHONE */}
        {step === "phone" && (
          <form onSubmit={submitPhone} className="glass-strong space-y-3 rounded-3xl p-5 shadow-tile">
            <div className="flex gap-2">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                dir="ltr"
                className="rounded-2xl border border-border/60 bg-background/80 px-2 py-3 text-sm font-bold outline-none focus:border-primary"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-muted-foreground" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="١٠٠ ١٢٣ ٤٥٦٧"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  className="w-full rounded-2xl border border-border/60 bg-background/80 py-3 pe-9 ps-4 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
            </div>
            <button type="submit" disabled={busy} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-sm font-extrabold text-primary-foreground shadow-pill transition active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {busy ? "جاري التحقّق…" : "متابعة"}
            </button>
          </form>
        )}

        {/* STEP 2 — PIN */}
        {step === "pin" && (
          <form onSubmit={submitPin} className="glass-strong space-y-3 rounded-3xl p-5 shadow-tile">
            <div className="relative">
              <Lock className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-muted-foreground" />
              <input
                value={pin}
                onChange={(e) => setPin(toLatin(e.target.value).replace(/\D/g, "").slice(0, 8))}
                placeholder="•••• ••"
                type={showPwd ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                minLength={6}
                autoFocus
                dir="ltr"
                className="w-full rounded-2xl border border-border/60 bg-background/80 py-3 pe-9 ps-10 text-center font-mono text-base tracking-[0.3em] outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-label="إظهار كلمة السر">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="submit" disabled={busy} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-sm font-extrabold text-primary-foreground shadow-pill transition active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {busy ? "جاري الدخول…" : "دخول"}
            </button>
            <button type="button" onClick={() => { setStep("phone"); setPin(""); }} className="mx-auto mt-2 block text-xs font-bold text-muted-foreground">
              تغيير الرقم
            </button>
          </form>
        )}

        {/* STEP 3 — REGISTER (Level 1) */}
        {step === "register" && (
          <form onSubmit={submitRegister} className="glass-strong space-y-3 rounded-3xl p-5 shadow-tile">
            <div className="relative">
              <User className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-muted-foreground" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الكامل"
                autoComplete="name"
                className="w-full rounded-2xl border border-border/60 bg-background/80 py-3 pe-9 ps-4 text-sm font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="flex-1 rounded-2xl border border-border/60 bg-background/80 py-3 px-3 text-sm font-bold outline-none focus:border-primary"
              >
                {EGY_GOVERNORATE_LIST.map((g) => (
                  <option key={g.code} value={g.label}>{g.label}</option>
                ))}
              </select>
              <button type="button" onClick={useGps} disabled={gpsBusy} className="inline-flex items-center justify-center rounded-2xl bg-primary/10 px-3 text-primary ring-1 ring-primary/20 transition active:scale-[0.97] disabled:opacity-60">
                {gpsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              </button>
            </div>

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="المدينة / القرية"
              className="w-full rounded-2xl border border-border/60 bg-background/80 py-3 px-4 text-sm font-bold outline-none focus:border-primary"
            />

            <div className="relative">
              <Lock className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-muted-foreground" />
              <input
                value={pin}
                onChange={(e) => setPin(toLatin(e.target.value).replace(/\D/g, "").slice(0, 8))}
                placeholder="رقم سري (٦ أرقام)"
                type={showPwd ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                minLength={6}
                dir="ltr"
                className="w-full rounded-2xl border border-border/60 bg-background/80 py-3 pe-9 ps-10 text-center font-mono text-base tracking-[0.3em] outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-label="إظهار كلمة السر">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button type="submit" disabled={busy} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-sm font-extrabold text-primary-foreground shadow-pill transition active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "جاري الإنشاء…" : "إنشاء الحساب"}
            </button>

            <button type="button" onClick={() => { setStep("phone"); setPin(""); }} className="mx-auto mt-2 block text-xs font-bold text-muted-foreground">
              تغيير الرقم
            </button>

            <p className="text-center text-[10.5px] text-muted-foreground">
              المحفظة وميزات السيادة تُفتح بعد توثيق الرقم القومي.
            </p>
          </form>
        )}

        <div className="mt-auto pt-8 text-center">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> بياناتك مشفّرة وآمنة
          </p>
        </div>
      </main>
    </div>
  );
};
export default Auth;
