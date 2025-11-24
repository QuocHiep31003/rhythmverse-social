import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";
import { 
  Check, 
  X, 
  Crown, 
  Music, 
  Download, 
  Volume2, 
  Users, 
  BarChart3,
  Zap,
  Heart,
  MessageCircle,
  Trophy,
  Sparkles,
  Loader2
} from "lucide-react";
import { paymentApi } from "@/services/api/paymentApi";
import { userApi } from "@/services/api/userApi";
import { subscriptionPlanApi, SubscriptionPlanDTO } from "@/services/api/subscriptionPlanApi";
import { FeatureName } from "@/services/api/featureUsageApi";
import { useToast } from "@/hooks/use-toast";

const Premium = () => {
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const { toast } = useToast();

  // Map feature name to icon và text
  const getFeatureIcon = (featureName: string) => {
    const iconMap: Record<string, any> = {
      PLAYLIST_CREATE: Heart,
      OFFLINE_DOWNLOAD: Download,
      AI_SEARCH: Zap,
      ADVANCED_ANALYTICS: BarChart3,
      CUSTOM_THEME: Sparkles,
    };
    return iconMap[featureName] || Music;
  };

  const getFeatureText = (featureName: string) => {
    const textMap: Record<string, string> = {
      PLAYLIST_CREATE: "Create playlists",
      OFFLINE_DOWNLOAD: "Offline downloads",
      AI_SEARCH: "AI search",
      ADVANCED_ANALYTICS: "Advanced analytics",
      CUSTOM_THEME: "Custom themes",
    };
    return textMap[featureName] || featureName;
  };

  // Convert plan features to display format
  const getPlanFeatures = (plan: SubscriptionPlanDTO | null) => {
    if (!plan || !plan.features) return [];
    
    return plan.features.map(f => ({
      icon: getFeatureIcon(f.featureName),
      text: f.featureDisplayName || getFeatureText(f.featureName),
      included: !!f.isEnabled,
      limit: f.limitValue === null ? "Unlimited" : f.limitValue
    }));
  };

  // Tìm FREE và PREMIUM plan
  const freePlan = subscriptionPlans.find(p => p.planCode?.toUpperCase() === "FREE");
  const premiumPlan = subscriptionPlans.find(p => p.planCode?.toUpperCase() === "PREMIUM");
  
  // Lấy các gói khác (không phải FREE và PREMIUM)
  const otherPlans = subscriptionPlans.filter(
    p => p.planCode?.toUpperCase() !== "FREE" && p.planCode?.toUpperCase() !== "PREMIUM"
  );
  const annualPlan = otherPlans.find(p => p.planCode?.toUpperCase() === "PREMIUM_YEARLY") || null;
  const additionalPlans = otherPlans.filter(p => p.planCode?.toUpperCase() !== "PREMIUM_YEARLY");

  const formatPrice = (plan: SubscriptionPlanDTO) => {
    if (!plan.price || plan.price <= 0) return "Miễn phí";
    return `${Number(plan.price).toLocaleString("vi-VN")} ${plan.currency || "VND"}`;
  };

  const getDurationLabel = (plan: SubscriptionPlanDTO) => {
    if (!plan.durationDays || !plan.price || plan.price <= 0) return null;
    return `Chu kỳ ${plan.durationDays.toLocaleString("vi-VN")} ngày`;
  };

  const renderPlanCard = (
    plan: SubscriptionPlanDTO | null,
    options?: {
      badge?: string;
      accent?: "free" | "premium" | "annual" | "default";
      highlight?: boolean;
      buttonLabel?: string;
      subtext?: string;
      lockButton?: boolean;
    }
  ) => {
    if (!plan) return null;

    const accent = options?.accent || "default";
    const accentClasses: Record<string, string> = {
      free: "from-emerald-500/30 via-emerald-500/10 to-transparent border-emerald-400/30",
      premium: "from-primary/50 via-pink-500/30 to-violet-600/20 border-primary/40 shadow-[0_10px_40px_-20px_rgba(147,51,234,0.7)]",
      annual: "from-indigo-500/40 via-sky-500/20 to-transparent border-indigo-400/40",
      default: "from-white/10 via-white/5 to-transparent border-white/10",
    };

    const planFeatures = getPlanFeatures(plan);
    const isFreePlan = !plan.price || plan.price <= 0;
    const isButtonDisabled = options?.lockButton || isFreePlan || isUpgrading || !plan.price || plan.price <= 0;
    const displayBadge = options?.badge;
    const buttonText =
      isButtonDisabled && isFreePlan
        ? "Current Plan"
        : isUpgrading
        ? "Processing..."
        : options?.buttonLabel || `Upgrade to ${plan.planName}`;

    const baseButtonClass =
      "mt-4 w-full rounded-2xl font-semibold tracking-wide transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
    const highlightButtonClass =
      "bg-gradient-to-r from-primary via-pink-500 to-orange-400 text-white shadow-[0_20px_45px_-20px_rgba(244,114,182,0.9)] hover:shadow-[0_25px_55px_-20px_rgba(244,114,182,0.9)] hover:translate-y-0.5";
    const mutedButtonClass =
      "bg-white/10 hover:bg-white/20 text-white/90 border border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]";

    return (
      <div
        key={plan.planCode}
        className={`relative rounded-3xl border bg-gradient-to-br ${accentClasses[accent]} p-[1.5px] flex flex-col h-full`}
      >
        <div className="rounded-[calc(1.5rem-1.5px)] bg-slate-950/80 backdrop-blur-xl h-full px-5 py-5 md:px-6 md:py-6 flex flex-col shadow-lg">
          {displayBadge && (
            <div className="mb-4 flex justify-between items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-white/10 text-white/80">
                {displayBadge}
              </span>
              {options?.highlight && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary via-pink-500 to-orange-400/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-[0_15px_35px_-20px_rgba(244,114,182,0.95)]">
                  <Sparkles className="w-3 h-3" />
                  Best for power listeners
                </span>
              )}
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-white">{plan.planName}</h3>
          </div>
          <div className="mt-4 mb-2 space-y-1">
            <div className="text-4xl font-black text-white">{formatPrice(plan)}</div>
            {getDurationLabel(plan) ? (
              <p className="text-sm text-white/70">{getDurationLabel(plan)}</p>
            ) : (
              <div className="h-3" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[40px]">
            {plan.description || "Tận hưởng trải nghiệm âm nhạc đầy đủ tính năng."}
          </p>
          {options?.subtext ? (
            <p className="text-xs text-white/60 mb-4">{options.subtext}</p>
          ) : (
            <div className="mb-3 h-3" />
          )}
          <div className="space-y-1.5 flex-1 min-h-[260px]">
            {planFeatures.length ? (
              planFeatures.map((feature, index) => (
                <div
                  key={`${plan.planCode}-feature-${index}`}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-1.5 text-sm ${
                    feature.included
                      ? "border-white/5 bg-white/5 text-white/90"
                      : "border-white/5 bg-white/0 text-white/50"
                  }`}
                >
                  {feature.included ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <feature.icon className="w-4 h-4 shrink-0 text-white/70" />
                  <span className="flex-1">
                    {feature.text}
                    {feature.limit !== "Unlimited" && ` (${feature.limit})`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/70">Chưa có tính năng cho gói này.</div>
            )}
          </div>
          <Button
            variant={options?.highlight ? "hero" : "outline"}
            className={`${baseButtonClass} ${
              options?.highlight ? highlightButtonClass : mutedButtonClass
            }`}
            disabled={isButtonDisabled}
            onClick={() => {
              if (!isFreePlan) {
                handleUpgrade(plan);
              }
            }}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    );
  };

  // Lấy user info và subscription plans khi component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingPlans(true);
        const plans = await subscriptionPlanApi.getActivePlans().catch(() => []);
        setSubscriptionPlans(plans || []);

        try {
          const user = await userApi.getCurrentProfile();
          setUserId(user.id || null);
        } catch (userError) {
          console.warn('Failed to fetch user profile:', userError);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setSubscriptionPlans([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchData();
  }, []);

  const benefits = [
    {
      icon: Download,
      title: "Unlimited Downloads",
      description: "Download any song to listen offline, perfect for on-the-go"
    },
    {
      icon: Volume2,
      title: "High-Quality Audio",
      description: "Stream music at crystal-clear 320kbps for the best experience"
    },
    {
      icon: Zap,
      title: "AI-Powered Search",
      description: "Find songs by melody or partial lyrics with AI"
    },
    {
      icon: BarChart3,
      title: "Listening Analytics",
      description: "Deep insights into your music preferences and discover new trends"
    },
    {
      icon: Users,
      title: "Social Features",
      description: "Share music, create collaborative playlists, and join the community"
    },
    {
      icon: Trophy,
      title: "Exclusive Content",
      description: "Join events, early releases, and exclusive artist content"
    }
  ];

  const handleUpgrade = async (targetPlan?: SubscriptionPlanDTO) => {
    try {
      setIsUpgrading(true);

      const plan = targetPlan || premiumPlan;
      if (!plan) {
        throw new Error("Plan not found. Please try again.");
      }

      const amountVND = plan.price ? Number(plan.price) : 0;
      if (amountVND <= 0) {
        throw new Error("Invalid order amount. Please try again.");
      }

      const planName = plan.planName || plan.planCode || "Premium";
      const rawDescription = userId
        ? `${planName} - ${userId}`
        : `${planName} Subscription`;
      // PayOS giới hạn mô tả 25 ký tự nên cần cắt ngắn
      const description = rawDescription.slice(0, 25);

      const result = await paymentApi.createOrder({
        amount: amountVND,
        description,
      });

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("Failed to receive payment link from server");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      setIsUpgrading(false);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-primary bg-clip-text text-transparent mb-4">
            <Crown className="w-8 h-8 text-primary" />
            <h1 className="text-5xl font-bold">Discover Premium</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience music to the fullest with advanced features, high quality, and exclusive content.
          </p>
        </div>

        

        {/* Pricing Cards */}
        {isLoadingPlans ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mb-12">
            <div className="grid gap-3 lg:grid-cols-3 max-w-6xl mx-auto auto-rows-fr">
              {renderPlanCard(freePlan || null, {
                accent: "free",
                badge: "Starter Plan",
                buttonLabel: "Current Plan",
                lockButton: true,
              })}
              {renderPlanCard(premiumPlan || null, {
                accent: "premium",
                badge: "Most Popular",
                highlight: true,
                buttonLabel: "Upgrade to Premium",
              })}
              {renderPlanCard(annualPlan, {
                accent: "annual",
                badge: "Best Value",
                buttonLabel: "Upgrade to Gói Premium 1 Năm",
              })}
              {additionalPlans.map(plan =>
                renderPlanCard(plan, {
                  accent: "default",
                  badge: plan.planCode,
                  buttonLabel: `Upgrade to ${plan.planName}`,
                })
              )}
            </div>
          </div>
        )}

        {/* Benefits Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Premium?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                question: "Can I cancel anytime?",
                answer: "Yes. You can cancel your Premium subscription anytime and still keep your benefits until the end of the billing cycle."
              },
              {
                question: "Is there a free trial?",
                answer: "Yes! New users get a 30-day Premium trial. No credit card required to start."
              },
              {
                question: "What is Premium audio quality?",
                answer: "Premium streams music at 320kbps quality, compared to 128kbps on the Free plan."
              },
              {
                question: "Can I use Premium on multiple devices?",
                answer: "Yes, you can use Premium on up to 5 devices simultaneously."
              }
            ].map((faq, index) => (
              <Card key={index} className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12 p-8 bg-gradient-primary/10 rounded-lg border border-primary/20">
          <h2 className="text-2xl font-bold mb-4">Ready to upgrade your music experience?</h2>
          <p className="text-muted-foreground mb-6">Join millions of users who have chosen Premium.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="hero" 
              size="lg" 
              onClick={() => handleUpgrade(premiumPlan)} 
              disabled={isUpgrading || !premiumPlan}
            >
              {isUpgrading ? "Processing..." : "Start Your Premium Journey"}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/payment/history')}
            >
              View Payment History
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Premium;