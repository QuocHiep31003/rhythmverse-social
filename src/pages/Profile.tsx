import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import { 
  Edit, 
  Music, 
  Heart, 
  Users, 
  Calendar, 
  Mail,
  Crown,
  Play,
  Clock,
  TrendingUp,
  Palette,
  Loader2,
  Phone,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ReceiptText
} from "lucide-react";
import { listeningHistoryApi, ListeningHistoryDTO } from "@/services/api/listeningHistoryApi";
import { userApi, UserDTO } from "@/services/api/userApi";
import { toast } from "@/hooks/use-toast";
import { songsApi } from "@/services/api/songApi";
import { paymentApi, OrderHistoryItem, PlanFeatureSnapshot } from "@/services/api/paymentApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { premiumSubscriptionApi, PremiumSubscriptionDTO } from "@/services/api/premiumSubscriptionApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  
  // Payment history state
  const [paymentOrders, setPaymentOrders] = useState<OrderHistoryItem[]>([]);
  const [allPaymentOrders, setAllPaymentOrders] = useState<OrderHistoryItem[]>([]);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(0);
  const [paymentTotalElements, setPaymentTotalElements] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'SUCCESS' | 'FAILED'>('all');
  const [premiumSubscription, setPremiumSubscription] = useState<PremiumSubscriptionDTO | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryItem | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [pendingTick, setPendingTick] = useState(0);
  
  useEffect(() => {
    fetchProfile();
    fetchListeningHistory();
  }, []);

  useEffect(() => {
    fetchPaymentHistory();
  }, [paymentPage, paymentFilter, pendingTick]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPendingTick((tick) => tick + 1);
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const isSubscriptionActive = (subscription: PremiumSubscriptionDTO | null) => {
    if (!subscription) return false;
    const normalizeStatus = (value?: string | null) => value?.toUpperCase();
    const statusCandidates = [
      subscription.status,
      subscription.subscriptionStatus,
      subscription.state,
      subscription.paymentStatus
    ].map(normalizeStatus);
    const activeStatuses = ["ACTIVE", "TRIALING", "SUCCESS", "PAID"];
    const hasActiveStatus = statusCandidates.some(
      (status) => status && activeStatuses.includes(status)
    );
    const booleanActive = subscription.active ?? subscription.isActive ?? null;

    if (!hasActiveStatus && !booleanActive) {
      return false;
    }

    const endDateString = subscription.endDate || subscription.currentPeriodEnd;
    if (!endDateString) {
      return hasActiveStatus || Boolean(booleanActive);
    }
    const endDate = new Date(endDateString);
    if (Number.isNaN(endDate.getTime())) {
      return hasActiveStatus || Boolean(booleanActive);
    }
    return endDate.getTime() >= Date.now();
  };

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const user = await userApi.getCurrentProfile();
      setUserId(user.id || null);
      let subscription: PremiumSubscriptionDTO | null = null;
      try {
        // Lấy subscription từ /me endpoint để có đầy đủ thông tin
        subscription = await premiumSubscriptionApi.getMySubscription();
        setPremiumSubscription(subscription);
      } catch (subscriptionError) {
        console.warn("Failed to fetch premium subscription", subscriptionError);
      }
      const getPremiumStringFlag = (value?: string | null) => {
        if (!value) return undefined;
        return value.toUpperCase() === 'PREMIUM';
      };
      const userPremiumBoolean =
        (user as any)?.isPremium ??
        (user as any)?.premium ??
        undefined;
      const premiumSources = [
        userPremiumBoolean,
        getPremiumStringFlag((user as any)?.plan),
        getPremiumStringFlag((user as any)?.membership),
        getPremiumStringFlag(user.roleName),
        isSubscriptionActive(subscription)
      ];
      const isPremiumUser = premiumSources.some((flag) => Boolean(flag));
      // Ưu tiên lấy từ subscription (startsAt/expiresAt), sau đó mới lấy từ user
      const premiumStartDate =
        subscription?.startsAt ||
        subscription?.startDate ||
        user.premiumStartDate ||
        user.premiumActivatedAt ||
        null;
      const premiumEndDate =
        subscription?.expiresAt ||
        subscription?.endDate ||
        subscription?.currentPeriodEnd ||
        user.premiumEndDate ||
        user.premiumExpiresAt ||
        null;
      // Format planLabel to English, remove Vietnamese text
      let rawPlanLabel =
        subscription?.planName ||
        subscription?.planCode ||
        (user as any)?.planName ||
        (user as any)?.plan ||
        (user as any)?.membership ||
        (isPremiumUser ? "Premium" : "Free");
      
      // Convert Vietnamese plan names to English
      const planLabel = rawPlanLabel
        ?.replace(/Premium\s*1\s*tháng/gi, "Premium Monthly")
        ?.replace(/Premium\s*3\s*tháng/gi, "Premium Quarterly")
        ?.replace(/Premium\s*1\s*năm/gi, "Premium Yearly")
        ?.replace(/Premium\s*tháng/gi, "Premium Monthly")
        ?.replace(/Premium\s*năm/gi, "Premium Yearly")
        || (isPremiumUser ? "Premium" : "Free");
      setProfileData({
        name: user.name || "",
        username: user.email ? `@${user.email.split('@')[0]}` : "",
        email: user.email || "",
        bio: "", // Bio không có trong User entity, giữ nguyên để hiển thị
        phone: user.phone || "",
        address: user.address || "",
        avatar: user.avatar || "",
        premium: isPremiumUser,
        premiumStart: premiumStartDate || "",
        premiumEnd: premiumEndDate || "",
        planLabel
      });
      setAvatarPreview(user.avatar || "");
      setAvatarFile(null);
      // Update listening history with correct userId
      if (user.id) {
        await fetchListeningHistory(user.id);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchListeningHistory = async (currentUserId?: number) => {
    const idToUse = currentUserId || userId;
    if (!idToUse) return;
    
    try {
      setLoading(true);
      const data = await listeningHistoryApi.getByUser(idToUse);
      
      // Sort by listenedAt date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.listenedAt || 0).getTime();
        const dateB = new Date(b.listenedAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
      // Enrich EVERY entry with canonical song details to avoid stale/incorrect names from backend DTO
      const enriched = await Promise.all(
        sortedData.map(async (item) => {
          try {
            const songDetail = await songsApi.getById(String(item.songId));
            if (songDetail) {
              return { ...item, song: {
                id: Number((songDetail as any).id ?? item.songId),
                name: (songDetail as any).name || (songDetail as any).songName,
                songName: (songDetail as any).songName || (songDetail as any).name,
                duration: typeof (songDetail as any).duration === 'number' ? (songDetail as any).duration : undefined,
                cover: (songDetail as any).cover,
                audioUrl: (songDetail as any).audioUrl,
                audio: (songDetail as any).audio,
                playCount: (songDetail as any).playCount,
                artistNames: (songDetail as any).artistNames,
                artists: (songDetail as any).artists,
                album: typeof (songDetail as any).album === 'string' ? { name: (songDetail as any).album } : (songDetail as any).album,
              } } as any;
            }
          } catch {}
          return item;
        })
      );

      setListeningHistory(enriched);
      // Debug: show song IDs from history to verify with player logs
      try {
        // eslint-disable-next-line no-console
        console.log(
          "🧾 History songIds:",
          enriched.map((i) => (i as any).songId ?? (i as any).song?.id)
        );
      } catch {}
    } catch (error: any) {
      console.error("Failed to fetch listening history:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load listening history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await listeningHistoryApi.delete(id);
      setListeningHistory((prev) => prev.filter((h) => h.id !== id));
      toast({ title: "Deleted", description: "Removed from listening history" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  };

  const handleClearAllHistory = async () => {
    if (!listeningHistory.length) return;
    try {
      // Delete sequentially to avoid server overload
      for (const item of listeningHistory) {
        if (item.id) {
          // best-effort; ignore single failures
          try { await listeningHistoryApi.delete(item.id); } catch {}
        }
      }
      setListeningHistory([]);
      toast({ title: "Cleared", description: "All listening history removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear history", variant: "destructive" });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatPaymentDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return '-';
    }
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return dateString;
      }
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const formatMembershipDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return dateString;
      }
      return new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return dateString || null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatCurrencyWithCode = (amount?: number | null, currencyCode?: string | null) => {
    if (amount === undefined || amount === null) {
      return '—';
    }
    const currency = (currencyCode || 'VND').toUpperCase();
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString('vi-VN')} ${currency}`;
    }
  };

  const parsePlanFeatureSnapshot = (raw?: string | null): PlanFeatureSnapshot[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.warn('Failed to parse plan feature snapshot', error);
      return [];
    }
  };

  const formatFeatureName = (value?: string | null) => {
    if (!value) return 'Unknown feature';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatPeriodLabel = (period?: string | null, periodValue?: number | null) => {
    if (!period || period.toUpperCase() === 'NONE') {
      return '';
    }
    const normalized = period.toUpperCase();
    const base = normalized === 'DAY'
      ? 'ngày'
      : normalized === 'WEEK'
        ? 'tuần'
        : normalized === 'MONTH'
          ? 'tháng'
          : normalized === 'YEAR'
            ? 'năm'
            : normalized.toLowerCase();
    if (!periodValue || periodValue <= 1) {
      return base;
    }
    return `${periodValue} ${base}`;
  };

  const formatFeatureLimit = (feature: PlanFeatureSnapshot) => {
    const limitType = feature.limitType?.toUpperCase();
    if (feature.isEnabled === false || limitType === 'DISABLED') {
      return 'Không khả dụng trong gói này';
    }
    if (limitType === 'UNLIMITED') {
      return 'Không giới hạn';
    }
    if (limitType === 'LIMITED') {
      const limitValue = feature.limitValue ?? 0;
      const period = formatPeriodLabel(feature.limitPeriod, feature.periodValue);
      return period ? `${limitValue} lượt / ${period}` : `${limitValue} lượt`;
    }
    return 'Không xác định';
  };

  const selectedOrderFeatures = useMemo(() => {
    const features = parsePlanFeatureSnapshot(selectedOrder?.planFeatureSnapshot);
    return features.slice().sort((a, b) => {
      const isADisabled = a.isEnabled === false || a.limitType?.toUpperCase() === 'DISABLED';
      const isBDisabled = b.isEnabled === false || b.limitType?.toUpperCase() === 'DISABLED';
      if (isADisabled !== isBDisabled) {
        return isADisabled ? 1 : -1; // enabled first
      }
      return 0;
    });
  }, [selectedOrder?.planFeatureSnapshot]);

  const PENDING_TIMEOUT_MS = 5 * 60 * 1000;

  const getOrderDisplayState = (order: OrderHistoryItem): 'success' | 'pending' | 'failed' => {
    const backendStatus = order.status?.toUpperCase();
    if (backendStatus === 'SUCCESS') {
      return 'success';
    }
    if (backendStatus === 'FAILED') {
      return 'failed';
    }

    if (order.failureReason) {
      return 'failed';
    }

    const isPendingState =
      backendStatus === 'PENDING' ||
      backendStatus === 'PROCESSING' ||
      backendStatus === 'WAITING' ||
      backendStatus === undefined ||
      backendStatus === null ||
      backendStatus === '';

    if (!isPendingState) {
      return 'failed';
    }

    const referenceTime = order.updatedAt || order.createdAt;
    if (referenceTime) {
      const timestamp = new Date(referenceTime).getTime();
      if (!Number.isNaN(timestamp)) {
        const elapsed = Date.now() - timestamp;
        if (elapsed >= PENDING_TIMEOUT_MS) {
          return 'failed';
        }
      }
    }

    return 'pending';
  };

  const getPaymentStatusBadge = (order: OrderHistoryItem) => {
    const displayState = getOrderDisplayState(order);

    if (displayState === 'success') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Success
        </Badge>
      );
    }

    if (displayState === 'pending') {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const paymentAggregates = useMemo(() => {
    let success = 0;
    let failed = 0;
    let successAmount = 0;

    allPaymentOrders.forEach((order) => {
      const state = getOrderDisplayState(order);
      if (state === 'success') {
        success += 1;
        successAmount += order.amount;
      } else if (state === 'failed') {
        failed += 1;
      }
    });

    return { success, failed, successAmount };
  }, [allPaymentOrders, pendingTick]);

  const fetchPaymentHistory = async () => {
    try {
      setPaymentLoading(true);
      const result = await paymentApi.getHistory(paymentPage, 10);
      
      setAllPaymentOrders(result.content);

      let filteredOrders = result.content;
      if (paymentFilter !== 'all') {
        filteredOrders = result.content.filter((order) => {
          const displayState = getOrderDisplayState(order);
          return paymentFilter === 'SUCCESS'
            ? displayState === 'success'
            : displayState === 'failed';
        });
      }
      
      setPaymentOrders(filteredOrders);
      setPaymentTotalPages(result.totalPages);
      setPaymentTotalElements(result.totalElements);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tải lịch sử thanh toán',
        variant: 'destructive',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleOpenInvoice = (order: OrderHistoryItem) => {
    setSelectedOrder(order);
    setIsInvoiceDialogOpen(true);
  };
  
  const [profileData, setProfileData] = useState({
    name: "Alex Johnson",
    username: "@alexjohnson",
    email: "alex@example.com",
    bio: "Music enthusiast | Always discovering new sounds | Premium member since 2023",
    phone: "",
    address: "",
    avatar: "",
    premium: true,
    premiumStart: "",
    premiumEnd: "",
    planLabel: "Premium"
  });
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const stats = {
    totalListeningTime: "1,247 hours",
    songsPlayed: listeningHistory.length.toString(),
    playlistsCreated: 24,
    followersCount: 156,
    followingCount: 89,
    streakDays: 47
  };

  const topGenres = [
    { name: "Electronic", percentage: 35 },
    { name: "Indie Rock", percentage: 28 },
    { name: "Chill", percentage: 20 },
    { name: "Pop", percentage: 12 },
    { name: "Jazz", percentage: 5 }
  ];

  const monthlyStats = [
    { month: "Oct", hours: 45 },
    { month: "Nov", hours: 67 },
    { month: "Dec", hours: 89 },
    { month: "Jan", hours: 112 }
  ];

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ title: "Lỗi", description: "Vui lòng chọn file ảnh", variant: "destructive" });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Lỗi", description: "Kích thước file không được vượt quá 5MB", variant: "destructive" });
        return;
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setUploadingAvatar(true);

      try {
        // Upload to backend - backend will handle Cloudinary upload and update avatar
        const updatedUser = await userApi.uploadAvatar(file);
        
        // Update local state with new avatar URL
        setProfileData({ ...profileData, avatar: updatedUser.avatar || "" });
        setAvatarPreview(updatedUser.avatar || "");
        
        toast({ title: "Thành công", description: "Đã cập nhật ảnh đại diện thành công!" });
      } catch (err: any) {
        console.error("Failed to upload avatar:", err);
        toast({ 
          title: "Lỗi", 
          description: err.message || "Không thể upload ảnh đại diện", 
          variant: "destructive" 
        });
        // Reset preview on error
        setAvatarPreview(profileData.avatar || "");
        setAvatarFile(null);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      toast({ title: "Error", description: "User ID not found", variant: "destructive" }); return;
    }
    try {
      setSaving(true);
      // Avatar is already updated via uploadAvatar endpoint, so we only update other fields
      const updatePayload: any = {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
      };
      await userApi.updateProfile(updatePayload);
      await fetchProfile();
      setAvatarFile(null);
      setIsEditing(false);
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <div className="text-lg text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative group">
                  <Avatar className="w-32 h-32 cursor-pointer group/avatar relative">
                    <AvatarImage src={avatarPreview || profileData.avatar || "/placeholder-avatar.jpg"} />
                    {!(avatarPreview || profileData.avatar) && (
                      <AvatarFallback className="text-4xl tracking-tighter bg-gradient-primary text-white uppercase">
                        {profileData.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    )}
                    {isEditing && !uploadingAvatar && (
                      <div
                        className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer z-10 select-none hover:bg-black/50"
                        onClick={() => fileInputRef.current?.click()}
                        title="Đổi ảnh đại diện"
                      >
                        <span className="text-white text-md font-semibold select-none">Đổi ảnh đại diện</span>
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full z-10">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </Avatar>
                  {/* ẩn input file, click avatar sẽ trigger thay vì input thô */}
                  {isEditing && (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      tabIndex={-1}/>
                  )}
                  {/* Button edit chỉ hiện khi chưa bấm edit */}
                  {!isEditing && (
                    <Button
                      variant="hero"
                      size="icon"
                      className="absolute -bottom-2 -right-2 h-8 w-8"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                          id="edit-name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          className="text-xl font-bold"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={profileData.email}
                                disabled
                        />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input
                          id="edit-phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-address">Address</Label>
                        <Textarea
                          id="edit-address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                          rows={2}
                          placeholder="Address"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="hero" 
                          onClick={handleSaveProfile}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center md:gap-3 mb-3 text-center md:text-left">
                        <h1 className="text-3xl font-bold">{profileData.name}</h1>
                        <Badge
                          variant={profileData.premium ? "default" : "outline"}
                          className={
                            profileData.premium
                              ? "gap-1 w-fit md:w-auto mx-auto md:mx-0 bg-primary/10 text-primary border-primary/40"
                              : "gap-1 w-fit md:w-auto mx-auto md:mx-0 text-muted-foreground border-muted-foreground/40"
                          }
                        >
                          {profileData.premium && <Crown className="w-3 h-3" />}
                          {profileData.planLabel || (profileData.premium ? "Premium" : "Free")}
                        </Badge>
                      </div>
                      {(profileData.premiumStart || profileData.premiumEnd) && (
                        <div className="flex flex-col gap-2 text-xs text-muted-foreground justify-start mb-2">
                          {profileData.premiumStart && (
                            <span>
                              Start Date:{" "}
                              <span className="font-medium text-foreground">
                                {formatMembershipDate(profileData.premiumStart)}
                              </span>
                            </span>
                          )}
                          {profileData.premiumEnd && (
                            <span>
                              Expires:{" "}
                              <span className={`font-medium ${profileData.premium ? "text-green-400" : "text-red-400"}`}>
                                {formatMembershipDate(profileData.premiumEnd)}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-muted-foreground mb-1">{profileData.username}</p>
                      <p className="text-sm mb-4 max-w-md">{profileData.bio}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center md:justify-start">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {profileData.phone ? profileData.phone : "No phone"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {profileData.email}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.followersCount}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.followingCount}</div>
                    <div className="text-xs text-muted-foreground">Following</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.streakDays}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.totalListeningTime}</div>
                    <div className="text-xs text-muted-foreground">Total Listening</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Play className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.songsPlayed}</div>
                    <div className="text-xs text-muted-foreground">Songs Played</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Music className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.playlistsCreated}</div>
                    <div className="text-xs text-muted-foreground">Playlists Created</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.streakDays}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Genres */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Your Top Genres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topGenres.map((genre, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 text-center text-sm font-medium">#{index + 1}</div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{genre.name}</span>
                          <span className="text-sm text-muted-foreground">{genre.percentage}%</span>
                        </div>
                        <div className="w-full bg-muted/20 rounded-full h-2">
                          <div 
                            className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${genre.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Listening History
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHistoryDialog(true)}
                      disabled={!listeningHistory.length}
                    >
                      Show all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading listening history...
                      </div>
                    ) : listeningHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No listening history yet</p>
                        <p className="text-sm">Start playing songs to see your history here</p>
                      </div>
                    ) : (
                      listeningHistory.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <Music className="w-10 h-10 text-primary" />
                          <div className="flex-1">
                            <p
                              className="font-medium"
                              title={`songId: ${(item as any).songId ?? (item as any).song?.id ?? 'unknown'}`}
                            >
                              {item.song?.name || (item.song as any)?.songName || (item as any).songName || "Unknown Song"}
                            </p>
                            {(() => {
                              const artistsField = (item.song as any)?.artists;
                              const artistSource =
                                (Array.isArray(item.song?.artistNames) && item.song?.artistNames) ||
                                (Array.isArray(artistsField)
                                  ? (artistsField as Array<{ name?: string }>)
                                      .map((a) => a?.name)
                                      .filter(Boolean)
                                  : typeof artistsField === "string"
                                    ? artistsField.split(",").map((str) => str.trim())
                                    : undefined) ||
                                (Array.isArray(item.artistNames) ? item.artistNames : undefined);

                              const artistDisplay =
                                artistSource && artistSource.length
                                  ? artistSource.join(", ")
                                  : "Unknown Artist";

                              return (
                                <p className="text-sm text-muted-foreground">
                                  {artistDisplay}
                                </p>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">{formatDate(item.listenedAt)}</p>
                              <p className="text-xs text-muted-foreground">played</p>
                            </div>
                            {item.id && (
                              <Button variant="outline" size="icon" onClick={() => handleDeleteHistory(item.id!)} aria-label="Delete entry">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-500">
                      {paymentAggregates.success}
                    </div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-500">
                      {paymentAggregates.failed}
                    </div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatCurrency(paymentAggregates.successAmount)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment History
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPaymentHistory()}
                      disabled={paymentLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${paymentLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as typeof paymentFilter)} className="mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="SUCCESS">Success</TabsTrigger>
                      <TabsTrigger value="FAILED">Failed</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {paymentLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : paymentOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No transactions yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Invoice</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentOrders.map((order) => (
                              <TableRow key={order.orderCode}>
                                <TableCell className="font-medium text-muted-foreground">
                                  #{order.orderCode}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {order.description}
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold text-primary">
                                    {formatCurrency(order.amount)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getPaymentStatusBadge(order)}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {order.paidAt 
                                    ? formatPaymentDate(order.paidAt)
                                    : order.failedAt
                                    ? formatPaymentDate(order.failedAt)
                                    : formatPaymentDate(order.createdAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary"
                                    onClick={() => handleOpenInvoice(order)}
                                  >
                                    <ReceiptText className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {paymentTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Page {paymentPage + 1} / {paymentTotalPages} ({paymentTotalElements} transactions)
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentPage((p) => Math.max(0, p - 1))}
                              disabled={paymentPage === 0 || paymentLoading}
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentPage((p) => Math.min(paymentTotalPages - 1, p + 1))}
                              disabled={paymentPage >= paymentTotalPages - 1 || paymentLoading}
                            >
                              Next
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Listening Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Monthly Listening Hours</h3>
                      <div className="flex items-end gap-2 h-32">
                        {monthlyStats.map((stat, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-full bg-gradient-primary rounded-t"
                              style={{ height: `${(stat.hours / 120) * 100}%` }}
                            />
                            <div className="text-xs mt-2 font-medium">{stat.month}</div>
                            <div className="text-xs text-muted-foreground">{stat.hours}h</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
      <Dialog
        open={isInvoiceDialogOpen}
        onOpenChange={(open) => {
          setIsInvoiceDialogOpen(open);
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-gradient-glass border-white/10">
          <DialogHeader>
            <DialogTitle>
              Invoice {selectedOrder ? `#${selectedOrder.orderCode}` : ""}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Plan details are snapshotted at the moment you completed payment.
            </p>
          </DialogHeader>
          {!selectedOrder ? (
            <div className="text-sm text-muted-foreground">No order data.</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">
                    Plan snapshot
                  </p>
                  <div className="text-lg font-semibold">
                    {selectedOrder.planName || selectedOrder.planCode || selectedOrder.description || "Unknown"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Plan code: <span className="text-foreground font-medium">{selectedOrder.planCode || "—"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Option: <span className="text-foreground font-medium">{selectedOrder.planDetailName || "None"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Duration:{" "}
                    <span className="text-foreground font-medium">
                      {selectedOrder.planDurationDaysSnapshot
                        ? `${selectedOrder.planDurationDaysSnapshot} days`
                        : "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">
                    Payment info
                  </p>
                  <div className="text-lg font-semibold">
                    {formatCurrencyWithCode(
                      selectedOrder.planPriceSnapshot ?? selectedOrder.amount,
                      selectedOrder.planCurrencySnapshot ?? selectedOrder.currency
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentStatusBadge(selectedOrder)}
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Paid at{" "}
                    <span className="text-foreground font-medium">
                      {formatPaymentDate(selectedOrder.paidAt ?? selectedOrder.failedAt ?? selectedOrder.createdAt)}
                    </span>
                  </div>
                  {selectedOrder.reference && (
                    <div className="text-sm text-muted-foreground">
                      Reference: <span className="text-foreground font-medium">{selectedOrder.reference}</span>
                    </div>
                  )}
                  {selectedOrder.failureReason && (
                    <div className="text-sm text-destructive">
                      Failure reason: {selectedOrder.failureReason}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
                  Benefits at purchase time
                </p>
                {selectedOrderFeatures.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No benefit data found (this might be a free plan or data was removed).
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {selectedOrderFeatures.map((feature, index) => (
                      <div
                        key={`${feature.featureName}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">
                            {formatFeatureName(feature.featureName)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFeatureLimit(feature)}
                          </div>
                        </div>
                        <Badge variant={feature.isEnabled === false ? "outline" : "default"}>
                          {feature.limitType || (feature.isEnabled === false ? "Disabled" : "Enabled")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                The information above is stored as a snapshot in the database (`payment_orders` and
                `premium_subscription_features`) so you always keep the exact benefits you paid for, even if admins
                change plans later.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default Profile;