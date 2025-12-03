import { useEffect, useMemo, useState } from "react";
import { Crown, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  PlanFeatureDTO,
  subscriptionPlanApi,
} from "@/services/api/subscriptionPlanApi";

interface PlanFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planCode?: string | null;
  planName?: string | null;
}

interface FeatureDisplayItem {
  key: string;
  name: string;
  detail: string;
  status: "unlimited" | "disabled" | "limited";
}

const FALLBACK_FEATURES: FeatureDisplayItem[] = [
  {
    key: "playlist_create",
    name: "Advanced playlist management",
    detail: "Create and organize unlimited playlists",
    status: "unlimited",
  },
  {
    key: "ai_search",
    name: "AI-powered music search",
    detail: "Find tracks via melody, lyrics, or mood",
    status: "limited",
  },
  {
    key: "analytics",
    name: "Listening analytics",
    detail: "View insights about your listening history",
    status: "limited",
  },
  {
    key: "friend_limit",
    name: "Extended social limit",
    detail: "Connect with more friends without restrictions",
    status: "unlimited",
  },
];

const formatFeatureName = (value?: string | null): string => {
  if (!value) return "Feature";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatPeriodLabel = (
  period?: string | null,
  periodValue?: number | null
): string => {
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

const formatFeatureLimit = (feature: PlanFeatureDTO): string => {
  const limitType = feature.limitType?.toUpperCase();
  if (feature.isEnabled === false || limitType === "DISABLED") {
    return "Not available in this plan";
  }
  if (limitType === "UNLIMITED" || feature.limitValue === null) {
    return "Unlimited usage";
  }
  if (limitType === "LIMITED") {
    const limitValue = feature.limitValue ?? 0;
    const period = formatPeriodLabel(feature.limitPeriod, feature.periodValue);
    if (period) {
      return `${limitValue} use${limitValue !== 1 ? "s" : ""} per ${period}`;
    }
    return `${limitValue} use${limitValue !== 1 ? "s" : ""} total`;
  }
  return "Enabled";
};

const PlanFeaturesDialog = ({
  open,
  onOpenChange,
  planCode,
  planName = "Premium",
}: PlanFeaturesDialogProps) => {
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPlanFeatures = async () => {
      if (!open) return;
      if (!planCode) {
        setPlanFeatures([]);
        setError("Current subscription code not found.");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const plan = await subscriptionPlanApi.getPlanByCode(planCode);
        if (!cancelled) {
          setPlanFeatures(plan?.features ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to fetch plan features", err);
          setPlanFeatures([]);
          setError("Unable to load plan benefits. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPlanFeatures();
    return () => {
      cancelled = true;
    };
  }, [open, planCode]);

  const featureList: FeatureDisplayItem[] = useMemo(() => {
    if (!planFeatures.length) {
      return FALLBACK_FEATURES;
    }
    return planFeatures
      .filter(
        (feature) =>
          feature.featureName &&
          feature.isEnabled !== false &&
          feature.limitType?.toUpperCase() !== "DISABLED"
      )
      .map((feature, index) => {
        const limitType = feature.limitType?.toUpperCase();
        const status: FeatureDisplayItem["status"] =
          limitType === "UNLIMITED" || feature.limitValue === null
            ? "unlimited"
            : limitType === "DISABLED" || feature.isEnabled === false
              ? "disabled"
              : "limited";

        return {
          key: feature.featureName ?? `feature-${index}`,
          name: feature.featureDisplayName || formatFeatureName(feature.featureName),
          detail: formatFeatureLimit(feature),
          status,
        };
      });
  }, [planFeatures]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-gradient-glass border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-5 h-5 text-primary" />
            {planName || "Premium"} benefits
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            These benefits are synced directly from your current plan configuration. Refresh to see any recent updates.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {error && (
              <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                {error}
              </div>
            )}
            {featureList.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between gap-3 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.detail}</p>
                  </div>
                </div>
                <Badge
                  className={
                    feature.status === "unlimited"
                      ? "bg-gradient-to-r from-purple-600 to-primary text-white border-0"
                      : feature.status === "disabled"
                        ? "border-destructive/40 text-destructive bg-destructive/10"
                        : "bg-primary/10 text-primary border-primary/30"
                  }
                >
                  {feature.status === "unlimited"
                    ? "Unlimited"
                    : feature.status === "disabled"
                      ? "Disabled"
                      : "Limited"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground/80">
          Data comes from subscriptionPlanApi. If it differs from your invoice snapshot, review the Payments tab or contact support.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PlanFeaturesDialog;
