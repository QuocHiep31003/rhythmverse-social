import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { featureUsageApi, FeatureName, FeatureUsageDTO } from "@/services/api/featureUsageApi";
import { useToast } from "@/hooks/use-toast";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [usage, setUsage] = useState<FeatureUsageDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUsage = useCallback(async () => {
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
  }, [featureName]);

  const useFeature = useCallback(async (): Promise<boolean> => {
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
    if (autoCheck) {
      checkUsage();
    }
  }, [autoCheck, checkUsage]);

  const canUse = usage?.canUse ?? false;
  const isPremium = usage?.isPremium ?? false;
  const remaining = usage?.remaining ?? 0;

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





