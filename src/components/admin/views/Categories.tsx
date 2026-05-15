import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Loader2, FolderTree, Folder } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { IOSCard } from "@/components/ios/IOSCard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listCategoriesFn,
  upsertCategoryFn,
  deleteCategoryFn,
  type CategoryRow as Category,
} from "@/core/catalog/admin-catalog.functions";

export default function Categories() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState<{ parent_id: string | null } | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const data = await listCategoriesFn();
      setItems(data);
    } catch (err) {
      toast.error((err as Error).message);
      setItems([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (c: Category) => {
    if (!confirm(`حذف الفئة "${c.name}"؟`)) return;
    try {
      await deleteCategoryFn({ data: { id: c.id } });
      toast.success("تم الحذف");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const roots = (items ?? []).filter((c) => !c.parent_id);
  const childrenOf = (id: string) => (items ?? []).filter((c) => c.parent_id === id);

  return (
    <>
      <MobileTopbar title="الفئات" />
      <div className="px-4 lg:px-6 pt-2 pb-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[13px] text-foreground-secondary">إدارة شجرة الفئات والفئات الفرعية</p>
          <Button
            onClick={() => setCreating({ parent_id: null })}
            className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground flex items-center gap-1.5 press shadow-sm font-semibold text-[13px]"
          >
            <Plus className="h-4 w-4" />
            فئة رئيسية
          </Button>
        </div>

        {items === null ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-2xl bg-surface-muted animate-pulse" />)}
          </div>
        ) : roots.length === 0 ? (
          <IOSCard className="text-center py-10">
            <FolderTree className="h-10 w-10 mx-auto text-foreground-tertiary mb-3" />
            <p className="font-display text-[16px] mb-1">لا توجد فئات</p>
            <p className="text-[13px] text-foreground-secondary">أنشئ فئة رئيسية للبدء.</p>
          </IOSCard>
        ) : (
          <div className="space-y-3">
            {roots.map((c) => (
              <div key={c.id}>
                <CategoryRow c={c} onEdit={() => setEditing(c)} onDelete={() => handleDelete(c)}
                  onAddChild={() => setCreating({ parent_id: c.id })} />
                <div className="mr-4 mt-1.5 space-y-1.5 border-r-2 border-border/40 pr-3">
                  {childrenOf(c.id).map((ch) => (
                    <CategoryRow
                      key={ch.id}
                      c={ch}
                      compact
                      onEdit={() => setEditing(ch)}
                      onDelete={() => handleDelete(ch)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <CategoryEditor
          category={editing}
          parentId={creating?.parent_id ?? null}
          parents={roots}
          onClose={() => {
            setCreating(null);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(null);
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function CategoryRow({
  c, compact, onEdit, onDelete, onAddChild,
}: {
  c: Category;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
}) {
  return (
    <div className={"flex items-center gap-2 bg-surface rounded-2xl border border-border/40 " + (compact ? "p-2.5" : "p-3")}>
      <div className={"rounded-xl bg-primary/10 flex items-center justify-center " + (compact ? "h-9 w-9 text-[16px]" : "h-11 w-11 text-[20px]")}>
        {c.icon || <Folder className="h-4 w-4 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={"font-semibold truncate " + (compact ? "text-[13px]" : "text-[14px]")}>{c.name}</p>
        <p className="text-[11px] text-foreground-tertiary num">ترتيب: {c.sort_order}</p>
      </div>
      {onAddChild && (
        <Button onClick={onAddChild} className="h-8 w-8 rounded-lg bg-surface-muted flex items-center justify-center press" title="إضافة فرعية">
          <Plus className="h-4 w-4" />
        </Button>
      )}
      <Button onClick={onEdit} className="h-8 w-8 rounded-lg bg-surface-muted flex items-center justify-center press" title="تعديل">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button onClick={onDelete} className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center press" title="حذف">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function CategoryEditor({
  category, parentId, parents, onClose, onSaved,
}: {
  category: Category | null;
  parentId: string | null;
  parents: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !category;
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [parent, setParent] = useState<string | null>(category?.parent_id ?? parentId);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSaving(true);
    try {
      await upsertCategoryFn({
        data: {
          id: isNew ? null : category!.id,
          values: { name: name.trim(), icon: icon || null, sort_order: Number(sortOrder) || 0, parent_id: parent },
        },
      });
      toast.success(isNew ? "تم الإنشاء" : "تم الحفظ");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full lg:max-w-md rounded-t-3xl lg:rounded-3xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h2 className="font-display text-[18px]">{isNew ? "فئة جديدة" : "تعديل الفئة"}</h2>
          <Button onClick={onClose} className="h-9 w-9 rounded-full bg-surface-muted flex items-center justify-center press">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="الاسم *">
            <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="أيقونة (Emoji)">
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🍎" className={inputCls} />
            </Field>
            <Field label="الترتيب">
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className={inputCls + " num text-right"} />
            </Field>
          </div>
          <Field label="الفئة الأم">
            <select value={parent ?? ""} onChange={(e) => setParent(e.target.value || null)} className={inputCls}>
              <option value="">— فئة رئيسية —</option>
              {parents.filter((p) => p.id !== category?.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="px-5 py-3 border-t border-border/40 flex gap-2">
          <Button onClick={onClose} className="flex-1 h-11 rounded-2xl bg-surface-muted text-[14px] font-semibold press">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-[14px] font-semibold press flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full h-11 rounded-xl bg-surface-muted px-3 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-foreground-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
