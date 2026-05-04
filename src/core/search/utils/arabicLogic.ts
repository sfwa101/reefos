/**
 * Arabic NLP Utilities — OMNI-Search
 * -----------------------------------
 * - `normalizeArabic`: unifies letter forms, strips diacritics & tatweel.
 * - `SYNONYM_MAP`: bidirectional dialect/variant dictionary.
 * - `suggestAliases`: returns suggested aliases for a product name.
 * - `expandKeywords`: produces a normalized keyword bag for indexing.
 */

// --- Diacritics & tatweel ----------------------------------------------------
// U+064B..U+065F, U+0670 (superscript alef), U+0640 (tatweel)
const DIACRITICS_RE = /[\u064B-\u065F\u0670\u0640]/g;

// --- Letter unification map --------------------------------------------------
const LETTER_MAP: Readonly<Record<string, string>> = {
  // Alef variants → ا
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ا": "ا",
  // Ya variants → ي
  "ى": "ي", "ئ": "ي", "ي": "ي",
  // Ta marbuta + Ha → ه (تَ المربوطة كثيراً تُكتب هاء في البحث)
  "ة": "ه",
  // Hamza on waw → و
  "ؤ": "و",
  // Hamza standalone → drop
  "ء": "",
};

/**
 * Normalize Arabic text for indexing/search:
 * - lowercase (latin parts)
 * - strip diacritics + tatweel
 * - unify alef/ya/ta-marbuta/hamza forms
 * - collapse whitespace
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";
  const stripped = input.replace(DIACRITICS_RE, "");
  let out = "";
  for (const ch of stripped) {
    out += LETTER_MAP[ch] ?? ch;
  }
  return out
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// --- Synonym dictionary ------------------------------------------------------
// Each cluster groups dialect/variant terms. Lookup is bidirectional:
// any term in a cluster maps to all OTHER terms in the same cluster.
const SYNONYM_CLUSTERS: ReadonlyArray<readonly string[]> = [
  // خضار
  ["طماطم", "اوطه", "بندوره", "قوطه", "tomato"],
  ["بطاطس", "بطاطا", "potato"],
  ["خياره", "خيار", "قثا", "cucumber"],
  ["باذنجان", "بتنجان", "بيتنجان", "eggplant"],
  ["كوسه", "كوسا", "zucchini"],
  ["فلفل", "شطه", "فليفله", "pepper", "chili"],
  ["بصل", "بصله", "onion"],
  ["ثوم", "توم", "garlic"],
  ["جزر", "carrot"],
  ["خس", "lettuce"],
  ["جرجير", "rocca", "arugula"],
  ["بقدونس", "معدنوس", "parsley"],
  ["كزبره", "coriander", "cilantro"],
  ["نعناع", "نعنع", "mint"],
  ["ملوخيه", "molokhia"],

  // فواكه
  ["موز", "banana"],
  ["تفاح", "تفاحه", "apple"],
  ["برتقال", "برتقاله", "orange"],
  ["مانجو", "مانجه", "مانجا", "mango"],
  ["فراوله", "فراولا", "توت ارضي", "strawberry"],
  ["عنب", "grapes"],
  ["بطيخ", "رقي", "حبحب", "watermelon"],
  ["شمام", "كنتالوب", "melon", "cantaloupe"],
  ["ليمون", "lemon", "lime"],

  // لحوم ودواجن
  ["دجاج", "فراخ", "فروج", "chicken"],
  ["لحم", "لحمه", "لحم بقر", "beef", "meat"],
  ["لحم ضاني", "ضاني", "خروف", "lamb", "mutton"],
  ["كبده", "كبد", "liver"],
  ["سمك", "samak", "fish"],
  ["جمبري", "قريدس", "روبيان", "shrimp", "prawn"],

  // ألبان
  ["حليب", "لبن حليب", "milk"],
  ["لبن", "زبادي", "روب", "yogurt", "yoghurt"],
  ["جبنه", "جبن", "cheese"],
  ["زبده", "زبد", "butter"],
  ["قشطه", "قشده", "cream"],

  // مخبوزات وحبوب
  ["خبز", "عيش", "bread"],
  ["ارز", "رز", "rice"],
  ["مكرونه", "معكرونه", "باستا", "pasta", "macaroni"],
  ["دقيق", "طحين", "flour"],
  ["سكر", "sugar"],
  ["ملح", "salt"],

  // مشروبات
  ["قهوه", "بن", "coffee"],
  ["شاي", "tea"],
  ["عصير", "عصائر", "juice"],
  ["مياه", "ميه", "ماء", "water"],

  // زيوت ومعلبات
  ["زيت", "oil"],
  ["زيت زيتون", "olive oil"],
  ["تونه", "tuna"],
  ["صلصه", "صوص", "sauce"],

  // منظفات
  ["صابون", "soap"],
  ["شامبو", "shampoo"],
  ["معجون اسنان", "معجون سنان", "toothpaste"],
  ["مناديل", "منديل", "tissues"],
];

/**
 * Pre-built lookup index: normalized term → set of normalized synonyms.
 */
const SYNONYM_INDEX: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const cluster of SYNONYM_CLUSTERS) {
    const normalized = cluster.map((t) => normalizeArabic(t)).filter((t) => t.length > 0);
    for (const term of normalized) {
      const others = new Set(normalized.filter((x) => x !== term));
      const existing = map.get(term);
      if (existing) {
        for (const o of others) existing.add(o);
      } else {
        map.set(term, others);
      }
    }
  }
  return map;
})();

/**
 * Suggest aliases for a given product name (or any phrase).
 * Splits the input into tokens, looks each up in the synonym index,
 * and returns a deduplicated list of suggestions (excluding the input itself).
 */
export function suggestAliases(input: string): readonly string[] {
  const norm = normalizeArabic(input);
  if (!norm) return [];
  const seen = new Set<string>();
  const inputTokens = new Set(norm.split(" "));

  // Whole-phrase lookup first (e.g., "زيت زيتون")
  const wholeMatches = SYNONYM_INDEX.get(norm);
  if (wholeMatches) {
    for (const m of wholeMatches) seen.add(m);
  }

  // Then per-token
  for (const token of inputTokens) {
    if (token.length < 2) continue;
    const matches = SYNONYM_INDEX.get(token);
    if (!matches) continue;
    for (const m of matches) {
      if (!inputTokens.has(m)) seen.add(m);
    }
  }
  return Array.from(seen);
}

/**
 * Expand a phrase into a normalized keyword bag (original + aliases),
 * suitable for storing in the search index `keywords` field.
 */
export function expandKeywords(input: string, extra: readonly string[] = []): string {
  const norm = normalizeArabic(input);
  const aliases = suggestAliases(input);
  const extras = extra.map((e) => normalizeArabic(e)).filter(Boolean);
  const bag = new Set<string>([norm, ...aliases, ...extras].filter(Boolean));
  return Array.from(bag).join(" ");
}
