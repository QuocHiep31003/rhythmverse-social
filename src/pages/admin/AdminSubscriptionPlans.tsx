import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { subscriptionPlanApi, SubscriptionPlanDTO, PlanFeatureDTO, PlanDetailDTO } from "@/services/api/subscriptionPlanApi";
import { FeatureName } from "@/services/api/featureUsageApi";
import { Plus, Edit, Trash2, Save, X, RefreshCw, Package, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FEATURE_OPTIONS: { value: FeatureName; label: string }[] = [
  { value: FeatureName.PLAYLIST_CREATE, label: "Create Playlist" },
  { value: FeatureName.FRIEND_LIMIT, label: "Friend Limit" },
  { value: FeatureName.AI_SEARCH, label: "AI Search" },
  { value: FeatureName.ADVANCED_ANALYTICS, label: "Advanced Analytics" },
];

const DEFAULT_PLAN_CODES: string[] = ["FREE", "PREMIUM"];
const DEFAULT_PLANS = [...DEFAULT_PLAN_CODES]; // Default plans cannot be deleted

const AdminSubscriptionPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanDTO | null>(null);
  const [formData, setFormData] = useState<Partial<SubscriptionPlanDTO>>({
    planCode: "",
    planName: "",
    description: "",
    isActive: true,
    displayOrder: 0,
    features: [],
    details: [],
  });

  const formatNumber = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "";
    return value.toLocaleString("vi-VN");
  };

  const parseNumber = (value: string) => {
    const numeric = value.replace(/[^\d]/g, "");
    return numeric ? parseInt(numeric, 10) : 0;
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const ensureMonthlyRecommended = (details: PlanDetailDTO[] = []) => {
    if (!details.length) return details;
    if (details.some(detail => detail.isRecommended)) return details;
    const monthlyIndex = details.findIndex(
      detail =>
        typeof detail.durationDays === "number" &&
        detail.durationDays >= 28 &&
        detail.durationDays <= 35
    );
    const targetIndex = monthlyIndex !== -1 ? monthlyIndex : 0;
    return details.map((detail, index) => ({
      ...detail,
      isRecommended: index === targetIndex,
    }));
  };

  // Sort so FREE and PREMIUM always display first
  const sortPlansWithDefaultsFirst = (plans: SubscriptionPlanDTO[]): SubscriptionPlanDTO[] => {
    const defaultPlans: SubscriptionPlanDTO[] = [];
    const otherPlans: SubscriptionPlanDTO[] = [];
    
    plans.forEach(plan => {
      const planCode = plan.planCode?.toUpperCase();
      if (planCode && DEFAULT_PLAN_CODES.includes(planCode)) {
        defaultPlans.push(plan);
      } else {
        otherPlans.push(plan);
      }
    });
    
    // Sắp xếp default plans theo thứ tự định nghĩa sẵn
    defaultPlans.sort((a, b) => {
      const aCode = a.planCode?.toUpperCase() || "";
      const bCode = b.planCode?.toUpperCase() || "";
      return DEFAULT_PLAN_CODES.indexOf(aCode) - DEFAULT_PLAN_CODES.indexOf(bCode);
    });
    
    // Sắp xếp other plans theo displayOrder
    otherPlans.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    return [...defaultPlans, ...otherPlans];
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      
      // Always ensure default plans exist before loading
      try {
        await subscriptionPlanApi.seedDefaultPlans();
      } catch (seedError: any) {
        // Ignore error nếu đã có gói rồi (409 conflict hoặc tương tự)
        console.log("Seed check:", seedError?.message || "Default plans already exist");
      }
      
      // Load danh sách gói từ API
      const data = await subscriptionPlanApi.getAllPlans();
      const plansList = data || [];
      
      // Đảm bảo ít nhất có đủ các gói mặc định
      const missingDefaultCodes = DEFAULT_PLAN_CODES.filter(
        (code) => !plansList.some((p) => p.planCode?.toUpperCase() === code)
      );
      
      // Nếu vẫn thiếu sau khi seed, thử lại một lần nữa
      if (missingDefaultCodes.length > 0) {
        console.warn("Missing default plans, retrying seed...", missingDefaultCodes);
        try {
          await subscriptionPlanApi.seedDefaultPlans();
          const updatedData = await subscriptionPlanApi.getAllPlans();
          // Sort: FREE and PREMIUM always display first
          const sorted = sortPlansWithDefaultsFirst(updatedData || []);
          setPlans(sorted);
        } catch (retryError: any) {
          console.error("Error retrying seed:", retryError);
          const sorted = sortPlansWithDefaultsFirst(plansList);
          setPlans(sorted);
        }
      } else {
        // Sắp xếp: FREE, PREMIUM và PREMIUM_YEARLY luôn hiển thị đầu tiên
        const sorted = sortPlansWithDefaultsFirst(plansList);
        setPlans(sorted);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Unable to load plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plan?: SubscriptionPlanDTO) => {
    if (plan) {
      setEditingPlan(plan);
      // Đảm bảo có đủ 4 tính năng, nếu thiếu thì thêm các tính năng mặc định
      const existingFeatures = plan.features || [];
      const allFeatures = FEATURE_OPTIONS.map(opt => {
        const existing = existingFeatures.find(f => f.featureName === opt.value);
        if (existing) {
          return {
            ...existing,
            isEnabled: existing.isEnabled ?? true,
            limitValue: existing.limitValue ?? null,
            limitCycle: existing.limitCycle,
          };
        }
        // Nếu chưa có, tạo mặc định
        // FREE plan: Friend Limit = 20, các tính năng khác = unlimited
        // Các plan khác: tất cả = unlimited
        const isFreePlan = plan.planCode?.toUpperCase() === "FREE";
        const isFriendLimit = opt.value === FeatureName.FRIEND_LIMIT;
        return {
          featureName: opt.value,
          limitValue: isFreePlan && isFriendLimit ? 20 : null, // FREE plan: 20 friends, others: unlimited
          isEnabled: true,
          limitCycle: isFreePlan && isFriendLimit ? "NONE" : undefined, // Friend limit không có cycle
        };
      });
      setFormData({
        planCode: plan.planCode,
        planName: plan.planName,
        description: plan.description || "",
        isActive: plan.isActive ?? true,
        displayOrder: plan.displayOrder || 0,
        features: allFeatures,
        details: ensureMonthlyRecommended(plan.details || []),
      });
    } else {
      setEditingPlan(null);
      // Tạo mặc định 4 tính năng với unlimited
      const defaultFeatures = FEATURE_OPTIONS.map(opt => ({
        featureName: opt.value,
        limitValue: null, // null = unlimited
        isEnabled: true,
      }));
      setFormData({
        planCode: "",
        planName: "",
        description: "",
        isActive: true,
        displayOrder: 0,
        features: defaultFeatures,
        details: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  // Không cần handleAddFeature và handleRemoveFeature nữa vì luôn có đủ 4 tính năng

  const handleToggleUnlimited = (index: number, isUnlimited: boolean) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = {
      ...newFeatures[index],
      limitValue: isUnlimited ? null : 0, // Nếu chuyển từ unlimited sang limited, mặc định là 0
    };
    setFormData({ ...formData, features: newFeatures });
  };

  const handleLimitValueChange = (index: number, value: number | null) => {
    const newFeatures = [...(formData.features || [])];
    const isFriendLimit = newFeatures[index].featureName === FeatureName.FRIEND_LIMIT;
    // Nếu nhập số > 0, tự động tắt unlimited (set limitValue)
    // Nếu nhập 0, vẫn là limited nhưng không cho dùng
    newFeatures[index] = {
      ...newFeatures[index],
      limitValue: value,
      // Friend limit không có cycle, các tính năng khác có cycle
      limitCycle: isFriendLimit ? undefined : (value && value > 0 ? (newFeatures[index].limitCycle || "DAILY") : undefined),
    };
    setFormData({ ...formData, features: newFeatures });
  };

  const handleLimitCycleChange = (index: number, cycle: string) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = {
      ...newFeatures[index],
      limitCycle: cycle === "NONE" ? undefined : cycle,
    };
    setFormData({ ...formData, features: newFeatures });
  };

  // Không cần sắp xếp nữa, giữ nguyên thứ tự 4 tính năng
  const sortedFeatures = formData.features || [];
  const descriptionLength = formData.description?.length || 0;
  const descriptionCounterClass = descriptionLength > 270 ? "text-destructive" : "text-muted-foreground";

  // Không cần drag and drop nữa vì luôn có đủ 4 tính năng cố định

  // PlanDetail handlers
  const handleAddDetail = () => {
    const newDetail: PlanDetailDTO = {
      detailName: "",
      price: 0,
      currency: "VND",
      durationDays: 30,
      isActive: true,
      displayOrder: (formData.details?.length || 0),
      isRecommended: false,
    };
    setFormData({
      ...formData,
      details: ensureMonthlyRecommended([...(formData.details || []), newDetail]),
    });
  };

  const handleRemoveDetail = (index: number) => {
    const newDetails = formData.details?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, details: newDetails });
  };

  const handleDetailChange = (index: number, field: keyof PlanDetailDTO, value: any) => {
    let newDetails = [...(formData.details || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };

    if (field === "isRecommended" && value === true) {
      newDetails = newDetails.map((detail, idx) => ({
        ...detail,
        isRecommended: idx === index,
      }));
    }

    setFormData({ ...formData, details: ensureMonthlyRecommended(newDetails) });
  };

  const handlePriceInputChange = (index: number, rawValue: string) => {
    const numericValue = parseNumber(rawValue);
    handleDetailChange(index, "price", numericValue);
  };

  const handleSave = async () => {
    try {
      // Normalize features trước khi gửi - đảm bảo có đủ 4 tính năng
      const normalizedFeatures = (formData.features || []).map(f => {
        // Logic đơn giản:
        // - limitValue = null → UNLIMITED
        // - limitValue = 0 → LIMITED nhưng không cho dùng
        // - limitValue > 0 → LIMITED với giới hạn
        const finalLimitValue = f.limitValue;
        
        return {
          featureName: f.featureName || FeatureName.PLAYLIST_CREATE,
          limitValue: finalLimitValue,
          limitCycle: finalLimitValue && finalLimitValue > 0 ? (f.limitCycle || "DAILY") : undefined,
          isEnabled: finalLimitValue === null || (finalLimitValue !== null && finalLimitValue > 0),
          // Giữ lại các field khác nếu có
          ...(f.id && { id: f.id }),
          ...(f.planId && { planId: f.planId }),
          ...(f.featureDisplayName && { featureDisplayName: f.featureDisplayName }),
        };
      });

      // Normalize details
      const normalizedDetails = (formData.details || []).map(d => ({
        detailName: d.detailName || "",
        price: d.price || 0,
        currency: d.currency || "VND",
        durationDays: d.durationDays || 30,
        isActive: d.isActive ?? true,
        displayOrder: d.displayOrder || 0,
        isRecommended: d.isRecommended ?? false,
        ...(d.id && { id: d.id }),
        ...(d.planId && { planId: d.planId }),
      }));

      if (editingPlan?.id) {
        const payload: SubscriptionPlanDTO = {
          ...editingPlan,
          ...formData,
          id: editingPlan.id,
          planCode: formData.planCode || editingPlan.planCode || "",
          features: normalizedFeatures,
          details: normalizedDetails,
        };

        await subscriptionPlanApi.updatePlan(editingPlan.id, payload);
        toast({
          title: "Success",
          description: "Plan updated successfully",
        });
      } else {
        const payload: SubscriptionPlanDTO = {
          ...formData,
          features: normalizedFeatures,
          details: normalizedDetails,
        } as SubscriptionPlanDTO;

        await subscriptionPlanApi.createPlan(payload);
        toast({
          title: "Success",
          description: "New plan created successfully",
        });
      }
      handleCloseDialog();
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Unable to save plan",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number, planCode?: string) => {
    const isDefaultPlan = planCode && DEFAULT_PLANS.includes(planCode.toUpperCase());
    
    if (isDefaultPlan) {
      toast({
        title: "Not allowed",
        description: "You cannot delete default plans (FREE, PREMIUM). You can only edit them.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      await subscriptionPlanApi.deletePlan(id);
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Unable to delete plan",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span>Loading plans...</span>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen overflow-hidden p-6 flex flex-col">
        <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">
                  Subscription Plans
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-normal">
                    {plans.length} plans visible
                  </Badge>
                  
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={loadPlans}
                className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Create plan
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-invoice pb-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const isDefaultPlan = plan.planCode && DEFAULT_PLANS.includes(plan.planCode.toUpperCase());
                  const featureCount = plan.features?.length || 0;
                  const priceOptionsCount = plan.details?.length || 0;
                  const isActivePlan = plan.isActive ?? true;
                  return (
                    <div
                      key={plan.id}
                      className={`group relative rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-1 ${
                        isDefaultPlan ? "border-primary/40 shadow-primary/20" : ""
                      }`}
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 ${
                          isDefaultPlan
                            ? "bg-gradient-to-br from-primary/10 via-transparent to-transparent"
                            : "bg-gradient-to-br from-[hsl(var(--admin-hover))]/10 via-transparent to-transparent"
                        }`}
                      />
                      <div className="relative flex h-full flex-col gap-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                              <Package className="h-5 w-5 text-primary" />
                              <span>{plan.planName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant={isActivePlan ? "default" : "secondary"} className="uppercase tracking-wide">
                                {plan.planCode}
                              </Badge>
                              {isDefaultPlan ? (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Default plan
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {isActivePlan ? "Active" : "Hidden"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(plan)}
                              title="Edit"
                              className="hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!isDefaultPlan && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => plan.id && handleDelete(plan.id, plan.planCode)}
                                title="Delete"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-4 min-h-[64px]">
                          {plan.description || "No description for this plan yet."}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-black/10 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Features</p>
                            <p className="text-2xl font-bold text-foreground">{featureCount}</p>
                            <p className="text-xs text-muted-foreground">Flexible limit customization</p>
                          </div>
                          <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-black/10 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pricing options</p>
                            <p className="text-2xl font-bold text-foreground">{priceOptionsCount}</p>
                            <p className="text-xs text-muted-foreground">Configured billing options</p>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Last updated:{" "}
                            {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : "Unknown"}
                          </span>
                          <span className="font-medium text-foreground">
                            {isActivePlan ? "Available" : "Hidden"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-invoice bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit plan" : "Create new plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update subscription plan information"
                : "Create a new subscription plan with features and limits"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <section className="rounded-2xl border-2 border-[hsl(var(--admin-border))] bg-gradient-to-br from-[hsl(var(--admin-card))] to-[hsl(var(--admin-card))]/80 shadow-lg p-6 space-y-5">
              <div className="pb-3 border-b border-[hsl(var(--admin-border))]">
                <Label className="text-lg font-semibold text-[hsl(var(--admin-active-foreground))]">Plan Details</Label>
                <p className="text-sm text-muted-foreground mt-1">Configure the basic information for this subscription plan.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="planCode" className="text-sm font-medium">Plan code *</Label>
                  <Input
                    id="planCode"
                    value={formData.planCode}
                    onChange={(e) => setFormData({ ...formData, planCode: e.target.value.toUpperCase() })}
                    placeholder="BASIC, PREMIUM, PRO"
                    className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))] h-11 focus:border-primary transition-colors"
                  />
                  {editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase()) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <span>⚠</span>
                      Note: Changing default plan codes may affect system logic.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planName" className="text-sm font-medium">Plan name *</Label>
                  <Input
                    id="planName"
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    placeholder="Basic Plan"
                    className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))] h-11 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <span className={`text-xs font-medium ${descriptionCounterClass}`}>{descriptionLength}/300</span>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 300) {
                      setFormData({ ...formData, description: value });
                    }
                  }}
                  placeholder="Briefly describe the main benefits of this plan..."
                  maxLength={300}
                  rows={4}
                  className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))] focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder" className="text-sm font-medium">Display order</Label>
                  <Input
                    id="displayOrder"
                    inputMode="numeric"
                    value={formatNumber(formData.displayOrder)}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseNumber(e.target.value) })}
                    placeholder="Example: 1"
                    className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))] h-11 focus:border-primary transition-colors"
                  />
                </div>
                <div className="rounded-xl border-2 border-[hsl(var(--admin-border))] bg-gradient-to-r from-[hsl(var(--admin-card))]/60 to-[hsl(var(--admin-card))]/40 p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Plan status</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.isActive ? "Plan is visible to users" : "Plan is hidden and cannot be purchased"}
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[hsl(var(--admin-border))] bg-gradient-to-br from-[hsl(var(--admin-card))] to-[hsl(var(--admin-card))]/80 shadow-lg p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[hsl(var(--admin-border))]">
                <div>
                  <Label className="text-lg font-semibold text-[hsl(var(--admin-active-foreground))]">Default Features</Label>
                  <p className="text-sm text-muted-foreground mt-1">Each plan always has 4 features; you only configure limits.</p>
                </div>
                <Badge variant="secondary" className="text-xs px-3 py-1">
                  All plans share these 4 features
                </Badge>
              </div>

              {sortedFeatures.length > 0 ? (
                <div className="space-y-3">
                  {sortedFeatures.map((feature, index) => {
                    const isUnlimited = feature.limitValue === null;
                    const isDisabled = feature.limitValue === 0;
                    const featureLabel =
                      FEATURE_OPTIONS.find((opt) => opt.value === feature.featureName)?.label ||
                      feature.featureName;
                    const isFriendLimit = feature.featureName === FeatureName.FRIEND_LIMIT;
                    const showCycle = !isUnlimited && !isFriendLimit; // Friend limit không có cycle

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] transition-colors ${
                          isDisabled ? "opacity-60" : "hover:bg-[hsl(var(--admin-hover))]"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr_1fr] gap-3 md:gap-4 p-4 items-center">
                          {/* Feature Name */}
                          <div className="flex items-center justify-between md:justify-start">
                            <p className="font-medium text-sm text-[hsl(var(--admin-active-foreground))]">
                              {featureLabel}
                            </p>
                          </div>

                          {/* Toggle & status */}
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`toggle-${index}`}
                              checked={isUnlimited}
                              onCheckedChange={(checked) => handleToggleUnlimited(index, checked)}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {isUnlimited
                                ? "Unlimited"
                                : isDisabled
                                ? "Disabled"
                                : "Limited"}
                            </span>
                          </div>

                          {/* Limit Input */}
                          <div className="flex items-center gap-2">
                            {isUnlimited ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder={isFriendLimit ? "Max friends" : "Number of uses"}
                                  value={feature.limitValue || 0}
                                  onChange={(e) => {
                                    const numValue =
                                      e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                    if (numValue >= 0) {
                                      handleLimitValueChange(index, numValue);
                                    }
                                  }}
                                  className="w-24 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))] h-9 text-sm"
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {isFriendLimit
                                    ? feature.limitValue === 0
                                      ? "(Disabled)"
                                      : "friends"
                                    : feature.limitValue === 0
                                    ? "(Disabled)"
                                    : "uses"}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Cycle Select or placeholder */}
                          <div className="flex items-center">
                            {showCycle ? (
                              <Select
                                value={feature.limitCycle || "DAILY"}
                                onValueChange={(value) => handleLimitCycleChange(index, value)}
                              >
                                <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))] h-9 text-sm">
                                  <SelectValue placeholder="Select cycle" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DAILY">Daily</SelectItem>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[hsl(var(--admin-border))] p-8 text-center">
                  <p className="text-sm text-muted-foreground">No features found for this plan.</p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border-2 border-[hsl(var(--admin-border))] bg-gradient-to-br from-[hsl(var(--admin-card))] to-[hsl(var(--admin-card))]/80 shadow-lg p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[hsl(var(--admin-border))]">
                <div>
                  <Label className="text-lg font-semibold text-[hsl(var(--admin-active-foreground))]">Pricing / Duration Options</Label>
                  <p className="text-sm text-muted-foreground mt-1">Add multiple billing options to optimize conversion.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddDetail} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add option
                </Button>
              </div>

              {formData.details && formData.details.length > 0 ? (
                <div className="space-y-3">
                  {formData.details.map((detail, index) => {
                    const isRecommended = detail.isRecommended ?? false;
                    return (
                      <div
                        key={index}
                        className={`rounded-xl border p-4 space-y-4 transition ${
                          isRecommended ? "border-primary/60 bg-primary/5" : "border-[hsl(var(--admin-border))]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Option #{index + 1}</p>
                          {isRecommended && (
                            <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Option name</Label>
                            <Input
                              value={detail.detailName || ""}
                              onChange={(e) => handleDetailChange(index, "detailName", e.target.value)}
                              placeholder="Example: 1 month"
                              className="w-full bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Price</Label>
                            <Input
                              inputMode="numeric"
                              value={formatNumber(detail.price)}
                              onChange={(e) => handlePriceInputChange(index, e.target.value)}
                              placeholder="99.000"
                              className="w-full bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Duration (days)</Label>
                            <Input
                              type="number"
                              value={detail.durationDays || 30}
                              onChange={(e) =>
                                handleDetailChange(index, "durationDays", Math.max(parseNumber(e.target.value), 1))
                              }
                              placeholder="30"
                              className="w-full bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </div>
                          <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Display order</Label>
                            <Input
                              type="number"
                              value={detail.displayOrder || 0}
                              onChange={(e) => handleDetailChange(index, "displayOrder", parseNumber(e.target.value))}
                              placeholder="0"
                              className="w-full bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={isRecommended}
                              onCheckedChange={(checked) => handleDetailChange(index, "isRecommended", checked)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {isRecommended ? "This option is highlighted as recommended." : "Enable to recommend this option to users."}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDetail(index)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[hsl(var(--admin-border))] p-6 text-center text-sm text-muted-foreground">
                  No options yet. Click “Add option” to create the first pricing option.
                </div>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSubscriptionPlans;


