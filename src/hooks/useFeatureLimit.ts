import { useState, useEffect, useCallback, useMemo } from "react";
import { featureUsageApi, FeatureName, FeatureUsageDTO } from "@/services/api/featureUsageApi";

const FEATURE_LIMITS_DISABLED = true;

const buildUnlimitedUsage = (featureName: FeatureName): FeatureUsageDTO => ({
  featureName,
  canUse: true,
  isPremium: false,
  remaining: -1,
  limit: null,
  usageCount: 0,
});

interface UseFeatureLimitOptions {
  featureName: FeatureName;
  autoCheck?: boolean; // Tự động check khi mount
  onLimitReached?: () => void; // Callback khi hết lượt
}

interface UseFeatureLimitReturn {
  usage: FeatureUsageDTO | null;
  isLoading: boolean;
  error: string | null;
  canUse: boolean;
  isPremium: boolean;
  remaining: number;
  checkUsage: () => Promise<void>;
  useFeature: () => Promise<boolean>; // Return true nếu thành công, false nếu hết lượt
  refresh: () => Promise<void>;
}

export const useFeatureLimit = (
  options: UseFeatureLimitOptions
): UseFeatureLimitReturn => {
  const { featureName, autoCheck = true, onLimitReached } = options;

  const unlimitedUsage = useMemo(() => buildUnlimitedUsage(featureName), [featureName]);

  const [usage, setUsage] = useState<FeatureUsageDTO | null>(
    FEATURE_LIMITS_DISABLED ? unlimitedUsage : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUsage = useCallback(async () => {
    if (FEATURE_LIMITS_DISABLED) {
      setUsage(unlimitedUsage);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await featureUsageApi.getFeatureUsage(featureName);
      setUsage(data);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to check feature usage";
      setError(errorMessage);
      console.error("Error checking feature usage:", err);
    } finally {
      setIsLoading(false);
    }
  }, [featureName, unlimitedUsage]);

  const useFeature = useCallback(async (): Promise<boolean> => {
    if (FEATURE_LIMITS_DISABLED) {
      return true;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await featureUsageApi.useFeature(featureName);
      setUsage(data);

      // Check bằng remaining thay vì canUse để chính xác hơn
      // Nếu là premium hoặc còn lượt (remaining > 0) thì cho phép
      const isPremiumUser = data.isPremium === true;
      const hasRemaining = (data.remaining ?? 0) > 0;
      
      if (!isPremiumUser && !hasRemaining) {
        // Hết lượt (không premium và remaining = 0)
        if (onLimitReached) {
          onLimitReached();
        }
        return false;
      }

      return true;
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to use feature";
      setError(errorMessage);
      
      // Nếu lỗi 403 (forbidden) - hết lượt
      if (err?.message?.includes("limit exceeded") || err?.message?.includes("403")) {
        if (onLimitReached) {
          onLimitReached();
        }
        return false;
      }

      console.error("Error using feature:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [featureName, onLimitReached]);

  useEffect(() => {
    if (FEATURE_LIMITS_DISABLED) {
      setUsage(unlimitedUsage);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (autoCheck) {
      checkUsage();
    }
  }, [autoCheck, checkUsage, unlimitedUsage]);

  const canUse = usage?.canUse ?? true;
  const isPremium = usage?.isPremium ?? false;
  const remaining = usage?.remaining ?? -1;

  return {
    usage,
    isLoading,
    error,
    canUse,
    isPremium,
    remaining,
    checkUsage,
    useFeature,
    refresh: checkUsage,
  };
};





