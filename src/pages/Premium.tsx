import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { exchangeRateApi } from "@/services/api/exchangeRateApi";
import { userApi } from "@/services/api/userApi";
import { useToast } from "@/hooks/use-toast";

const Premium = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const { toast } = useToast();

  const features = {
    free: [
      { icon: Music, text: "Basic music streaming", included: true },
      { icon: Volume2, text: "Standard audio quality", included: true },
      { icon: Heart, text: "Create playlists", included: true },
      { icon: Users, text: "Basic social features", included: true },
      { icon: Download, text: "Offline downloads", included: false },
      { icon: BarChart3, text: "Advanced analytics", included: false },
      { icon: MessageCircle, text: "Priority support", included: false },
      { icon: Trophy, text: "Exclusive events", included: false },
      { icon: Zap, text: "AI search", included: false },
      { icon: Sparkles, text: "Custom themes", included: false }
    ],
    premium: [
      { icon: Music, text: "Unlimited music streaming", included: true },
      { icon: Volume2, text: "High-quality audio (320kbps)", included: true },
      { icon: Heart, text: "Unlimited playlists & albums", included: true },
      { icon: Users, text: "Full social features", included: true },
      { icon: Download, text: "Unlimited offline downloads", included: true },
      { icon: BarChart3, text: "Listening habit analytics", included: true },
      { icon: MessageCircle, text: "24/7 support", included: true },
      { icon: Trophy, text: "Exclusive content & events", included: true },
      { icon: Zap, text: "AI melody & lyrics search", included: true },
      { icon: Sparkles, text: "Custom themes & profiles", included: true }
    ]
  };

  // Lấy tỉ giá và user info khi component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingRate(true);
        const rate = await exchangeRateApi.getUSDtoVND();
        setExchangeRate(rate);
        
        // Lấy userId
        try {
          const user = await userApi.getCurrentProfile();
          setUserId(user.id || null);
        } catch (userError) {
          console.warn('Failed to fetch user profile:', userError);
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Dùng tỉ giá mặc định nếu có lỗi
        setExchangeRate(24000);
      } finally {
        setIsLoadingRate(false);
      }
    };

    fetchData();
  }, []);

  // Tính toán giá VNĐ dựa trên tỉ giá (reactive với exchangeRate)
  const pricing = useMemo(() => {
    const getAmountVND = (usdPrice: number): number => {
      return exchangeRate ? Math.round(usdPrice * exchangeRate) : Math.round(usdPrice * 24000);
    };

    return {
      monthly: { 
        price: 0.1, 
        originalPrice: null,
        amountVND: getAmountVND(0.1)
      },
      yearly: { 
        price: 1, 
        originalPrice: 48.0,
        amountVND: getAmountVND(1)
      }
    };
  }, [exchangeRate]);

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

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      
      const plan = pricing[selectedPlan];
      
      // Kiểm tra plan và amountVND
      if (!plan || !plan.amountVND || plan.amountVND <= 0) {
        throw new Error('Invalid order amount. Please try again.');
      }
      
      // Format description chuyên nghiệp: User ID + Plan
      const planName = selectedPlan === "monthly" ? "Monthly" : "Yearly";
      const description = userId 
        ? `Premium ${planName} - User ID: ${userId}`
        : `Premium ${planName} Subscription`;
      
      console.log('Creating order with:', {
        amount: plan.amountVND,
        description: description,
        plan: selectedPlan,
        userId: userId
      });
      
      // Tạo đơn hàng
      const result = await paymentApi.createOrder({
        amount: plan.amountVND,
        description: description,
        // buyerEmail có thể lấy từ user profile nếu cần
      });

      console.log('Order created successfully:', result);

      // Redirect đến PayOS checkout
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Failed to receive payment link from server');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setIsUpgrading(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create order. Please try again.',
        variant: 'destructive',
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

        

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted/20 rounded-lg p-1 flex">
            <Button
              variant={selectedPlan === "monthly" ? "default" : "ghost"}
              onClick={() => setSelectedPlan("monthly")}
              className="rounded-md"
            >
              Monthly
            </Button>
            <Button
              variant={selectedPlan === "yearly" ? "default" : "ghost"}
              onClick={() => setSelectedPlan("yearly")}
              className="rounded-md"
            >
              Yearly
              <Badge variant="secondary" className="ml-2">Save ~12%</Badge>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="flex justify-center mb-12">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full items-stretch [&>div]:w-full">
          {/* Free Plan */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 h-full flex flex-col">
            <CardHeader className="text-center pb-8 flex flex-col !p-6 min-h-[200px]">
              <CardTitle className="text-2xl mb-4">Free Plan</CardTitle>
              <div className="text-4xl font-bold mb-2">$0</div>
              <div className="h-5 mb-2"></div>
              <p className="text-muted-foreground">Perfect for casual listeners</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 !p-6 !pt-0">
              <div className="flex-1 flex flex-col justify-center items-center space-y-4">
                <div className="w-full max-w-sm space-y-4">
                  {features.free.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-white shrink-0" />
                      )}
                      <feature.icon className="w-4 h-4 shrink-0" />
                      <span className={feature.included ? "" : "text-muted-foreground"}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full mt-auto bg-muted/20 hover:bg-muted/30">
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-gradient-primary/10 border-primary/20 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-bl-lg">
              <span className="text-sm font-medium">Most Popular</span>
            </div>
            <CardHeader className="text-center pb-8 flex flex-col !p-6 min-h-[200px]">
              <CardTitle className="text-2xl flex items-center justify-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-primary" />
                Premium Plan
              </CardTitle>
              <div className="space-y-2 mb-2">
                <div className="text-4xl font-bold">
                  ${pricing[selectedPlan].price}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{selectedPlan === "monthly" ? "month" : "year"}
                  </span>
                </div>
                {pricing[selectedPlan].originalPrice && (
                  <div className="text-sm text-muted-foreground line-through">
                    Original ${pricing[selectedPlan].originalPrice}/year
                  </div>
                )}
                {!pricing[selectedPlan].originalPrice && (
                  <div className="h-5"></div>
                )}
              </div>
              <p className="text-muted-foreground">Everything you need for the ultimate music experience</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 !p-6 !pt-0">
              <div className="flex-1 flex flex-col justify-center items-center space-y-4">
                <div className="w-full max-w-sm space-y-4">
                  {features.premium.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0" />
                      <feature.icon className="w-4 h-4 shrink-0" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button 
                variant="hero" 
                className="w-full mt-auto" 
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? "Processing..." : "Upgrade to Premium"}
              </Button>
            </CardContent>
          </Card>
          </div>
        </div>

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
            <Button variant="hero" size="lg" onClick={handleUpgrade} disabled={isUpgrading}>
              {isUpgrading ? "Processing..." : "Start Your Premium Journey"}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/profile')}
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