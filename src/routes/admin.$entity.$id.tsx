import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminFormEngine,
  useEntityDefinition,
} from "@/core/runtime-ui/admin";
import { AdminErrorBoundary } from "@/core/runtime-ui/admin/components/AdminErrorBoundary";

export const Route = createFileRoute("/admin/$entity/$id")({
  component: AdminEntityRecordPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-destructive">
        <p>{error.message}</p>
        <Button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-2xl">
          إعادة المحاولة
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-8">
      <h1 className="font-display text-2xl">السجل غير موجود</h1>
      <Link to="/admin" className="text-primary underline mt-4 inline-block">العودة للوحة المسؤول</Link>
    </div>
  ),
});

function AdminEntityRecordPage() {
  const { entity, id } = Route.useParams();
  const navigate = useNavigate();
  const def = useEntityDefinition(entity);
  const isNew = id === "new";
  const title = def.data?.definition.label_i18n.ar ?? entity;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">
            {isNew ? `إضافة ${title}` : `تعديل ${title}`}
          </h1>
          {!isNew && <p className="text-[12px] text-foreground/50 font-mono mt-1">{id}</p>}
        </div>
        <Button asChild variant="ghost" className="rounded-2xl gap-2">
          <Link to="/admin/$entity" params={{ entity }}>
            <ArrowRight className="size-4" /> رجوع
          </Link>
        </Button>
      </header>

      <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 p-6 lg:p-8 shadow-soft">
        <AdminErrorBoundary mode={isNew ? "create" : "edit"} entityId={def.data?.definition.id}>
          <AdminFormEngine
            entityKey={entity}
            recordId={isNew ? undefined : id}
            onSaved={(rec) => {
              const newId = (rec as { id?: string }).id;
              if (isNew && newId) {
                navigate({ to: "/admin/$entity/$id", params: { entity, id: newId } });
              }
            }}
          />
        </AdminErrorBoundary>
      </div>
    </div>
  );
}
