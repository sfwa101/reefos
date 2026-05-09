# 🌌 VISION.md — دستور سلسبيل (Salsabil OS)

> **الدستور الاستراتيجي للحضارة الرقمية السيادية ونظام تشغيل الإنسان**
> وثيقة مرجعية دائمة — تُلزم كل مطوّر بشري أو ذكاء اصطناعي.
> اقرأها **قبل** أن تكتب سطراً واحداً من الكود.

---

## 0. الحقيقة الواحدة

> **نحن لا نبني تطبيقاً. ولا نبني ERP. ولا حتى سوبر-آب.**
> نحن نبني **نظام تشغيل للإنسان (Human OS)** —
> *Sovereign Digital Civilization* تجري على
> **Unified Sovereign Runtime** واحد، يحلّ محلّ التطبيقات الجامدة
> بـ **Adaptive Professional Runtime** يتشكّل لحظياً حول هوية الإنسان.

سلسبيل ليست منصّة. سلسبيل هي **الأرض الرقمية** التي يقف عليها الإنسان
ليمارس كل أدواره المهنية والاقتصادية والاجتماعية، في زمن تشغيل واحد،
بهوية واحدة، وذكاءٍ واحد.

---

## 1. المفهوم الجوهري

**Salsabil OS = Unified Sovereign Runtime + Human OS + Adaptive Professional Runtime**

- **Unified Sovereign Runtime:** زمن تشغيل واحد، قاعدة بيانات واحدة،
  هوية واحدة، محفظة واحدة، ذكاء واحد (Hakim) — يخدم كل البشر وكل
  المنظمات.
- **Human OS:** الإنسان هو الـ Process Root. كل دور، كل شركة، كل وظيفة
  هي مجرّد **Workspace** يُشغَّل فوق هويته السيادية.
- **Adaptive Professional Runtime:** الواجهة، الذكاء، الـ workflows،
  والصلاحيات تتشكّل لحظياً حسب **Professional DNA** للوضع النشط.

> الواجهة نتيجة، لا مادة.
> الدور **Workspace**، لا تطبيق منفصل.
> التطبيق تركيبة لحظية، لا منتج جامد.

---

## 2. الهوية مقابل مساحات العمل (Identity vs. Workspace)

### 🧬 الهوية السيادية الواحدة (Tayseer Sovereign Identity)
لكل إنسان في سلسبيل **هوية واحدة فقط** تديرها **تيسير**:
- الرقم القومي + KYC + سجل السمعة + المحفظة الموحّدة.
- تتبع الإنسان عبر كل الـ Workspaces دون تكرار تسجيل أو تحقق.
- لا يمكن لأي Workspace أن يَملك هوية المستخدم — Workspace يَستأجر
  الهوية، لا يَحتويها.

### 🪟 مساحات العمل الديناميكية (Dynamic Workspaces)
من الهوية الواحدة، يُطلق الإنسان **Workspaces** بنقرة:

**Workspaces فردية (Solo):**
- *Solo Freelancer* — مصمم، مبرمج، مترجم.
- *Teacher / Tutor* — معلم خاص، أستاذ.
- *Lawyer / Consultant* — محامٍ، مستشار.
- *Driver* — سائق توصيل في برق.
- *Investor* — مستثمر يدير محفظة.

**Workspaces مؤسّسية (Organizations):**
- *Reef Al-Madina* — منظومة التجارة والتجزئة.
- *Barq* — أسطول لوجستي فيدرالي.
- *Tayseer* — المؤسسة المالية السيادية.
- *Nour El-Din* — مدرسة القدرات البشرية.
- *Benaa* — مولّد الشركات اللحظي.

كل Workspace له `workspace_id`، صلاحياته، بياناته، واجهته. الإنسان واحد،
الـ Workspaces متعدّدة.

---

## 3. تحوّل الواقع (Workspace Morphing — Multi-Reality)

> الإنسان في سلسبيل **لا يسجّل خروجاً ليصبح شخصاً آخر**.
> ينقر، فيتحوّل الواقع حوله.

- في الصباح: *Merchant Mode* — لوحة الكاشير، الجرد، أوامر الشراء.
- في الظهر: *Driver Mode* — خريطة كبيرة، أزرار ضخمة، قبول الطلبات.
- في المساء: *Investor Mode* — رسوم بيانية كثيفة، تحليلات المحفظة.
- في الليل: *Teacher Mode* — جدول الحصص، رفع الدرجات.

**ما الذي يتحوّل فعلياً؟**
- 🎨 **الـ UI** — الكثافة، التباين، أهداف اللمس، اللغة البصرية.
- 🧠 **الـ AI (Hakim)** — السياق، الاقتراحات، التحذيرات، الأهداف.
- ⚙️ **الـ Workflows** — المهام المتاحة، تسلسل الموافقات، التنبيهات.
- 🔐 **الصلاحيات** — RLS scope، الـ RPCs المتاحة، حدود المحفظة.

التحوّل **لحظي، آمن، مُتتبَّع**. كل morph يُسجَّل في
`sovereignTracing.ts` كحدث Workspace switch.

---

## 4. الـ Professional DNA — الحمض النووي المهني

كل Workspace له **Professional DNA Profile** يحدّد كيف يتشكّل الواقع:

