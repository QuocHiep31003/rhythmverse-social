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
        const isPlaylistCreate = opt.value === FeatureName.PLAYLIST_CREATE;
        return {
          featureName: opt.value,
          limitValue: isFreePlan && isFriendLimit ? 20 : null, // FREE plan: 20 friends, others: unlimited
          isEnabled: true,
          limitCycle: (isFreePlan && isFriendLimit) || isPlaylistCreate ? "NONE" : undefined, // Friend limit và Playlist Create không có cycle
        };
      });
      // Lock planName for default plans: PREMIUM = "Premium", FREE = keep original
      const isDefaultPlan = plan.planCode && DEFAULT_PLANS.includes(plan.planCode.toUpperCase());
      const finalPlanName = isDefaultPlan && plan.planCode?.toUpperCase() === "PREMIUM" 
        ? "Premium" 
        : plan.planName;
      
      setFormData({
        planCode: plan.planCode,
        planName: finalPlanName,
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
    const isPlaylistCreate = newFeatures[index].featureName === FeatureName.PLAYLIST_CREATE;
    // Nếu nhập số > 0, tự động tắt unlimited (set limitValue)
    // Nếu nhập 0, vẫn là limited nhưng không cho dùng
    newFeatures[index] = {
      ...newFeatures[index],
      limitValue: value,
      // Friend limit và Playlist Create không có cycle, các tính năng khác có cycle
      limitCycle: (isFriendLimit || isPlaylistCreate) ? undefined : (value && value > 0 ? (newFeatures[index].limitCycle || "DAILY") : undefined),
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
    const isDefaultPlan =
      (editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase())) ||
      (formData.planCode && DEFAULT_PLANS.includes(formData.planCode.toUpperCase()));

    const newDetail: PlanDetailDTO = {
      detailName: "",
      price: 0,
      currency: "VND",
      durationDays: isDefaultPlan ? 30 : 0, // credit-based: duration not used
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
        const isFriendLimit = f.featureName === FeatureName.FRIEND_LIMIT;
        const isPlaylistCreate = f.featureName === FeatureName.PLAYLIST_CREATE;
        
        return {
          featureName: f.featureName || FeatureName.PLAYLIST_CREATE,
          limitValue: finalLimitValue,
          limitCycle: (isFriendLimit || isPlaylistCreate) ? undefined : (finalLimitValue && finalLimitValue > 0 ? (f.limitCycle || "DAILY") : undefined),
          isEnabled: finalLimitValue === null || (finalLimitValue !== null && finalLimitValue > 0),
          // Giữ lại các field khác nếu có
          ...(f.id && { id: f.id }),
          ...(f.planId && { planId: f.planId }),
          ...(f.featureDisplayName && { featureDisplayName: f.featureDisplayName }),
        };
      });

      // Normalize details
      const isDefaultPlanForSave =
        (editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase())) ||
        (formData.planCode && DEFAULT_PLANS.includes(formData.planCode.toUpperCase()));

      const normalizedDetails = (formData.details || []).map(d => {
        const durationDays = isDefaultPlanForSave
          ? Math.max(d.durationDays ?? 30, 1) // ensure positive and never null for default plans
          : 0; // credit-based plans use 0 to satisfy NOT NULL while meaning "no expiry"

        return {
          detailName: d.detailName || "",
          price: d.price || 0,
        currency: d.currency || "VND",
          durationDays,
          isActive: d.isActive ?? true,
          displayOrder: d.displayOrder || 0,
          isRecommended: d.isRecommended ?? false,
          ...(d.id && { id: d.id }),
          ...(d.planId && { planId: d.planId }),
        };
      });

      if (editingPlan?.id) {
        // Lock planCode and planName for default plans
        const isDefaultPlan = editingPlan.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase());
        const finalPlanCode = isDefaultPlan ? editingPlan.planCode : (formData.planCode || editingPlan.planCode || "");
        const finalPlanName = isDefaultPlan 
          ? (editingPlan.planCode?.toUpperCase() === "PREMIUM" ? "Premium" : editingPlan.planName)
          : (formData.planName || editingPlan.planName || "");
        
        const payload: SubscriptionPlanDTO = {
          ...editingPlan,
          ...formData,
          id: editingPlan.id,
          planCode: finalPlanCode,
          planName: finalPlanName,
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
        <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Header Section with Modern Design */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
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
                  {loading && <span className="text-xs">Loading...</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={loadPlans}
                className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button 
                onClick={() => handleOpenDialog()} 
                className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Create Plan
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-invoice pb-6">
              {plans.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No subscription plans yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Get started by creating your first subscription plan</p>
                  <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Plan
                  </Button>
                </div>
              ) : (
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
                          <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-muted/30 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Features</p>
                            <p className="text-2xl font-bold text-foreground">{featureCount}</p>
                            <p className="text-xs text-muted-foreground">Flexible limit customization</p>
                          </div>
                          <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-muted/30 p-3">
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
              )}
            </div>
          </div>
        </div>
      </div>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto scrollbar-invoice bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]">
          <DialogHeader className="pb-4 border-b border-[hsl(var(--admin-border))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {editingPlan ? (
                  <Edit className="w-5 h-5 text-primary" />
                ) : (
                  <Plus className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}
                </DialogTitle>
                <DialogDescription className="mt-1.5">
                  {editingPlan
                    ? "Update plan information, features, and pricing options"
                    : "Configure a new subscription plan with features and limits"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <section className="rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--admin-border))]">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <Label className="text-lg font-semibold text-[hsl(var(--admin-active-foreground))]">Plan Information</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Basic details about this subscription plan</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planCode" className="text-sm font-medium flex items-center gap-2">
                    Plan Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="planCode"
                    value={formData.planCode}
                    onChange={(e) => setFormData({ ...formData, planCode: e.target.value.toUpperCase() })}
                    placeholder="BASIC, PREMIUM, PRO"
                    disabled={editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase())}
                    className="h-10 bg-background border-[hsl(var(--admin-border))] focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase()) && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5 mt-1">
                      <span className="text-base">⚠️</span>
                      Default plan code cannot be changed
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planName" className="text-sm font-medium flex items-center gap-2">
                    Plan Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="planName"
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    placeholder="Basic Plan"
                    disabled={editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase())}
                    className="h-10 bg-background border-[hsl(var(--admin-border))] focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase()) && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5 mt-1">
                      <span className="text-base">⚠️</span>
                      Default plan name cannot be changed
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <span className={`text-xs font-medium ${descriptionCounterClass}`}>
                    {descriptionLength}/300
                  </span>
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
                  rows={3}
                  className="bg-background border-[hsl(var(--admin-border))] focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder" className="text-sm font-medium">Display Order</Label>
                  <Input
                    id="displayOrder"
                    inputMode="numeric"
                    type="number"
                    value={formData.displayOrder || 0}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseNumber(e.target.value) })}
                    placeholder="0"
                    className="h-10 bg-background border-[hsl(var(--admin-border))] focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                </div>
                <div className="rounded-lg border border-[hsl(var(--admin-border))] bg-muted/30 p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="isActive" className="text-sm font-medium">Plan Status</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.isActive ? "Visible to users" : "Hidden from users"}
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

            <section className="rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-sm p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--admin-border))]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-[hsl(var(--admin-active-foreground))]">Feature Limits</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure usage limits for each feature</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs px-2.5 py-1">
                  4 features
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
                    const isPlaylistCreate = feature.featureName === FeatureName.PLAYLIST_CREATE;
                    const showCycle = !isUnlimited && !isFriendLimit && !isPlaylistCreate; // Friend limit và Playlist Create không có cycle

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border border-[hsl(var(--admin-border))] bg-muted/20 transition-all ${
                          isDisabled ? "opacity-50" : "hover:bg-muted/40 hover:border-primary/20"
                        }`}
                      >
                        <div className="p-4 space-y-4">
                          {/* Feature Name Row */}
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm text-foreground">
                              {featureLabel}
                            </p>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`toggle-${index}`}
                                checked={isUnlimited}
                                onCheckedChange={(checked) => handleToggleUnlimited(index, checked)}
                                className="data-[state=checked]:bg-primary"
                              />
                              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[70px] text-right">
                                {isUnlimited
                                  ? "Unlimited"
                                  : isDisabled
                                  ? "Disabled"
                                  : "Limited"}
                              </span>
                            </div>
                          </div>

                          {/* Limit Configuration Row */}
                          {!isUnlimited && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[hsl(var(--admin-border))]">
                              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <Label htmlFor={`limit-${index}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                  {isFriendLimit ? "Max friends:" : "Usage limit:"}
                                </Label>
                                <Input
                                  id={`limit-${index}`}
                                  type="number"
                                  min="0"
                                  placeholder={isFriendLimit ? "20" : "10"}
                                  value={feature.limitValue || 0}
                                  onChange={(e) => {
                                    const numValue =
                                      e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                    if (numValue >= 0) {
                                      handleLimitValueChange(index, numValue);
                                    }
                                  }}
                                  className="w-24 h-8 bg-background border-[hsl(var(--admin-border))] text-sm"
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {isFriendLimit
                                    ? feature.limitValue === 0
                                      ? "(disabled)"
                                      : "friends"
                                    : feature.limitValue === 0
                                    ? "(disabled)"
                                    : "times"}
                                </span>
                              </div>

                              {/* Cycle Select */}
                              {showCycle && (
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`cycle-${index}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    Reset cycle:
                                  </Label>
                                  <Select
                                    value={feature.limitCycle || "DAILY"}
                                    onValueChange={(value) => handleLimitCycleChange(index, value)}
                                  >
                                    <SelectTrigger id={`cycle-${index}`} className="w-[120px] h-8 bg-background border-[hsl(var(--admin-border))] text-xs">
                                      <SelectValue placeholder="Select cycle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="DAILY">Daily</SelectItem>
                                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          )}
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

            <section className="rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-sm p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--admin-border))]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-[hsl(var(--admin-active-foreground))]">Pricing Options</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure billing periods and prices</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddDetail} className="gap-2 h-9">
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              </div>

              {formData.details && formData.details.length > 0 ? (
                <div className="space-y-3">
                  {formData.details.map((detail, index) => {
                    const isRecommended = detail.isRecommended ?? false;
                    const isDefaultPlan = editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase());
                    return (
                      <div
                        key={index}
                        className={`rounded-lg border p-4 space-y-4 transition-all ${
                          isRecommended 
                            ? "border-primary/50 bg-primary/5 shadow-sm" 
                            : "border-[hsl(var(--admin-border))] bg-muted/20 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">Option #{index + 1}</span>
                            {isRecommended && (
                              <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                                ⭐ Recommended
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDetail(index)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">Option Name</Label>
                            <Input
                              value={detail.detailName || ""}
                              onChange={(e) => handleDetailChange(index, "detailName", e.target.value)}
                              placeholder="e.g., 1 month"
                              className="h-9 bg-background border-[hsl(var(--admin-border))] text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">Price (VND)</Label>
                            <Input
                              inputMode="numeric"
                              value={formatNumber(detail.price)}
                              onChange={(e) => handlePriceInputChange(index, e.target.value)}
                              placeholder="99,000"
                              className="h-9 bg-background border-[hsl(var(--admin-border))] text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">Display Order</Label>
                            <Input
                              type="number"
                              min="0"
                              value={detail.displayOrder || 0}
                              onChange={(e) => handleDetailChange(index, "displayOrder", parseNumber(e.target.value))}
                              placeholder="0"
                              className="h-9 bg-background border-[hsl(var(--admin-border))] text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t border-[hsl(var(--admin-border))]">
                          <Switch
                            checked={isRecommended}
                            onCheckedChange={(checked) => handleDetailChange(index, "isRecommended", checked)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <Label htmlFor={`recommended-${index}`} className="text-xs text-muted-foreground cursor-pointer">
                            Mark as recommended option
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[hsl(var(--admin-border))] p-8 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No pricing options yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Add Option" to create the first one</p>
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="pt-4 border-t border-[hsl(var(--admin-border))] gap-2">
            <Button variant="outline" onClick={handleCloseDialog} className="h-10">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-10 gap-2">
              <Save className="h-4 w-4" />
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSubscriptionPlans;


