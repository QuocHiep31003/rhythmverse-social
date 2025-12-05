import { useNavigate } from "react-router-dom";
import { Crown, X, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeatureName, FeatureLimitType } from "@/services/api/featureUsageApi";

interface FeatureLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: FeatureName;
  featureDisplayName?: string;
  remaining?: number;
  limit?: number;
  limitType?: FeatureLimitType;
  isPremium?: boolean;
  canUse?: boolean;
  onRefresh?: () => void | Promise<void>; // Callback để refresh usage sau khi đóng modal
}

const featureDescriptions: Record<FeatureName, string> = {
  [FeatureName.PLAYLIST_CREATE]: "Create unlimited playlists and organize your music collection",
  [FeatureName.FRIEND_LIMIT]: "Connect with unlimited friends and build your music community",
  [FeatureName.AI_SEARCH]: "Search for songs using AI-powered melody and lyrics recognition",
  [FeatureName.ADVANCED_ANALYTICS]: "Get detailed insights into your listening habits and preferences",
};

const featureBenefits: Record<FeatureName, string[]> = {
  [FeatureName.PLAYLIST_CREATE]: [
    "Unlimited playlists",
    "Organize your music collection",
    "Share playlists with friends",
  ],
  [FeatureName.FRIEND_LIMIT]: [
    "Unlimited friends",
    "Connect with music lovers",
    "Share and discover together",
  ],
  [FeatureName.AI_SEARCH]: [
    "AI-powered search",
    "Find songs by humming",
    "Search by lyrics",
  ],
  [FeatureName.ADVANCED_ANALYTICS]: [
    "Listening habit insights",
    "Detailed statistics",
    "Personalized recommendations",
  ],
};

export const FeatureLimitModal = ({
  open,
  onOpenChange,
  featureName,
  featureDisplayName,
  remaining = 0,
  limit = 0,
  limitType,
  isPremium = false,
  canUse = false,
  onRefresh,
}: FeatureLimitModalProps) => {
  const navigate = useNavigate();
  const displayName = featureDisplayName || featureName.replace(/_/g, " ");
  const description = featureDescriptions[featureName] || "This premium feature";
  const benefits = featureBenefits[featureName] || [];
  const limitNumber = typeof limit === "number" ? limit : 0;
  const isUnlimited = limitType === FeatureLimitType.UNLIMITED || limit === null;
  const isDisabled = limitType === FeatureLimitType.DISABLED || (limitNumber === 0 && !isUnlimited);
  const hasFreeQuota = !isUnlimited && !isDisabled && limitNumber > 0 && limitNumber < 1_000_000;

  // Chỉ hiển thị modal nếu:
  // 1. open = true
  // 2. canUse = false (không thể sử dụng tính năng)
  // 3. Không phải unlimited (nếu unlimited thì không cần show modal)
  const shouldShow = open && !canUse && !isUnlimited;

  const handleClose = async () => {
    onOpenChange(false);
    // Refresh usage sau khi đóng modal để lấy thông tin mới nhất từ backend
    // (có thể admin đã thay đổi limit trong lúc user đang xem modal)
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Failed to refresh feature usage:", error);
      }
    }
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    // Navigate to premium page - user có thể chọn plan phù hợp
    navigate("/premium");
  };

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      } else {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl">Upgrade to Premium</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {isDisabled
              ? `${displayName} is not available in your current plan. Upgrade to Premium or purchase credits to unlock this feature!`
              : hasFreeQuota
              ? remaining === 0
                ? `You've reached your limit for ${displayName}. You've used all ${limitNumber} free uses. Upgrade to Premium or purchase a credit-based plan to continue using this feature!`
                : `You have ${remaining} of ${limitNumber} ${displayName} uses remaining. Upgrade to Premium or purchase credits for unlimited access!`
              : `${displayName} is only available for Premium users or credit-based plans. Upgrade to Premium or purchase credits to unlock this feature!`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              {description}
            </h3>
            <ul className="space-y-2 mt-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">✓</span>
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Plan</span>
              <span className="text-sm text-muted-foreground">
                {isDisabled 
                  ? "Not available" 
                  : hasFreeQuota 
                  ? `${limitNumber} uses` 
                  : "Limited access"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Premium Plan
              </span>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Unlimited
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureLimitModal;

