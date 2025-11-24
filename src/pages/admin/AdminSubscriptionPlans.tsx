import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { subscriptionPlanApi, SubscriptionPlanDTO, PlanFeatureDTO } from "@/services/api/subscriptionPlanApi";
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
    price: 0,
    currency: "VND",
    durationDays: 30,
    isActive: true,
    displayOrder: 0,
    features: [],
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
      setFormData({
        planCode: plan.planCode,
        planName: plan.planName,
        description: plan.description || "",
        price: plan.price || 0,
        currency: plan.currency || "VND",
        durationDays: plan.durationDays || 30,
        isActive: plan.isActive ?? true,
        displayOrder: plan.displayOrder || 0,
        features: plan.features || [],
      });
    } else {
      setEditingPlan(null);
      setFormData({
        planCode: "",
        planName: "",
        description: "",
        price: 0,
        currency: "VND",
        durationDays: 30,
        isActive: true,
        displayOrder: 0,
        features: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  const handleAddFeature = () => {
    const newFeature: PlanFeatureDTO = {
      featureName: FeatureName.PLAYLIST_CREATE,
      limitValue: null,
      isEnabled: true,
    };
    setFormData({
      ...formData,
      features: [...(formData.features || []), newFeature],
    });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = formData.features?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, features: newFeatures });
  };

  const handleFeatureChange = (index: number, field: keyof PlanFeatureDTO, value: any) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData({ ...formData, features: newFeatures });
  };

  const handleSave = async () => {
    try {
      if (editingPlan?.id) {
        const payload: SubscriptionPlanDTO = {
          ...editingPlan,
          ...formData,
          id: editingPlan.id,
          planCode: formData.planCode || editingPlan.planCode || "",
          currency: formData.currency || editingPlan.currency || "VND",
          features: formData.features || [],
        };

        await subscriptionPlanApi.updatePlan(editingPlan.id, payload);
        toast({
          title: "Thành công",
          description: "Đã cập nhật gói thành công",
        });
      } else {
        const payload: SubscriptionPlanDTO = {
          ...formData,
          currency: formData.currency || "VND",
          features: formData.features || [],
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

  const handleSeedDefaultPlans = async () => {
    if (!confirm("Bạn có chắc chắn muốn tạo các gói mặc định (FREE, PREMIUM, PREMIUM_YEARLY)? Các gói đã tồn tại sẽ không bị ghi đè.")) return;

    try {
      await subscriptionPlanApi.seedDefaultPlans();
      toast({
        title: "Thành công",
        description: "Đã tạo các gói mặc định thành công",
      });
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể tạo gói mặc định",
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
              <Button
                variant="outline"
                onClick={handleSeedDefaultPlans}
                className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]"
              >
                <Package className="h-4 w-4" />
                Tạo gói mặc định
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
                            <span className="text-muted-foreground">Giá:</span>
                            <span className="font-semibold">
                              {plan.price?.toLocaleString("vi-VN")} {plan.currency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Thời hạn:</span>
                            <span>{plan.durationDays} ngày</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tính năng:</span>
                            <span>{plan.features?.length || 0}</span>
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
                  disabled={editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase())}
                  className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                />
                {editingPlan?.planCode && DEFAULT_PLANS.includes(editingPlan.planCode.toUpperCase()) && (
                  <p className="text-xs text-muted-foreground">
                    Mã gói mặc định không thể thay đổi
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Giá (VND)</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  value={formatNumber(formData.price)}
                  onChange={(e) => setFormData({ ...formData, price: parseNumber(e.target.value) })}
                  placeholder="Ví dụ: 99.000"
                  className="bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">Thời hạn (ngày)</Label>
                <Input
                  id="durationDays"
                  inputMode="numeric"
                  value={formatNumber(formData.durationDays)}
                  onChange={(e) => setFormData({ ...formData, durationDays: Math.max(parseNumber(e.target.value), 1) })}
                  placeholder="Ví dụ: 30"
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
                <Label>Tính năng</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm tính năng
                </Button>
              </div>

              {formData.features && formData.features.length > 0 && (
                <div className="space-y-2">
                  <Table className="border border-[hsl(var(--admin-border))] rounded-md">
                    <TableHeader className="bg-[hsl(var(--admin-sidebar))]">
                      <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Tính năng</TableHead>
                        <TableHead className="text-foreground font-semibold">Giới hạn</TableHead>
                        <TableHead className="text-foreground font-semibold">Bật/Tắt</TableHead>
                        <TableHead className="text-foreground font-semibold">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[hsl(var(--admin-card))]">
                      {formData.features.map((feature, index) => (
                        <TableRow key={index} className="hover:bg-[hsl(var(--admin-hover))]">
                          <TableCell>
                            <select
                              className="w-full p-2 border border-[hsl(var(--admin-border))] rounded-md bg-[hsl(var(--admin-card))] text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              value={feature.featureName}
                              onChange={(e) =>
                                handleFeatureChange(index, "featureName", e.target.value as FeatureName)
                              }
                            >
                              {FEATURE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[hsl(var(--admin-card))]">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Unlimited"
                              value={feature.limitValue === null ? "" : feature.limitValue}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseInt(e.target.value);
                                handleFeatureChange(index, "limitValue", value);
                              }}
                              className="w-32 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]"
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={feature.isEnabled ?? true}
                              onCheckedChange={(checked) =>
                                handleFeatureChange(index, "isEnabled", checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFeature(index)}
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


