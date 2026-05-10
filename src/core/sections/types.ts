/**
 * Section Identity — يحدد كيف يُقدَّم القسم بصرياً وسلوكياً.
 * كل القيم مفاتيح ثابتة (string keys) لا enums — قابلة للتوسع من DB دون redeploy.
 */
import type { I18nText, JsonValue } from "@/core/catalog/types";

export interface SectionIdentity {
  id: string;
  slug: string;
  name: I18nText;
  /** parent_id — لدعم التداخل (السوبرماركت → الخضار). */
  parentId?: string;
  /** ترتيب العرض. */
  sortOrder: number;

  /** نغمة بصرية: warm | cool | premium | playful | clinical | rustic | ... */
  visualTone: string;
  /** أسلوب البطاقة: compact | spotlight | hero_image | list_dense | culinary | ... */
  cardStyle: string;
  /** نمط التفاعل: tap_buy | configure_first | quote_request | subscribe_first | ... */
  interactionPattern: string;
  /** استراتيجية الترتيب الافتراضية: popularity | new | seasonal | wholesale_priority | ... */
  sortStrategy: string;
  /** استراتيجية التوصيات: complementary_first | bought_together | similar_nutrition | ... */
  recommendationStrategy: string;
  /** سلوك البحث: keyword | semantic | nutrition | meal_intent | ... */
  searchBehavior: string;
  /** مفاتيح الـ badges المسموح ظهورها (إذا فارغة → الكل). */
  badgeAllowlist: readonly string[];
  /** قدرات مفعّلة (مفاتيح من capability_registry). */
  capabilities: readonly string[];
  /** خصائص حرة لـ adapters. */
  attributes: Readonly<Record<string, JsonValue>>;
}
