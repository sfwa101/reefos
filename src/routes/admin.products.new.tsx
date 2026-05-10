/**
 * Standalone fallback route for the Product Composer.
 * Phase 66.2: the canonical entry point is the dialog opened by
 * SmartActionComposer, but this route stays for deep-links/bookmarks.
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SmartProductComposer } from "@/apps/reef-al-madina/features/admin/product-editor/SmartProductComposer";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProductRoute,
});

function NewProductRoute() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-[60vh]">
      <SmartProductComposer
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!o) navigate({ to: "/admin" as any });
        }}
      />
    </div>
  );
}
