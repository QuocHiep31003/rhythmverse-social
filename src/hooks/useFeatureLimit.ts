import { useState, useEffect, useCallback, useMemo } from "react";
import {
  featureUsageApi,
  FeatureName,
  FeatureUsageDTO,
  FeatureLimitType,
  FeatureLimitPeriod,
} from "@/services/api/featureUsageApi";

const FEATURE_LIMITS_DISABLED = false;

const buildUnlimitedUsage = (featureName: FeatureName): FeatureUsageDTO => ({
  featureName,
  canUse: true,
  isPremium: true,
  remaining: null,
  limit: null,
  usageCount: 0,
  limitType: FeatureLimitType.UNLIMITED,
  limitPeriod: FeatureLimitPeriod.NONE,
  periodValue: 0,
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
  limit: number | null;
  limitType: FeatureLimitType;
  limitPeriod: FeatureLimitPeriod;
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
      // Lấy thông tin usage từ backend - backend đã xử lý logic dựa trên admin config
      // Backend sẽ kiểm tra plan của user và PlanFeature để xác định canUse
      const data = await featureUsageApi.getFeatureUsage(featureName);
      setUsage(data);
      
      // Nếu canUse = false và có callback, gọi callback để hiển thị modal
      // Tuy nhiên, chỉ gọi khi user thực sự cố gắng sử dụng tính năng, không phải khi check
      // (onLimitReached chỉ được gọi trong useFeature khi thực sự không thể dùng)
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

      // Dùng canUse từ backend - backend đã xử lý tất cả logic dựa trên admin config
      const canUseFeature = data.canUse === true;
      
      if (!canUseFeature) {
        // Backend đã check và không cho phép sử dụng (có thể do hết lượt hoặc feature bị disabled)
        if (onLimitReached) {
          onLimitReached();
        }
        return false;
      }

      return true;
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to use feature";
      setError(errorMessage);
      
      // Nếu lỗi 403 (forbidden) hoặc limit exceeded - backend đã check và không cho phép
      if (err?.message?.includes("limit exceeded") || 
          err?.message?.includes("403") || 
          err?.message?.includes("cannot use") ||
          err?.status === 403) {
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

  // Lấy thông tin từ usage - backend đã xử lý logic dựa trên admin config
  // canUse từ backend phản ánh đúng trạng thái: 
  // - true nếu feature được enable trong admin và user còn lượt (hoặc unlimited)
  // - false nếu feature bị disable (limitValue = 0) hoặc user đã hết lượt
  const limitType = usage?.limitType ?? FeatureLimitType.UNLIMITED;
  const limit = typeof usage?.limit === "number" ? usage?.limit : null;
  const canUse = usage?.canUse ?? true; // Default true để tránh block khi chưa load xong
  const remaining =
    typeof usage?.remaining === "number"
      ? usage.remaining
      : limitType === FeatureLimitType.UNLIMITED
      ? -1
      : 0;
  const isPremium =
    usage?.isPremium ??
    (limitType === FeatureLimitType.UNLIMITED ||
      limit === null ||
      limit === undefined);
  const limitPeriod = usage?.limitPeriod ?? FeatureLimitPeriod.NONE;

  return {
    usage,
    isLoading,
    error,
    canUse,
    isPremium,
    remaining,
    limit,
    limitType,
    limitPeriod,
    checkUsage,
    useFeature,
    refresh: checkUsage,
  };
};





