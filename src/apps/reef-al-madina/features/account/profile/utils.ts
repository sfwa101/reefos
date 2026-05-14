import type { AuthUser as User } from "@/core/identity";
import type { DbProfile, Gender, ProfileForm } from "./types";

export const normalizeGender = (value?: string | null): Gender => (
  value === "male" || value === "female" || value === "unspecified" ? value : "unspecified"
);

export const extractPhoneFromPseudoEmail = (email?: string | null) => {
  if (!email || !email.endsWith("@reef.local")) return "";
  return email.replace("@reef.local", "");
};

export const formatBirthDate = (value: string) => {
  if (!value) return "أضف تاريخ الميلاد";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

export const buildForm = (user: User, data?: Partial<DbProfile> | null): ProfileForm => {
  const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string; gender?: string };
  return {
    fullName: data?.full_name ?? meta.full_name ?? "",
    phone: data?.phone ?? meta.phone ?? extractPhoneFromPseudoEmail(user.email) ?? "",
    birthDate: data?.birth_date ?? "",
    gender: normalizeGender(data?.gender ?? meta.gender),
    avatarKey: data?.avatar_key ?? "",
    occupation: data?.occupation ?? "",
    householdSize: typeof data?.household_size === "number" ? data!.household_size! : 0,
    lifestyleTags: Array.isArray(data?.lifestyle_tags) ? data!.lifestyle_tags! : [],
    likes: Array.isArray(data?.likes) ? data!.likes! : [],
    dislikes: Array.isArray(data?.dislikes) ? data!.dislikes! : [],
    budgetRange: data?.budget_range ?? "",
  };
};
