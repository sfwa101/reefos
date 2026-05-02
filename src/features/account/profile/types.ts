import type { LucideIcon } from "lucide-react";

export type Gender = "male" | "female" | "unspecified";
export type TabKey = "identity" | "lifestyle" | "budget" | "avatar";

export type ProfileForm = {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: Gender;
  avatarKey: string;
  occupation: string;
  householdSize: number;
  lifestyleTags: string[];
  likes: string[];
  dislikes: string[];
  budgetRange: string;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  avatar_key: string | null;
  occupation: string | null;
  household_size: number | null;
  lifestyle_tags: string[] | null;
  likes: string[] | null;
  dislikes: string[] | null;
  budget_range: string | null;
};

export type SaveState = "idle" | "saving" | "saved" | "error";
export type PageState = "idle" | "loading" | "ready" | "error";

export type IconOption = { value: string; label: string; icon: LucideIcon };
export type SimpleOption = { value: string; label: string };
export type BudgetOption = { value: string; label: string; hint: string; icon: LucideIcon };
export type AvatarOption = { key: string; icon: LucideIcon; label: string };

export const EMPTY_FORM: ProfileForm = {
  fullName: "",
  phone: "",
  birthDate: "",
  gender: "unspecified",
  avatarKey: "",
  occupation: "",
  householdSize: 0,
  lifestyleTags: [],
  likes: [],
  dislikes: [],
  budgetRange: "",
};
