/**
 * Phase 66.x — اغتيال الطبقة الشبحية.
 *
 * كان هذا المكون يرسم رأسًا مكررًا على الهاتف يتداخل مع SovereignTopbar/Notch
 * في AdminShell. تم تحييده — الـ Shell الجديدة تتولى كل الرؤوس.
 *
 * نُبقي على الـ export والـ props signature لتفادي كسر الاستيرادات في الصفحات
 * القديمة، لكنه يعيد null الآن (no-op).
 */
export function MobileTopbar(_props: { title?: string; large?: boolean } = {}) {
  return null;
}

export default MobileTopbar;
