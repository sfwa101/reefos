/**
 * Pilot route — `/runtime/$slug` يعرض أي قسم كامل عبر RuntimeRenderer.
 * هذا الإثبات الكامل لأن كل شيء يجب أن يعمل من DB → Identity → Caps → Blocks.
 *
 * لا يلمس أي صفحة موجودة (الإصدار القديم لا يزال يعمل). لتفعيل الـ runtime
 * على قسم بعينه لاحقاً، توجّه لهذا المسار: /runtime/produce
 */
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";

import { sectionListQuery, sectionQuery } from "@/core/catalog/gateway";
import { RuntimeRenderer, resolveListTree } from "@/core/runtime-ui";
import { registerCoreBlocks } from "@/core/runtime-ui/blocks";
import "@/apps/reef-al-madina/runtime-blocks/register";

registerCoreBlocks();

export const Route = createFileRoute("/runtime/$slug")({
  component: RuntimeSectionPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-center text-sm text-muted-foreground">القسم غير موجود.</div>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `Runtime · ${params.slug}` },
      { name: "description", content: "صفحة قسم مدفوعة بالكامل بـ runtime renderer." },
    ],
  }),
});

function RuntimeSectionPage() {
  const { slug } = Route.useParams();
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">جارٍ التحميل…</div>}>
      <SectionRuntime slug={slug} />
    </Suspense>
  );
}

function SectionRuntime({ slug }: { slug: string }) {
  const { data: section } = useSuspenseQuery(sectionQuery(slug));
  const { data: list } = useSuspenseQuery(sectionListQuery({ slug, limit: 24 }));

  const descriptor = useMemo(() => {
    if (!section) return null;
    return resolveListTree(section, list?.items ?? []);
  }, [section, list]);

  if (!section) {
    return <div className="p-6 text-center text-sm text-muted-foreground">القسم «{slug}» غير موجود.</div>;
  }
  if (!descriptor) return null;

  return (
    <main className="min-h-screen bg-background pb-20">
      <RuntimeRenderer descriptor={descriptor} />
    </main>
  );
}
