/**
 * Egyptian National ID Decoder — Phase 19 (Doctrine 9).
 *
 * Parses a 14-digit Egyptian national ID and returns its semantic payload:
 *   - C YY MM DD GG SSSS G K
 *     C (1)    century: 2 → 1900s, 3 → 2000s
 *     YYMMDD (6) date of birth
 *     GG (2)    governorate code (issuance)
 *     SSSS (4)  serial; second-to-last digit encodes gender
 *     G (1)     gender digit (odd → male, even → female)
 *     K (1)     check digit (we do not enforce — many real cards fail naive checksums)
 *
 * The Short-ID (Doctrine 9.2) is the last 6 digits of the ID, used for the
 * daily-UX badge.
 */

export type DecodedGender = "male" | "female";

export type DecodedEgyptianId = {
  isValid: boolean;
  dob: string | null; // ISO YYYY-MM-DD
  gender: DecodedGender | null;
  governorateCode: string | null;
  governorate: string | null; // Arabic label
  shortId: string | null;
};

// Governorate code → Arabic label (issuance governorate, not residence).
export const EGY_GOVERNORATES: Record<string, string> = {
  "01": "القاهرة",
  "02": "الإسكندرية",
  "03": "بورسعيد",
  "04": "السويس",
  "11": "دمياط",
  "12": "الدقهلية",
  "13": "الشرقية",
  "14": "القليوبية",
  "15": "كفر الشيخ",
  "16": "الغربية",
  "17": "المنوفية",
  "18": "البحيرة",
  "19": "الإسماعيلية",
  "21": "الجيزة",
  "22": "بني سويف",
  "23": "الفيوم",
  "24": "المنيا",
  "25": "أسيوط",
  "26": "سوهاج",
  "27": "قنا",
  "28": "أسوان",
  "29": "الأقصر",
  "31": "البحر الأحمر",
  "32": "الوادي الجديد",
  "33": "مطروح",
  "34": "شمال سيناء",
  "35": "جنوب سيناء",
  "88": "خارج الجمهورية",
};

export const EGY_GOVERNORATE_LIST = Object.entries(EGY_GOVERNORATES)
  .map(([code, label]) => ({ code, label }));

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalizeIdInput(raw: string): string {
  return (raw || "")
    .replace(/[\u0660-\u0669]/g, (d) => ARABIC_DIGITS[d] ?? d)
    .replace(/\D/g, "")
    .slice(0, 14);
}

export function decodeEgyptianId(raw: string): DecodedEgyptianId {
  const id = normalizeIdInput(raw);
  const empty: DecodedEgyptianId = {
    isValid: false, dob: null, gender: null,
    governorateCode: null, governorate: null, shortId: null,
  };
  if (id.length !== 14) return empty;

  const century = id[0] === "2" ? 1900 : id[0] === "3" ? 2000 : null;
  if (century === null) return empty;

  const yy = parseInt(id.slice(1, 3), 10);
  const mm = parseInt(id.slice(3, 5), 10);
  const dd = parseInt(id.slice(5, 7), 10);
  const govCode = id.slice(7, 9);
  const genderDigit = parseInt(id[12], 10);

  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return empty;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return empty;

  const year = century + yy;
  const dt = new Date(Date.UTC(year, mm - 1, dd));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== mm - 1 ||
    dt.getUTCDate() !== dd
  ) return empty;

  const gender: DecodedGender = genderDigit % 2 === 0 ? "female" : "male";
  const governorate = EGY_GOVERNORATES[govCode] ?? null;

  return {
    isValid: true,
    dob: `${year.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
    gender,
    governorateCode: govCode,
    governorate,
    shortId: id.slice(-6),
  };
}
