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
import { Plus, Edit, Trash2, Save, X, RefreshCw, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const FEATURE_OPTIONS: { value: FeatureName; label: string }[] = [
  { value: FeatureName.PLAYLIST_CREATE, label: "Create Playlist" },
  { value: FeatureName.OFFLINE_DOWNLOAD, label: "Offline Download" },
  { value: FeatureName.AI_SEARCH, label: "AI Search" },
  { value: FeatureName.ADVANCED_ANALYTICS, label: "Advanced Analytics" },
  { value: FeatureName.CUSTOM_THEME, label: "Custom Theme" },
];

const DEFAULT_PLAN_CODES: string[] = ["FREE", "PREMIUM", "PREMIUM_YEARLY"];
const DEFAULT_PLANS = [...DEFAULT_PLAN_CODES]; // Các gói mặc định không thể xóa

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

  // Sắp xếp để FREE, PREMIUM và PREMIUM_YEARLY luôn hiển thị đầu tiên
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
      
      // Luôn đảm bảo có đủ 3 gói mặc định trước khi load
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
          // Sắp xếp: FREE, PREMIUM và PREMIUM_YEARLY luôn hiển thị đầu tiên
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
        title: "Lỗi",
        description: error?.message || "Không thể tải danh sách gói",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plan?: SubscriptionPlanDTO) => {
    if (plan) {
      setEditingPlan(plan);
      // Đảm bảo có đủ 5 tính năng, nếu thiếu thì thêm các tính năng mặc định
      const existingFeatures = plan.features || [];
      const allFeatures = FEATURE_OPTIONS.map(opt => {
        const existing = existingFeatures.find(f => f.featureName === opt.value);
        if (existing) {
          return {
            ...existing,
            isEnabled: existing.isEnabled ?? true,
            limitValue: existing.limitValue ?? null,
          };
        }
        // Nếu chưa có, tạo mặc định (unlimited)
        return {
          featureName: opt.value,
          limitValue: null, // null = unlimited
          isEnabled: true,
        };
      });
      setFormData({
        planCode: plan.planCode,
        planName: plan.planName,
        description: plan.description || "",
        isActive: plan.isActive ?? true,
        displayOrder: plan.displayOrder || 0,
        features: allFeatures,
        details: plan.details || [],
      });
    } else {
      setEditingPlan(null);
      // Tạo mặc định 5 tính năng với unlimited
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

  // Không cần handleAddFeature và handleRemoveFeature nữa vì luôn có đủ 5 tính năng

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
    // Nếu nhập số > 0, tự động tắt unlimited (set limitValue)
    // Nếu nhập 0, vẫn là limited nhưng không cho dùng
    newFeatures[index] = {
      ...newFeatures[index],
      limitValue: value,
    };
    setFormData({ ...formData, features: newFeatures });
  };

  // Không cần sắp xếp nữa, giữ nguyên thứ tự 5 tính năng
  const sortedFeatures = formData.features || [];

  // Không cần drag and drop nữa vì luôn có đủ 5 tính năng cố định

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
      details: [...(formData.details || []), newDetail],
    });
  };

  const handleRemoveDetail = (index: number) => {
    const newDetails = formData.details?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, details: newDetails });
  };

  const handleDetailChange = (index: number, field: keyof PlanDetailDTO, value: any) => {
    const newDetails = [...(formData.details || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setFormData({ ...formData, details: newDetails });
  };

  const handleSave = async () => {
    try {
      // Normalize features trước khi gửi - đảm bảo có đủ 5 tính năng
      const normalizedFeatures = (formData.features || []).map(f => {
        // Logic đơn giản:
        // - limitValue = null → UNLIMITED
        // - limitValue = 0 → LIMITED nhưng không cho dùng
        // - limitValue > 0 → LIMITED với giới hạn
        const finalLimitValue = f.limitValue;
        
        return {
          featureName: f.featureName || FeatureName.PLAYLIST_CREATE,
          limitValue: finalLimitValue,
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
          title: "Thành công",
          description: "Đã cập nhật gói thành công",
        });
      } else {
        const payload: SubscriptionPlanDTO = {
          ...formData,
          features: normalizedFeatures,
          details: normalizedDetails,
        } as SubscriptionPlanDTO;

        await subscriptionPlanApi.createPlan(payload);
        toast({
          title: "Thành công",
          description: "Đã tạo gói mới thành công",
        });
      }
      handleCloseDialog();
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể lưu gói",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number, planCode?: string) => {
    const isDefaultPlan = planCode && DEFAULT_PLANS.includes(planCode.toUpperCase());
    
    if (isDefaultPlan) {
      toast({
        title: "Không thể xóa",
        description: "Không thể xóa gói mặc định (FREE, PREMIUM, PREMIUM_YEARLY). Bạn chỉ có thể chỉnh sửa.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa gói này?")) return;

    try {
      await subscriptionPlanApi.deletePlan(id);
      toast({
        title: "Thành công",
        description: "Đã xóa gói thành công",
      });
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể xóa gói",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span>Đang tải danh sách gói...</span>
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
                  Quản lý Gói Đăng Ký
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-normal">
                    {plans.length} gói đang hiển thị
                  </Badge>
                  <span className="text-xs hidden sm:inline-flex">
                    FREE, PREMIUM và PREMIUM_YEARLY luôn được ưu tiên đầu danh sách
                  </span>
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
                Làm mới
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Tạo gói mới
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-admin pb-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isDefaultPlan = plan.planCode && DEFAULT_PLANS.includes(plan.planCode.toUpperCase());
                  return (
                    <Card
                      key={plan.id}
                      className={`border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] ${
                        isDefaultPlan ? "ring-2 ring-primary/20" : ""
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <Package className="h-5 w-5" />
                              {plan.planName}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={plan.isActive ? "default" : "secondary"}>
                                {plan.planCode}
                              </Badge>
                              {isDefaultPlan && (
                                <Badge variant="outline" className="text-xs">
                                  Gói mặc định
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(plan)}
                              title="Chỉnh sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!isDefaultPlan && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => plan.id && handleDelete(plan.id, plan.planCode)}
                                title="Xóa"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 min-h-[48px]">
                          {plan.description || "Chưa có mô tả cho gói này."}
                        </CardDescription>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tính năng:</span>
                            <span>{plan.features?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Options giá:</span>
                            <span>{plan.details?.length || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Chỉnh sửa Gói" : "Tạo Gói Mới"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Cập nhật thông tin gói đăng ký"
                : "Tạo gói đăng ký mới với các tính năng và giới hạn"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planCode">Mã gói *</Label>
                <Input
                  id="planCode"
                  value={formData.planCode}
                  onChange={(e) => setFormData({ ...formData, planCode: e.target.value.toUpperCase() })}
                  placeholder="BASIC, PREMIUM, PRO"
                  className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                />
                {editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase()) && (
                  <p className="text-xs text-muted-foreground">
                    Lưu ý: Thay đổi mã gói mặc định có thể ảnh hưởng đến logic hệ thống
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="planName">Tên gói *</Label>
                <Input
                  id="planName"
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  placeholder="Gói Cơ Bản"
                  className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về gói đăng ký..."
                className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">Thứ tự hiển thị</Label>
              <Input
                id="displayOrder"
                inputMode="numeric"
                value={formatNumber(formData.displayOrder)}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseNumber(e.target.value) })}
                placeholder="Ví dụ: 1"
                className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Gói đang hoạt động</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tính năng (5 tính năng mặc định)</Label>
                <Badge variant="secondary" className="text-xs">
                  Tất cả gói đều có 5 tính năng này
                </Badge>
              </div>

              {sortedFeatures.length > 0 && (
                <div className="space-y-2">
                  <Table className="border border-[hsl(var(--admin-border))] rounded-md">
                    <TableHeader className="bg-[hsl(var(--admin-sidebar))]">
                      <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Tính năng</TableHead>
                        <TableHead className="text-foreground font-semibold">Trạng thái</TableHead>
                        <TableHead className="text-foreground font-semibold">Giới hạn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[hsl(var(--admin-card))]">
                      {sortedFeatures.map((feature, index) => {
                        const isUnlimited = feature.limitValue === null;
                        const isDisabled = feature.limitValue === 0;
                        const isLimited = feature.limitValue !== null && feature.limitValue > 0;
                        return (
                        <TableRow 
                          key={index} 
                          className={`hover:bg-[hsl(var(--admin-hover))] ${
                            isDisabled 
                              ? "bg-[hsl(var(--admin-card))]/50 opacity-60" 
                              : "bg-[hsl(var(--admin-card))]"
                          }`}
                        >
                          <TableCell>
                            <div className="font-medium">
                              {FEATURE_OPTIONS.find(opt => opt.value === feature.featureName)?.label || feature.featureName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isUnlimited}
                                onCheckedChange={(checked) => handleToggleUnlimited(index, checked)}
                              />
                              <span className="text-sm">
                                {isUnlimited ? (
                                  <Badge variant="default" className="bg-green-600">Unlimited</Badge>
                                ) : (
                                  <Badge variant="secondary">Limited</Badge>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isUnlimited ? (
                              <span className="text-sm text-muted-foreground">Không giới hạn</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Số lượt"
                                  value={feature.limitValue || 0}
                                  onChange={(e) => {
                                    const numValue = e.target.value === "" ? 0 : parseInt(e.target.value);
                                    if (numValue >= 0) {
                                      handleLimitValueChange(index, numValue);
                                    }
                                  }}
                                  className="w-32 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {feature.limitValue === 0 ? "(Không cho dùng)" : "lượt"}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Plan Details Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options Giá/Thời Gian</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddDetail}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Option
                </Button>
              </div>

              {formData.details && formData.details.length > 0 && (
                <div className="space-y-2">
                  <Table className="border border-[hsl(var(--admin-border))] rounded-md">
                    <TableHeader className="bg-[hsl(var(--admin-sidebar))]">
                      <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Tên Option</TableHead>
                        <TableHead className="text-foreground font-semibold">Giá</TableHead>
                        <TableHead className="text-foreground font-semibold">Thời hạn</TableHead>
                        <TableHead className="text-foreground font-semibold">Thứ tự</TableHead>
                        <TableHead className="text-foreground font-semibold">Recommended</TableHead>
                        <TableHead className="text-foreground font-semibold">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[hsl(var(--admin-card))]">
                      {formData.details.map((detail, index) => (
                        <TableRow key={index} className="hover:bg-[hsl(var(--admin-hover))]">
                          <TableCell>
                            <Input
                              value={detail.detailName || ""}
                              onChange={(e) => handleDetailChange(index, "detailName", e.target.value)}
                              placeholder="Ví dụ: 1 tháng"
                              className="w-full bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detail.price || 0}
                              onChange={(e) => handleDetailChange(index, "price", parseNumber(e.target.value))}
                              placeholder="Giá"
                              className="w-32 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detail.durationDays || 30}
                              onChange={(e) => handleDetailChange(index, "durationDays", Math.max(parseNumber(e.target.value), 1))}
                              placeholder="Ngày"
                              className="w-24 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detail.displayOrder || 0}
                              onChange={(e) => handleDetailChange(index, "displayOrder", parseNumber(e.target.value))}
                              placeholder="0"
                              className="w-20 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={detail.isRecommended ?? false}
                              onCheckedChange={(checked) => handleDetailChange(index, "isRecommended", checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDetail(index)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSubscriptionPlans;