```ts
type ProfessionalDNA = {
  workspace_id: string;
  archetype:    "merchant" | "driver" | "investor" | "teacher" | "lawyer" | "admin" | ...;
  scale:        "solo" | "small" | "enterprise";
  cognitiveLoad:"minimal" | "balanced" | "dense";
  motorContext: "thumb" | "stylus" | "mouse" | "voice";
  ambientLight: "bright" | "dim" | "dark";
  literacy:     "icon" | "text" | "mixed";
  flow:         "guided" | "expert" | "shortcut";
  language:     "ar" | "en" | "bilingual";
  capabilities: CapabilityId[]; // المضافة من السوق
};
```

**نظام عصبي-تكيّفي (Neuroadaptive):**
- محاسب → جداول بيانات كثيفة، اختصارات لوحة مفاتيح، تباين مكتبي.
- سائق تحت الشمس → ألوان قابلة للقراءة، أهداف ≥ 64px، صفر تشتيت.
- معلّم → تقويم، إيماءات بسيطة، خطوط واضحة.
- مستثمر → رسوم بيانية، تحديث لحظي، كثافة قصوى.

**نفس الكود. واجهات متعدّدة. حسب الـ DNA النشط.**

---

## 5. سوق القدرات (Capability Marketplace)

> نحن **لا نبني "متجر ميزات" (Feature Store)**.
> نحن نبني **"سوق قدرات" (Capability Marketplace)**.

الفرق جوهري:
- **Feature Store:** يضيف زراً في قائمة. ميزة جامدة.
- **Capability Marketplace:** يحقن **Smart Living Block** مباشرة في
  الـ Workspace. القدرة تتفاعل مع الـ DNA، الـ Composer، والـ AI.

### كيف يعمل؟
1. الـ Workspace يَفتح السوق ضمن سياقه (Merchant، Driver، Teacher...).
2. السوق يَعرض القدرات المتوافقة مع الـ archetype والـ scale.
3. بنقرة، تُحقن القدرة كـ Capability Block في الـ Composer.
4. القدرة تَرث: التوكينز، الـ DNA، الـ tracing، الـ RLS scope.
5. القدرة قابلة للإزالة بنفس البساطة — لا مخلّفات، لا breakage.

### أمثلة على القدرات
- *Inventory.AutoReplenish* — يُحقن في Merchant Workspace.
- *Route.LiveOptimizer* — يُحقن في Driver Workspace.
- *Portfolio.RiskRadar* — يُحقن في Investor Workspace.
- *Class.AttendanceScanner* — يُحقن في Teacher Workspace.

> القدرات **تُركَّب**، لا تُبرمَج لكل Workspace على حدة.

---

## 6. القوانين الحضارية العشرة

1. **لا واجهة نهائية.** كل شاشة تركيبة لحظية من Capabilities.
2. **لا إنسان أحادي الـ Workspace.** الهوية واحدة، المساحات متعدّدة.
3. **لا Workspace يَملك هويتك.** الهوية لتيسير وحدها.
4. **لا تَسرُّب بين الـ workspaces.** العزل بنيوي عبر `workspace_id`.
5. **لا سعر مكتوب يدوياً.** Pricing Engine هو الوحي الوحيد.
6. **لا كتابة بلا تتبّع.** كل تغيير له idempotency key وسجل أبدي.
7. **لا انتظار للشبكة.** Local-first، optimistic، offline-tolerant.
8. **لا صلاحية في الكود.** الأدوار في `user_roles` + RLS فقط.
9. **لا ذكاء زخرفي.** كل سطح للـ AI يجب أن يغيّر نتيجة.
10. **لا مستقبل مغلق.** المعمارية تستوعب أي archetype جديد.

---

## 7. الأفق الحضاري

| العصر | المحور | الثمرة |
|---|---|---|
| **I — التأسيس** | الخلايا الجذعية، RLS، التسعير | تجارة أحادية المستأجر |
| **II — الهوية** | تيسير، DNA، Workspace switching | إنسان واحد، وجوه متعددة |
| **III — السوق** | متعدد البائعين، Hubs، Reputation Graph | بائعون كثر، ثقة واحدة |
| **IV — Human OS** | Workspaces الكاملة، Morphing لحظي | الإنسان يُشغّل أدواره |
| **V — Marketplace** | Capability Marketplace، Smart Blocks | القدرات تُحقن لحظياً |
| **VI — الذكاء** | Hakim التشغيلي، التنبؤات | النظام يدير نفسه |
| **VII — الحضارة** | برق، نور الدين، بناء فوق Salsabil | OS واحد، عوالم متعدّدة |

---

## 8. ما تَحرُمه هذه الوثيقة

- ❌ التعامل مع سلسبيل كـ "تطبيق توصيل بمزايا إضافية".
- ❌ بناء "تطبيق منفصل" لكل دور — كله Workspaces.
- ❌ ربط الهوية بـ Workspace معيّن.
- ❌ تسمية ما نَبنيه "متجر ميزات" — هو **سوق قدرات**.
- ❌ ترميز UI خاص بـ archetype داخل مكوّن مشترك.

---

> **مرسوم الإمبراطور:**
> *كل سطر كود يُكتب اليوم سيخدم مليون إنسان غداً —*
> *كلٌّ منهم يَرتدي عشرة وجوه دون أن يفقد روحه الواحدة.*

— *كبير المهندسين السيادي، Salsabil OS*
