/**
 * USAEditor — Phase 8 Part 1.
 * AI Co-Pilot Symbiosis: Supports pure manual entry, AI-prefilled drafts,
 * and human-in-the-loop review. The Vision Genesis tab hands its payload
 * back here (handoffOnly) so the Admin can edit before atomic minting.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, Save, Wand2, AlertTriangle, ShieldCheck, Layers, Network, Coins } from "lucide-react";
import VisionGenesisUploader from "@/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader";
import InventoryMatrixPanel from "@/apps/reef-al-madina/features/admin/usa-editor/InventoryMatrixPanel";
import PackagingHierarchyBuilder from "@/components/commerce/assets/PackagingHierarchyBuilder";
import DimensionalTagSelector from "@/components/commerce/assets/DimensionalTagSelector";
import CognitivePricingBuilder from "@/components/commerce/assets/CognitivePricingBuilder";
import LivingInventoryBuilder from "@/components/commerce/assets/LivingInventoryBuilder";
import { CAP } from "@/core/capabilities/CapabilityRegistry";
import type { PackagingTierDraft, FinancialContractDraft, InventoryDraft } from "@/core/commerce";
import type { AssetTagDraft } from "@/core/commerce/types/assetTag";
import { PackagingGateway, TagsGateway, PricingGateway, InventoryGateway } from "@/core/commerce";
import { Tracer } from "@/core/system/observability/Tracer";
import { useUpdateUSA } from "@/core/hakim-ai/hooks/useUpdateUSA";
import { useMintUSA } from "@/core/hakim-ai/hooks/useMintUSA";
import { useAssetMatchmaker, type MatchedAsset } from "@/core/hakim-ai/hooks/useAssetMatchmaker";
import type { USAGenesisPayload } from "@/core/hakim-ai/hooks/useVisionGenesis";
import { useProductImageUpload } from "@/hooks/useProductImageUpload";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface USARecord {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  traits: unknown;
  is_active: boolean;
  created_at: string;
  base_price?: number | null;
  currency?: string | null;
  pricing_model?: string | null;
  skus_count?: number;
}

type AssetType = "physical" | "digital" | "service" | "rental" | "milestone_project";
type PricingModel =
  | "flat"
  | "tiered_wholesale"
  | "subscription"
  | "deposit_and_rental"
  | "milestone_installments";

interface Props {
  open: boolean;
  asset: USARecord | null;
  onClose: () => void;
  onSaved?: () => void;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة",
  rental: "إيجار",
  milestone_project: "مشروع بمراحل",
};

const PRICING_LABELS: Record<PricingModel, string> = {
  flat: "سعر ثابت",
  tiered_wholesale: "أسعار جملة متدرجة",
  subscription: "اشتراك دوري",
  deposit_and_rental: "وديعة + إيجار",
  milestone_installments: "أقساط بمراحل",
};


const Field = ({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block">
    <span className="block text-[10.5px] font-bold text-foreground-tertiary mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[10.5px] text-foreground-tertiary mt-1">{hint}</span>}
  </label>
);

export default function USAEditor({ open, asset, onClose, onSaved }: Props) {
  const isNew = !asset;
  const update = useUpdateUSA();
  const mint = useMintUSA();
  const matchmaker = useAssetMatchmaker();
  const { upload: uploadProductImage } = useProductImageUpload();

  const [tab, setTab] = useState<string>(isNew ? "basic" : "basic");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [assetType, setAssetType] = useState<AssetType>("physical");
  const [pricingModel, setPricingModel] = useState<PricingModel>("flat");
  const [currency, setCurrency] = useState<"EGP" | "USD" | "EUR">("EGP");
  const [aiDraft, setAiDraft] = useState<USAGenesisPayload | null>(null);
  const [aiFile, setAiFile] = useState<File | null>(null);

  // Sovereign Override state — Phase 8 Part 4.
  const [duplicateMatches, setDuplicateMatches] = useState<MatchedAsset[]>([]);
  const [pendingEmbedding, setPendingEmbedding] = useState<number[] | null>(null);
  const [hasOverriddenAI, setHasOverriddenAI] = useState(false);

  // Phase D-2 — Economic Packaging Runtime (local draft, lifted on save).
  const [packagingEnabled, setPackagingEnabled] = useState(false);
  const [packagingTiers, setPackagingTiers] = useState<PackagingTierDraft[]>([]);

  // Phase D-5 — Multi-Dimensional Classification (local draft, lifted on save).
  const [classificationEnabled, setClassificationEnabled] = useState(false);
  const [tagDrafts, setTagDrafts] = useState<AssetTagDraft[]>([]);

  // Phase E-1 — Cognitive Pricing Runtime (local draft, lifted on save).
  // Persistence (DB writes for financial contracts) is deferred to Phase E-2.
  const [financialContractsDraft, setFinancialContractsDraft] = useState<FinancialContractDraft[]>([]);

  // Phase F-1 — Living Inventory Runtime (local draft, lifted on save).
  const [inventoryDrafts, setInventoryDrafts] = useState<InventoryDraft[]>([]);

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setDescription(asset.description ?? "");
      setBasePrice(asset.base_price != null ? String(asset.base_price) : "");
      setAssetType((asset.asset_type as AssetType) ?? "physical");
      setPricingModel((asset.pricing_model as PricingModel) ?? "flat");
      setCurrency((asset.currency as "EGP" | "USD" | "EUR") ?? "EGP");
      setTab("basic");
      const traits = Array.isArray(asset.traits) ? (asset.traits as unknown[]) : [];
      const enabled = traits.includes(CAP.PACKAGING_HIERARCHY);
      setPackagingEnabled(enabled);
      setPackagingTiers([]);
      setClassificationEnabled(traits.includes(CAP.MULTI_CLASSIFICATION));
      setTagDrafts([]);
      setFinancialContractsDraft([]);
      setInventoryDrafts([]);
      // Hydrate persisted packaging tiers + tag links for edit mode.
      let cancelled = false;
      (async () => {
        try {
          const rows = await PackagingGateway.listTiers(asset.id);
          if (cancelled) return;
          setPackagingTiers(rows as unknown as PackagingTierDraft[]);
          if (rows.length > 0) setPackagingEnabled(true);
        } catch (e) {
          Tracer.warn("admin", "usa_editor_load_packaging_failed", { error: String(e) });
        }
        try {
          const links = await TagsGateway.listLinksFor(asset.id);
          if (cancelled) return;
          if (links.length > 0) {
            setClassificationEnabled(true);
            setTagDrafts(
              links.map((l) => ({
                id: l.tag.id,
                tag_key: l.tag.tag_key,
                tag_value: l.tag.tag_value,
                label_i18n: l.tag.label_i18n,
                parent_tag_id: l.tag.parent_tag_id,
                metadata: l.tag.metadata,
                is_active: l.tag.is_active,
                sort_order: l.tag.sort_order,
              })),
            );
          }
        } catch (e) {
          Tracer.warn("admin", "usa_editor_load_tags_failed", { error: String(e) });
        }
      })();
      return () => {
        cancelled = true;
      };
    } else {
      setName("");
      setDescription("");
      setBasePrice("");
      setAssetType("physical");
      setPricingModel("flat");
      setCurrency("EGP");
      setAiDraft(null);
      setAiFile(null);
      setTab("basic");
      setPackagingEnabled(false);
      setPackagingTiers([]);
      setClassificationEnabled(false);
      setTagDrafts([]);
      setFinancialContractsDraft([]);
      setInventoryDrafts([]);
    }
    setDuplicateMatches([]);
    setPendingEmbedding(null);
    setHasOverriddenAI(false);
  }, [asset, open]);

  const handleAIHandoff = (payload: USAGenesisPayload, file?: File | null) => {
    setName(payload.asset.name);
    setDescription(payload.asset.description);
    setAssetType(payload.asset.asset_type);
    setPricingModel(payload.financial_contract.pricing_model);
    setCurrency(payload.financial_contract.currency);
    setBasePrice(String(payload.financial_contract.base_price));
    setAiDraft(payload);
    setAiFile(file ?? null);
    setTab("basic");
    setDuplicateMatches([]);
    setHasOverriddenAI(false);
    toast.success("تم تعبئة النموذج باقتراح حكيم — راجِع وعدّل قبل السكّ");
  };

  const isPending = update.isPending || mint.isPending || matchmaker.isChecking;

  const handleSave = async (forceOverride = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const priceNum = basePrice.trim() === "" ? null : Number(basePrice);
    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0)) return;

    try {
      if (isNew) {
        let embedding = pendingEmbedding;

        // Advisory Interceptor — only run if Admin hasn't already overridden.
        if (!forceOverride && !hasOverriddenAI) {
          const result = await matchmaker.checkDuplicates(trimmed, description.trim());
          embedding = result.embedding;
          setPendingEmbedding(result.embedding);
          if (result.matches.length > 0) {
            setDuplicateMatches(result.matches);
            toast.warning("⚠️ حكيم رصد أصولاً مشابهة — راجع التحذير قبل السكّ");
            return;
          }
        }

        const mintedTraits = computeMintTraits(aiDraft?.asset.traits);
        const newAssetId = await mint.mutateAsync({
          asset: {
            name: trimmed,
            description: description.trim(),
            asset_type: assetType,
            traits: mintedTraits,
            media: await uploadAiImageIfAny(),
          },
          skus: aiDraft?.skus ?? [],
          financial_contract: {
            pricing_model: pricingModel,
            base_price: priceNum ?? 0,
            currency,
            contract_rules: aiDraft?.financial_contract.contract_rules ?? {},
          },
          semantic_embedding: embedding,
        });
        const tierIdMap = await persistPackaging(newAssetId);
        await persistTags(newAssetId);
        await persistPricing(newAssetId, tierIdMap);
        await persistInventory(newAssetId, tierIdMap);
        setHasOverriddenAI(false);
        setPendingEmbedding(null);
        onSaved?.();
        onClose();
      } else {
        await update.mutateAsync({
          asset_id: asset!.id,
          name: trimmed,
          description: description.trim() || null,
          base_price: priceNum,
        });
        const tierIdMap = await persistPackaging(asset!.id);
        await persistTags(asset!.id);
        await persistPricing(asset!.id, tierIdMap);
        await persistInventory(asset!.id, tierIdMap);
        await syncClassificationTrait(asset!.id);
        onSaved?.();
      }
    } catch {
      /* toast handled in hook */
    }
  };

  /**
   * Persist the lifted PackagingHierarchyBuilder state to
   * `salsabil_packaging_tiers` via the topological-safe gateway.
   * Off-toggle wipes any existing tiers for the asset.
   *
   * Returns a Map<localTierId, realDbId> so downstream gateways
   * (PricingGateway) can resolve foreign keys to freshly persisted rows.
   * Returns an empty map on the wipe / error paths.
   */
  const persistPackaging = async (assetId: string): Promise<Map<string, string>> => {
    try {
      if (!packagingEnabled || packagingTiers.length === 0) {
        await PackagingGateway.wipeTiers(assetId);
        return new Map();
      }
      const idMap = await PackagingGateway.syncTiers(assetId, packagingTiers);
      toast.success("تمت مزامنة شجرة العبوات بنجاح");
      return idMap;
    } catch (e) {
      Tracer.error("admin", "usa_editor_packaging_sync_failed", e);
      const msg = e instanceof Error ? e.message : "تعذّر حفظ شجرة العبوات";
      toast.error(`⚠️ ${msg}`);
      return new Map();
    }
  };

  /**
   * Phase E-2 — Persist the Cognitive Pricing drafts into
   * `salsabil_financial_contracts`. Runs STRICTLY AFTER persistPackaging
   * so the freshly-allocated tier UUIDs are available via `tierIdMap`.
   *
   * Resilience:
   *   • Resolves the asset's base SKU via `PricingGateway.resolveBaseSku`.
   *   • If no contracts in draft → wipes all contracts for the base SKU.
   *   • If packaging is disabled, the UI only emits a single base-asset
   *     contract (packaging_tier_local_id === null) — gateway persists
   *     it with `packaging_tier_id = NULL`.
   */
  const persistPricing = async (
    assetId: string,
    tierIdMap: Map<string, string>,
  ): Promise<void> => {
    try {
      const baseSkuId = await PricingGateway.resolveBaseSku(assetId);
      if (!baseSkuId) {
        if (financialContractsDraft.length > 0) {
          Tracer.warn("admin", "usa_editor_pricing_skip_no_sku", {});
        }
        return;
      }
      if (financialContractsDraft.length === 0) {
        await PricingGateway.wipeForSku(baseSkuId);
        return;
      }
      await PricingGateway.syncContracts(
        baseSkuId,
        financialContractsDraft,
        tierIdMap,
      );
      toast.success("تمت مزامنة سياسات التسعير الذكي");
    } catch (e) {
      Tracer.error("admin", "usa_editor_pricing_sync_failed", e);
      const msg = e instanceof Error ? e.message : "تعذّر حفظ سياسات التسعير";
      toast.error(`⚠️ ${msg}`);
    }
  };

  /**
   * Phase F-1 — Persist the Living Inventory drafts into
   * `salsabil_inventory_matrix`. Runs STRICTLY AFTER persistPackaging so
   * the freshly-allocated tier UUIDs are available via `tierIdMap`.
   *
   * Resilience:
   *   • Resolves the asset's base SKU via `PricingGateway.resolveBaseSku`.
   *   • If no drafts → wipes all inventory rows for the base SKU.
   *   • Drafts whose tier id cannot be resolved are dropped by the gateway.
   */
  const persistInventory = async (
    assetId: string,
    tierIdMap: Map<string, string>,
  ): Promise<void> => {
    try {
      const baseSkuId = await PricingGateway.resolveBaseSku(assetId);
      if (!baseSkuId) {
        if (inventoryDrafts.length > 0) {
          Tracer.warn("admin", "usa_editor_inventory_skip_no_sku", {});
        }
        return;
      }
      if (inventoryDrafts.length === 0) {
        await InventoryGateway.wipeInventoryForSku(baseSkuId);
        return;
      }
      await InventoryGateway.syncInventory(baseSkuId, inventoryDrafts, tierIdMap);
      toast.success("تمت مزامنة المخزون الحي");
    } catch (e) {
      Tracer.error("admin", "usa_editor_inventory_sync_failed", e);
      const msg = e instanceof Error ? e.message : "تعذّر حفظ المخزون";
      toast.error(`⚠️ ${msg}`);
    }
  };

  /**
   * Phase D-6 — Compute the trait set for a NEW mint, layering capability
   * traits from the toggles on top of any AI-supplied traits.
   */
  const computeMintTraits = (base: unknown): string[] => {
    const traits = new Set<string>(
      Array.isArray(base) ? (base as unknown[]).filter((t): t is string => typeof t === "string") : [],
    );
    if (classificationEnabled && tagDrafts.length > 0) {
      traits.add(CAP.MULTI_CLASSIFICATION);
    } else {
      traits.delete(CAP.MULTI_CLASSIFICATION);
    }
    return Array.from(traits);
  };

  /**
   * Phase D-6 — Persist the multi-dimensional tag graph for an asset.
   * Off-toggle wipes all links. Otherwise upserts vocab + links and
   * deletes any links the Emperor removed in the UI.
   */
  const persistTags = async (assetId: string) => {
    try {
      if (!classificationEnabled || tagDrafts.length === 0) {
        await TagsGateway.wipeLinks(assetId);
        return;
      }
      await TagsGateway.syncLinks(assetId, tagDrafts);
      toast.success("تمت مزامنة الأبعاد التصنيفية");
    } catch (e) {
      Tracer.error("admin", "usa_editor_tag_sync_failed", e);
      const msg = e instanceof Error ? e.message : "تعذّر حفظ الأبعاد";
      toast.error(`⚠️ ${msg}`);
    }
  };

  /**
   * Phase D-6 — On UPDATE, the RPC doesn't touch traits. Reconcile the
   * `traits` JSONB array on `salsabil_assets` so CAP.MULTI_CLASSIFICATION
   * mirrors the toggle state.
   */
  const syncClassificationTrait = async (assetId: string) => {
    try {
      const { HakimGateway } = await import("@/core/hakim-ai/gateway/HakimGateway");
      const current = Array.isArray(asset?.traits)
        ? (asset!.traits as unknown[]).filter((t): t is string => typeof t === "string")
        : [];
      const want = classificationEnabled && tagDrafts.length > 0;
      const has = current.includes(CAP.MULTI_CLASSIFICATION);
      if (want === has) return;
      const next = want
        ? Array.from(new Set([...current, CAP.MULTI_CLASSIFICATION]))
        : current.filter((t) => t !== CAP.MULTI_CLASSIFICATION);
      const { error } = await HakimGateway.updateAssetTraits(assetId, next);
      if (error) throw error;
    } catch (e) {
      Tracer.warn("admin", "usa_editor_trait_sync_failed", { error: String(e) });
    }
  };

  const uploadAiImageIfAny = async (): Promise<string[] | undefined> => {
    if (!aiFile) return undefined;
    try {
      const ext = aiFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const url = await uploadProductImage({
        file: aiFile,
        prefix: "usa-genesis",
        contentType: aiFile.type,
        ext,
      });
      return url ? [url] : undefined;
    } catch (e) {
      Tracer.warn("admin", "usa_editor_media_upload_failed", { error: String(e) });
      toast.error("تعذّر رفع الصورة — سيُسكّ الأصل بدون صورة");
      return undefined;
    }
  };

  const handleAcceptAdvice = () => {
    setDuplicateMatches([]);
    setPendingEmbedding(null);
    setName("");
    setDescription("");
    setBasePrice("");
    setAiDraft(null);
    toast.info("تم إلغاء السكّ — يمكنك الآن إضافة المخزون للأصل الموجود.");
  };

  const handleForceMint = async () => {
    setHasOverriddenAI(true);
    setDuplicateMatches([]);
    await handleSave(true);
  };

  const DuplicateAdvisor = () =>
    duplicateMatches.length > 0 ? (
      <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-extrabold text-amber-900 dark:text-amber-200">
              ⚠️ نصيحة حكيم: يبدو أن هذا الأصل موجود بالفعل في الكتالوج.
            </p>
            <p className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              لمنع تلوث الكتالوج، فكّر بإضافة المخزون للأصل الموجود بدل سكّ نسخة جديدة.
            </p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {duplicateMatches.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 border border-amber-200 dark:border-amber-800"
            >
              <span className="text-[12px] font-semibold truncate">{m.name}</span>
              <span className="text-[10.5px] font-bold num bg-amber-500/15 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                {(m.similarity * 100).toFixed(1)}٪
              </span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            onClick={handleAcceptAdvice}
            className="h-11 rounded-xl bg-emerald-600 text-white text-[12px] font-extrabold press inline-flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" />
            قبول نصيحة حكيم (إلغاء السكّ)
          </Button>
          <Button
            type="button"
            onClick={handleForceMint}
            disabled={isPending}
            className="h-11 rounded-xl bg-rose-600 text-white text-[12px] font-extrabold press inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            تخطي حكيم وسكّ كأصل جديد
          </Button>
        </div>
      </div>
    ) : null;

  const SaveButton = () => (
    <Button
      type="button"
      onClick={() => handleSave(false)}
      disabled={isPending || !name.trim() || duplicateMatches.length > 0}
      className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-[13px] font-extrabold press inline-flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {matchmaker.isChecking
            ? "حكيم يفحص التكرارات…"
            : isNew ? "جاري سكّ الأصل…" : "جاري الحفظ والتزامن…"}
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          {isNew ? "سكّ الأصل العالمي" : "حفظ التعديلات"}
        </>
      )}
    </Button>
  );
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="left"
        dir="rtl"
        className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="px-5 py-3 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
          <SheetTitle className="font-display text-[18px] text-right flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {isNew ? (aiDraft ? "أصل عالمي جديد · مسودة حكيم" : "أصل عالمي جديد") : asset?.name}
          </SheetTitle>
          {asset ? (
            <p className="text-[11px] text-foreground-tertiary text-right">
              {ASSET_TYPE_LABELS[asset.asset_type as AssetType] ?? asset.asset_type} · رقم الأصل {asset.id.slice(0, 8)}
            </p>
          ) : (
            <p className="text-[11px] text-foreground-tertiary text-right">
              أنشئ يدوياً أو ابدأ من تبويب التكوين الذكي.
            </p>
          )}
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-7 h-10">
            <TabsTrigger value="basic" className="text-[11px]">أساسي</TabsTrigger>
            <TabsTrigger value="financials" className="text-[11px]">المالية</TabsTrigger>
            <TabsTrigger value="cognitive" className="text-[11px] gap-1 inline-flex items-center justify-center">
              <Coins className="h-3 w-3" /> الذكي
            </TabsTrigger>
            <TabsTrigger value="packaging" className="text-[11px] gap-1 inline-flex items-center justify-center">
              <Layers className="h-3 w-3" /> العبوات
            </TabsTrigger>
            <TabsTrigger value="dimensions" className="text-[11px] gap-1 inline-flex items-center justify-center">
              <Network className="h-3 w-3" /> الأبعاد
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-[11px]">المخزون</TabsTrigger>
            <TabsTrigger value="genesis" className="text-[11px] gap-1 inline-flex items-center justify-center">
              <Sparkles className="h-3 w-3" /> Vision
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <TabsContent value="basic" className="m-0 space-y-4">
              {aiDraft && isNew && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
                  <Wand2 className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[11.5px] font-bold text-primary">مسودة من حكيم Vision</p>
                    <p className="text-[10.5px] text-foreground-tertiary leading-relaxed">
                      راجع الحقول ثم اضغط "سكّ الأصل العالمي" لاعتماد التكوين.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setAiDraft(null)}
                    className="text-[10.5px] font-bold text-foreground-tertiary hover:text-foreground"
                  >
                    تجاهل
                  </Button>
                </div>
              )}

              <Field label="اسم الأصل">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: زيت زيتون عضوي 1 لتر"
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13.5px] outline-none focus:border-primary"
                />
              </Field>

              {isNew && (
                <Field label="نوع الأصل">
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as AssetType)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  >
                    {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((k) => (
                      <option key={k} value={k}>{ASSET_TYPE_LABELS[k]}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="الوصف" hint="ظاهر للعملاء في المتجر وفي مزامنة المنتجات القديمة.">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="وصف مفصّل للأصل…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary resize-none"
                />
              </Field>
              {isNew && <DuplicateAdvisor />}
              <SaveButton />
            </TabsContent>

            <TabsContent value="financials" className="m-0 space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10.5px] font-bold text-foreground-tertiary">نموذج التسعير</span>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {PRICING_LABELS[pricingModel]}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-tertiary">
                  {isNew
                    ? "اختر النموذج والسعر المبدئي للأصل الجديد."
                    : "يعدّل هذا السعر العقد النشط الأول ويزامن صف المنتج القديم تلقائياً."}
                </p>
              </div>

              {isNew && (
                <Field label="نموذج التسعير">
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value as PricingModel)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  >
                    {(Object.keys(PRICING_LABELS) as PricingModel[]).map((k) => (
                      <option key={k} value={k}>{PRICING_LABELS[k]}</option>
                    ))}
                  </select>
                </Field>
              )}

              {isNew && (
                <Field label="العملة">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "EGP" | "USD" | "EUR")}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </Field>
              )}

              <Field label={`السعر الأساسي (${asset?.currency ?? currency})`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[14px] num font-semibold outline-none focus:border-primary text-left"
                  dir="ltr"
                />
              </Field>
              {isNew && <DuplicateAdvisor />}
              <SaveButton />
            </TabsContent>

            <TabsContent value="cognitive" className="m-0 space-y-3">
              <CognitivePricingBuilder
                packagingTiers={packagingTiers}
                packagingEnabled={packagingEnabled}
                value={financialContractsDraft}
                onChange={setFinancialContractsDraft}
                defaultCurrency={currency}
                defaultPricingModel={pricingModel}
              />
              <p className="text-[10.5px] text-foreground-tertiary leading-relaxed text-center px-2">
                ⚙️ المسودات تُحفظ محلياً — الحفظ الدائم في قاعدة العقود المالية يأتي في المرحلة E-2.
              </p>
            </TabsContent>

            <TabsContent value="packaging" className="m-0 space-y-3">
              <div className="rounded-2xl border border-border bg-background-secondary/40 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[12.5px] font-extrabold">تفعيل شجرة العبوات</p>
                    <p className="text-[10.5px] text-foreground-tertiary">
                      للأصول التي تُباع بأكثر من وحدة (جرام/كجم/كرتونة…).
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const next = !packagingEnabled;
                    setPackagingEnabled(next);
                    if (!next) setPackagingTiers([]);
                  }}
                  className={`h-8 px-3 rounded-full text-[11px] font-extrabold press border ${
                    packagingEnabled
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground-tertiary"
                  }`}
                >
                  {packagingEnabled ? "مفعّل" : "غير مفعّل"}
                </Button>
              </div>

              {packagingEnabled ? (
                <PackagingHierarchyBuilder
                  assetId={asset?.id ?? null}
                  value={packagingTiers}
                  onChange={setPackagingTiers}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-background-secondary/40 p-6 text-center">
                  <Layers className="h-7 w-7 text-primary mx-auto mb-2" />
                  <p className="text-[12.5px] font-display">شجرة العبوات معطّلة</p>
                  <p className="text-[10.5px] text-foreground-tertiary mt-1 leading-relaxed">
                    فعّل الميزة من الأعلى لبناء هرم وحدات البيع (Pallet → Carton → kg → g).
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="dimensions" className="m-0 space-y-3">
              <div className="rounded-2xl border border-border bg-background-secondary/40 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[12.5px] font-extrabold">تفعيل التصنيف متعدد الأبعاد</p>
                    <p className="text-[10.5px] text-foreground-tertiary">
                      اربط الأصل بأكثر من محور (قسم · حملة · نظام غذائي · سرعة…).
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const next = !classificationEnabled;
                    setClassificationEnabled(next);
                    if (!next) setTagDrafts([]);
                  }}
                  className={`h-8 px-3 rounded-full text-[11px] font-extrabold press border ${
                    classificationEnabled
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground-tertiary"
                  }`}
                >
                  {classificationEnabled ? "مفعّل" : "غير مفعّل"}
                </Button>
              </div>

              {classificationEnabled ? (
                <DimensionalTagSelector
                  assetId={asset?.id ?? null}
                  value={tagDrafts}
                  onChange={setTagDrafts}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-background-secondary/40 p-6 text-center">
                  <Network className="h-7 w-7 text-primary mx-auto mb-2" />
                  <p className="text-[12.5px] font-display">التصنيف متعدد الأبعاد معطّل</p>
                  <p className="text-[10.5px] text-foreground-tertiary mt-1 leading-relaxed">
                    فعّل الميزة لربط الأصل بمحاور متعددة في وقت واحد.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="inventory" className="m-0 space-y-4">
              <LivingInventoryBuilder
                packagingTiers={packagingTiers}
                packagingEnabled={packagingEnabled}
                value={inventoryDrafts}
                onChange={setInventoryDrafts}
              />

              {asset && assetType === "physical" && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10.5px] font-bold text-foreground-tertiary mb-2">
                    📊 لقطة المخزون الحالي عبر الفروع
                  </p>
                  <InventoryMatrixPanel assetId={asset.id} />
                </div>
              )}

              {!asset && (
                <p className="text-[10.5px] text-foreground-tertiary leading-relaxed text-center px-2">
                  💡 يتم تثبيت قيم المخزون بعد سكّ الأصل وتوليد SKU الأساسي.
                </p>
              )}
            </TabsContent>

            <TabsContent value="genesis" className="m-0">
              <VisionGenesisUploader handoffOnly onApprove={handleAIHandoff} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="bg-background/95 backdrop-blur border-t border-border/40 px-5 py-3 flex gap-2">
          <Button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-surface-muted text-[14px] font-semibold press">
            إغلاق
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
