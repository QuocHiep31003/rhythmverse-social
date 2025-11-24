import { useNavigate } from "react-router-dom";
import { Crown, X, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeatureName } from "@/services/api/featureUsageApi";

interface FeatureLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: FeatureName;
  featureDisplayName?: string;
  remaining?: number;
  limit?: number;
  isPremium?: boolean;
}

const featureDescriptions: Record<FeatureName, string> = {
  [FeatureName.PLAYLIST_CREATE]: "Create unlimited playlists and organize your music collection",
  [FeatureName.OFFLINE_DOWNLOAD]: "Download your favorite songs and listen offline anywhere",
  [FeatureName.AI_SEARCH]: "Search for songs using AI-powered melody and lyrics recognition",
  [FeatureName.ADVANCED_ANALYTICS]: "Get detailed insights into your listening habits and preferences",
  [FeatureName.CUSTOM_THEME]: "Customize your profile with unique themes and personalized designs",
};

const featureBenefits: Record<FeatureName, string[]> = {
  [FeatureName.PLAYLIST_CREATE]: [
    "Unlimited playlists",
    "Organize your music collection",
    "Share playlists with friends",
  ],
  [FeatureName.OFFLINE_DOWNLOAD]: [
    "Unlimited offline downloads",
    "Listen without internet",
    "Save data and battery",
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
  [FeatureName.CUSTOM_THEME]: [
    "Custom themes",
    "Personalized profiles",
    "Unique designs",
  ],
};

export const FeatureLimitModal = ({
  open,
  onOpenChange,
  featureName,
  featureDisplayName,
  remaining = 0,
  limit = 0,
  isPremium = false,
}: FeatureLimitModalProps) => {
  const navigate = useNavigate();
  const displayName = featureDisplayName || featureName.replace(/_/g, " ");
  const description = featureDescriptions[featureName] || "This premium feature";
  const benefits = featureBenefits[featureName] || [];

  // Don't show modal if user is already premium
  const shouldShow = open && !isPremium;

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/premium");
  };

  return (
    <Dialog open={shouldShow} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl">Upgrade to Premium</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {remaining === 0
              ? `You've reached your limit for ${displayName}. You've used all ${limit} free uses. Upgrade to Premium for unlimited access!`
              : limit > 0
              ? `You have ${remaining} of ${limit} ${displayName} uses remaining. Upgrade to Premium for unlimited access!`
              : `${displayName} is only available for Premium users. Upgrade to Premium to unlock this feature!`}
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
              <span className="text-sm font-medium">Free Plan</span>
              <span className="text-sm text-muted-foreground">
                {limit > 0 ? `${limit} uses` : "Not available"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Premium Plan
              </span>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                Unlimited
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureLimitModal;

