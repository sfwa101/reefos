import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CircleAlert, LockKeyhole, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import BackHeader from "@/components/BackHeader";
import { useAuth } from "@/context/AuthContext";
import { getMyProfileFn, updateMyProfileFn } from "@/core/identity/user.functions";

import { AVATAR_GALLERY } from "@/apps/reef-al-madina/features/account/profile/data";
import { EMPTY_FORM, type DbProfile, type PageState, type ProfileForm, type SaveState, type TabKey } from "@/apps/reef-al-madina/features/account/profile/types";
import { buildForm, extractPhoneFromPseudoEmail } from "@/apps/reef-al-madina/features/account/profile/utils";
import { ProfileHero } from "@/apps/reef-al-madina/features/account/profile/components/ProfileHero";
import { ProfileTabsNav } from "@/apps/reef-al-madina/features/account/profile/components/ProfileTabsNav";
import { ProfileSaveBar } from "@/apps/reef-al-madina/features/account/profile/components/ProfileSaveBar";
import { IdentityTab } from "@/apps/reef-al-madina/features/account/profile/components/IdentityTab";
import { LifestyleTab } from "@/apps/reef-al-madina/features/account/profile/components/LifestyleTab";
import { BudgetTab } from "@/apps/reef-al-madina/features/account/profile/components/BudgetTab";
import { AvatarTab } from "@/apps/reef-al-madina/features/account/profile/components/AvatarTab";
import { Tracer } from "@/core/system/observability/Tracer";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<ProfileForm>(EMPTY_FORM);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [forceReady, setForceReady] = useState(false);
  const [tab, setTab] = useState<TabKey>("identity");

  useEffect(() => {
    if (!loading) { setForceReady(true); return; }
    const timer = window.setTimeout(() => setForceReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const syncProfile = async (silent = false) => {
    if (!user) return null;
    if (!silent) setPageState("loading");
    setErrorMessage("");
    try {
      const data = await getMyProfileFn();
      const next = buildForm(user, (data ?? profile) as Partial<DbProfile> | null);
      setForm(next);
      setInitialForm(next);
      setPageState("ready");
      return next;
    } catch (e) {
      const message = e instanceof Error ? e.message : "تعذّر التحميل";
      Tracer.error("account", "profile_fetch_error", { args: ["profile fetch error", e] });
      const fallback = buildForm(user, profile as Partial<DbProfile> | null);
      setForm(fallback);
      setInitialForm(fallback);
      setPageState("error");
      setErrorMessage(message);
      return null;
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { setPageState("idle"); setForm(EMPTY_FORM); setInitialForm(EMPTY_FORM); return; }
    const fallback = buildForm(user, profile as Partial<DbProfile> | null);
    setForm(fallback);
    setInitialForm(fallback);
    setPageState(profile ? "ready" : "loading");
    void syncProfile(Boolean(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const initials = useMemo(() => {
    return (form.fullName || user?.user_metadata?.full_name || "ر م")
      .split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("");
  }, [form.fullName, user?.user_metadata?.full_name]);

  const completion = useMemo(() => {
    const fields = [
      form.fullName.trim().length > 1,
      form.phone.trim().length > 0,
      form.birthDate.length > 0,
      form.gender !== "unspecified",
      form.occupation.length > 0,
      form.householdSize > 0,
      form.lifestyleTags.length > 0,
      form.likes.length > 0 || form.dislikes.length > 0,
      form.budgetRange.length > 0,
      form.avatarKey.length > 0,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [form]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const toggleArrayValue = (key: "lifestyleTags" | "likes" | "dislikes", value: string) => {
    setForm((c) => {
      const current = c[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...c, [key]: next };
    });
    setSaveState("idle");
  };

  const save = async () => {
    if (loading && !forceReady) { toast.error("انتظر قليلاً حتى يكتمل تجهيز الحساب."); return; }
    if (!user) { toast.error("يجب تسجيل الدخول أولاً."); return; }
    if (form.fullName.trim().length < 2) { toast.error("أدخل الاسم الكامل بشكل صحيح."); return; }

    setSaveState("saving");
    setErrorMessage("");

    const payload = {
      full_name: form.fullName.trim(),
      phone: form.phone || extractPhoneFromPseudoEmail(user.email) || null,
      birth_date: form.birthDate || null,
      gender: form.gender,
      avatar_key: form.avatarKey || null,
      occupation: form.occupation || null,
      household_size: form.householdSize > 0 ? form.householdSize : null,
      lifestyle_tags: form.lifestyleTags,
      likes: form.likes,
      dislikes: form.dislikes,
      budget_range: form.budgetRange || null,
    };

    try {
      await updateMyProfileFn({ data: payload });
    } catch (e) {
      const message = e instanceof Error ? e.message : "تعذّر الحفظ";
      Tracer.error("account", "profile_save_error", { args: ["profile save error", e] });
      setSaveState("error");
      setErrorMessage(message);
      toast.error(`تعذّر الحفظ — ${message}`);
      return;
    }
    await refreshProfile();
    const fresh = (await syncProfile(true)) ?? form;
    setInitialForm(fresh);
    setSaveState("saved");
    toast.success("تم حفظ الملف الشخصي بنجاح ✨");
  };

  const resetForm = () => { setForm(initialForm); setSaveState("idle"); setErrorMessage(""); };
  const clearSaveState = () => setSaveState("idle");

  if (loading && !forceReady) {
    return (
      <div className="space-y-4">
        <BackHeader title="ملفي الذكي" subtitle="جاري تجهيز ملفك" accent="حسابي" />
        <div className="h-44 animate-pulse rounded-[2rem] bg-card shadow-soft" />
        <div className="h-72 animate-pulse rounded-[1.6rem] bg-card shadow-soft" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-5">
        <BackHeader title="ملفي الذكي" subtitle="سجّل الدخول لإدارة بياناتك" accent="حسابي" />
        <section className="rounded-[2rem] border border-border/60 bg-card p-6 text-center shadow-tile">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-foreground">الملف الشخصي يحتاج تسجيل دخول</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">حتى لا تضيع بياناتك، الحفظ هنا يعمل فقط بعد الدخول.</p>
          <Link to="/auth" className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-pill">
            تسجيل الدخول الآن
          </Link>
        </section>
      </div>
    );
  }

  const AvatarIcon = AVATAR_GALLERY.find((a) => a.key === form.avatarKey)?.icon;
  const fallbackPhone = extractPhoneFromPseudoEmail(user.email);

  return (
    <div className="space-y-4 pb-6">
      <BackHeader title="ملفي الذكي" subtitle="بياناتك تُخصِّص لك المتجر بأكمله" accent="حسابي" />

      <ProfileHero form={form} fallbackPhone={fallbackPhone} initials={initials} completion={completion} AvatarIcon={AvatarIcon} />

      <ProfileTabsNav tab={tab} onChange={setTab} />

      {(pageState === "error" || errorMessage) && (
        <section className="rounded-[1.6rem] border border-destructive/20 bg-destructive/5 p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive"><CircleAlert className="h-4 w-4" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-foreground">مشكلة في مزامنة البيانات</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{errorMessage || "تعذّر تحميل آخر نسخة."}</p>
            </div>
            <Button type="button" onClick={() => void syncProfile()} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft" aria-label="إعادة المحاولة">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {tab === "identity" && (
        <IdentityTab form={form} userEmail={user.email} onChange={setForm} onClearSaveState={clearSaveState} />
      )}
      {tab === "lifestyle" && <LifestyleTab form={form} onToggle={toggleArrayValue} />}
      {tab === "budget" && <BudgetTab form={form} onChange={setForm} onClearSaveState={clearSaveState} />}
      {tab === "avatar" && <AvatarTab form={form} onChange={setForm} onClearSaveState={clearSaveState} />}

      <ProfileSaveBar saveState={saveState} isDirty={isDirty} onReset={resetForm} onSave={save} />
    </div>
  );
};

export default Profile;
