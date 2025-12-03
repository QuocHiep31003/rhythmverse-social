/* PaymentSuccessPage – redesigned premium version */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Home,
  Crown,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Infinity,
  X,
  Check,
  ReceiptText,
  CalendarDays,
} from 'lucide-react';
import {
  paymentApi,
  type OrderHistoryItem,
  type PlanFeatureSnapshot,
} from '@/services/api/paymentApi';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderHistoryItem | null>(null);
  const [featureSnapshot, setFeatureSnapshot] = useState<PlanFeatureSnapshot[]>([]);
  const { toast } = useToast();

  const parsePlanFeatureSnapshot = (raw?: string | null): PlanFeatureSnapshot[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const fetchOrderDetail = useCallback(async (code: number) => {
    try {
      setLoading(true);
      const detail = await paymentApi.getOrderDetail(code);
      setOrderDetail(detail);
      setFeatureSnapshot(parsePlanFeatureSnapshot(detail.planFeatureSnapshot));
    } catch (error) {
      toast({
        title: 'Unable to load order',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const urlOrderCode = searchParams.get('orderCode');
    const sessionOrderCode = sessionStorage.getItem('payos_order_code');

    const code = urlOrderCode
      ? parseInt(urlOrderCode)
      : sessionOrderCode
        ? parseInt(sessionOrderCode)
        : null;

    if (!code) {
      setLoading(false);
      toast({
        title: 'Error',
        description: 'Order code not found',
        variant: 'destructive',
      });
      return;
    }

    setOrderCode(code);
    sessionStorage.removeItem('payos_order_code');
    fetchOrderDetail(code);
  }, [fetchOrderDetail, searchParams, toast]);

  const formatCurrency = (amount?: number | null, currency?: string | null) => {
    if (amount == null) return '—';
    const currencyCode = currency || 'VND';
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currencyCode.toUpperCase()}`;
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return value;
    }
  };

  const formatFeatureLimit = (feature: PlanFeatureSnapshot) => {
    const type = feature.limitType?.toUpperCase();

    if (!feature.isEnabled || type === 'DISABLED') return 'Not included';
    if (type === 'UNLIMITED') return 'Unlimited';

    if (type === 'LIMITED') {
      const limit = feature.limitValue ?? 0;
      const period = feature.limitPeriod?.toLowerCase();
      const value = feature.periodValue ?? 0;

      if (!period || period === 'none') return `${limit} uses`;
      return value > 1
        ? `${limit} uses every ${value} ${period}s`
        : `${limit} uses per ${period}`;
    }

    return '—';
  };

const planName = useMemo(() => {
  if (!orderDetail) return null;
  // Ưu tiên tên gói (planName), sau đó mới tới option/plan detail name
  return (
    orderDetail.planName ||
    orderDetail.planDetailName ||
    'Premium Membership'
  );
}, [orderDetail]);

const formatFeatureDisplayName = (value?: string | null) => {
  if (!value) return 'Feature';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const sortedFeatures = useMemo(() => {
  // Show full feature list (kể cả những feature đang bị tắt), chỉ sắp xếp lại
  const allFeatures = [...featureSnapshot];

  return allFeatures.sort((a, b) => {
    const aUnlimited = a.limitType?.toUpperCase() === 'UNLIMITED';
    const bUnlimited = b.limitType?.toUpperCase() === 'UNLIMITED';
    if (aUnlimited !== bUnlimited) {
      return aUnlimited ? -1 : 1;
    }
    return 0;
  });
}, [featureSnapshot]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#050505] via-[#080812] to-[#020204] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-32 -left-10 w-72 h-72 bg-primary/20 blur-[120px]" />
        <div className="absolute -top-24 right-0 w-72 h-72 bg-fuchsia-500/20 blur-[140px]" />
      </div>
      <Card className="relative w-full max-w-4xl bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_-30px_rgba(147,51,234,0.7)] animate-fadeIn max-h-[88vh] flex flex-col overflow-hidden">
        <CardHeader className="text-center space-y-3 flex-shrink-0 pb-1">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto shadow-md">
            {loading
              ? <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              : <CheckCircle2 className="w-10 h-10 text-emerald-400" />}
          </div>
          <CardTitle className="text-2xl text-white">
            {loading ? 'Processing payment...' : 'Payment successful!'}
          </CardTitle>
        </CardHeader>

        <CardContent
          className="space-y-7 overflow-y-auto pr-2 pb-6 flex-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {!loading && orderDetail && (
            <>
              <div className="space-y-4 text-center">
                <p className="text-white/80">
                  Thank you for upgrading to {planName || 'Premium'}. Your account is now active and ready to explore
                  the full experience.
                </p>
                {orderCode && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-1 text-sm font-mono text-white/80">
                    <ReceiptText className="w-4 h-4 text-primary" />
                    Order #{orderCode}
                  </div>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                {/* Summary */}
                <div className="rounded-3xl bg-gradient-to-br from-[#5c2cf2]/70 via-[#a855f7]/35 to-transparent p-[1.5px] shadow-2xl">
                  <div className="rounded-[calc(1.5rem-1.5px)] p-5 bg-black/60 backdrop-blur-xl space-y-5 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="text-left">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Plan activated</p>
                        <h3 className="text-3xl font-semibold text-white">{planName}</h3>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                        <Crown className="w-4 h-4 text-primary" />
                        {planName || 'Premium'}
                      </span>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                        <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Amount paid</p>
                        <p className="text-2xl font-semibold text-white">
                          {formatCurrency(orderDetail.planPriceSnapshot ?? orderDetail.amount)}
                        </p>
                      </div>

                      {orderDetail.planDurationDaysSnapshot && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                          <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Duration</p>
                          <p className="text-2xl font-semibold text-white">
                            {orderDetail.planDurationDaysSnapshot} days
                          </p>
                        </div>
                      )}

                      {orderDetail.paidAt && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                          <p className="text-xs uppercase tracking-wide text-white/50 mb-1 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            Activated on
                          </p>
                          <p className="text-lg font-medium text-white">{formatDate(orderDetail.paidAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature List */}
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/30 to-black/60 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-white">
                      <Crown className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold">Included Features</h4>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-white/50">
                      {sortedFeatures.length} {sortedFeatures.length === 1 ? 'feature' : 'features'}
                    </span>
                  </div>

                  {sortedFeatures.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sortedFeatures.map((feature) => {
                        const isDisabled =
                          !feature.isEnabled ||
                          feature.limitType?.toUpperCase() === 'DISABLED';
                        const isUnlimited = feature.limitType?.toUpperCase() === 'UNLIMITED';

                        return (
                          <div
                            key={feature.featureName}
                            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 flex flex-col gap-2 hover:border-primary/60 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-white">
                                {formatFeatureDisplayName(feature.featureName)}
                              </p>
                              {isDisabled ? (
                                <X className="w-4 h-4 text-rose-400" />
                              ) : isUnlimited ? (
                                <Infinity className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Check className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                isDisabled
                                  ? 'text-rose-300'
                                  : isUnlimited
                                  ? 'text-emerald-300'
                                  : 'text-blue-300'
                              }`}
                            >
                              {formatFeatureLimit(feature)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">No feature snapshot was provided for this plan.</p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/premium')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <Button
                  className="flex-1"
                  onClick={() => navigate('/')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-primary"
                onClick={() => navigate('/profile')}
              >
                View Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
