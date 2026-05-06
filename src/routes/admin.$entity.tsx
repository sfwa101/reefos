import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminTableEngine,
  useEntityDefinition,
} from "@/features/sdui/admin";
import { AdminErrorBoundary } from "@/features/sdui/admin/components/AdminErrorBoundary";

export const Route = createFileRoute("/admin/$entity")({
  component: AdminEntityListPage,
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
      <h1 className="font-display text-2xl">الكيان غير موجود</h1>
      <Link to="/admin" className="text-primary underline mt-4 inline-block">العودة للوحة المسؤول</Link>
    </div>
  ),
});

function AdminEntityListPage() {
  const { entity } = Route.useParams();
  const navigate = useNavigate();
  const def = useEntityDefinition(entity);
  const title = def.data?.definition.label_i18n.ar ?? entity;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-2xl mx-auto">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="text-[13px] text-foreground/60 mt-1 font-mono">{entity}</p>
        </div>
        <Button asChild className="rounded-2xl gap-2">
          <Link to="/admin/$entity/$id" params={{ entity, id: "new" }}>
            <Plus className="size-4" /> إضافة
          </Link>
        </Button>
      </header>

      <AdminErrorBoundary mode="list" entityId={def.data?.definition.id}>
        <AdminTableEngine
          entityKey={entity}
          onRowClick={(row) => {
            const id = (row as { id?: string }).id;
            if (id) navigate({ to: "/admin/$entity/$id", params: { entity, id } });
          }}
        />
      </AdminErrorBoundary>
    </div>
  );
}
