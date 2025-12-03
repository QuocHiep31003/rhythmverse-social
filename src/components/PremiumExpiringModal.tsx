import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle } from "lucide-react";
import { PlanFeatureDTO, subscriptionPlanApi } from "@/services/api/subscriptionPlanApi";

interface PremiumExpiringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
  planCode?: string;
  expirationDate?: string;
}

const PremiumExpiringModal = ({
  open,
  onOpenChange,
  planName = "Premium",
  planCode,
  expirationDate,
}: PremiumExpiringModalProps) => {
  const navigate = useNavigate();
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureDTO[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  useEffect(() => {
    if (expirationDate) {
      const expiration = new Date(expirationDate);
      const now = new Date();
      const diffTime = expiration.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    }
  }, [expirationDate]);

  const handleRenew = () => {
    onOpenChange(false);
    navigate("/premium");
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPlan = async () => {
      if (!open || !planCode) {
        setPlanFeatures([]);
        return;
      }
      try {
        setLoadingFeatures(true);
        const plan = await subscriptionPlanApi.getPlanByCode(planCode);
        if (!cancelled) {
          setPlanFeatures(plan?.features ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load plan features for modal", error);
          setPlanFeatures([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingFeatures(false);
        }
      }
    };

    fetchPlan();
    return () => {
      cancelled = true;
    };
  }, [open, planCode]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatFeatureName = (value?: string | null) => {
    if (!value) return "Feature";
    return value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const formatPeriodLabel = (period?: string | null, periodValue?: number | null) => {
    if (!period || period.toUpperCase() === "NONE") {
      return "";
    }
    const normalized = period.toUpperCase();
    const base =
      normalized === "DAY"
        ? "day"
        : normalized === "WEEK"
          ? "week"
          : normalized === "MONTH"
            ? "month"
            : normalized === "YEAR"
              ? "year"
              : normalized.toLowerCase();
    if (!periodValue || periodValue <= 1) {
      return base;
    }
    return `${periodValue} ${base}${periodValue > 1 ? "s" : ""}`;
  };

  const formatFeatureLimit = (feature: PlanFeatureDTO) => {
    const limitType = feature.limitType?.toUpperCase();
    if (limitType === "UNLIMITED" || feature.limitValue === null) {
      return "Unlimited";
    }
    if (limitType === "LIMITED") {
      const period = formatPeriodLabel(feature.limitPeriod, feature.periodValue);
      if (period) {
        return `${feature.limitValue} per ${period}`;
      }
      return `${feature.limitValue} uses`;
    }
    return "Enabled";
  };

  const dynamicFeatures = useMemo(() => {
    if (!planFeatures?.length) return [];
    return planFeatures
      .filter((feature) => feature.isEnabled !== false && feature.limitType?.toUpperCase() !== "DISABLED")
      .map((feature) => ({
        key: feature.featureName,
        name: feature.featureDisplayName || formatFeatureName(feature.featureName),
        detail: formatFeatureLimit(feature),
      }));
  }, [planFeatures]);

  const fallbackFeatures = [
    {
      key: "audio_quality",
      name: "Higher-quality playback",
      detail: "More stable and detailed audio than the Free plan",
    },
    {
      key: "ai_search",
      name: "AI-powered music search",
      detail: "Find tracks via melody, lyrics, or mood",
    },
    {
      key: "analytics",
      name: "Listening analytics",
      detail: "View insights about your listening history",
    },
    {
      key: "playlist_management",
      name: "Advanced playlist management",
      detail: "Create and organize unlimited playlists",
    },
  ];

  const featuresToDisplay = dynamicFeatures.length ? dynamicFeatures : fallbackFeatures;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950/95 border-primary/40">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Premium plan is expiring soon
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/70 text-base">
            Your {planName} will expire in{" "}
            <span className="font-bold text-yellow-400">
              {daysRemaining === 0 ? "today" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
            </span>
            {expirationDate && (
              <>
                {" "}
                (on {formatDate(expirationDate)})
              </>
            )}
            . To keep all Premium features, please renew your plan.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="text-sm text-white/90">
              <strong className="text-primary">Premium benefits:</strong>
            </p>
            {loadingFeatures ? (
              <div className="text-sm text-white/70 mt-2">Loading benefits…</div>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-white/80 list-none">
                {featuresToDisplay.map((feature) => (
                  <li key={feature.key} className="flex flex-col">
                    <span className="font-semibold text-white">{feature.name}</span>
                    <span className="text-xs text-white/60">{feature.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe later
          </Button>
          <Button
            variant="default"
            onClick={handleRenew}
            className="w-full sm:w-auto bg-gradient-to-r from-primary via-pink-500 to-orange-400 hover:opacity-90"
          >
            Renew now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumExpiringModal;
