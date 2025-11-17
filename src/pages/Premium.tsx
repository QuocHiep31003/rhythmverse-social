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
import { useToast } from "@/hooks/use-toast";

const Premium = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const { toast } = useToast();

  const features = {
    free: [
      { icon: Music, text: "Nghe nhạc cơ bản", included: true },
      { icon: Volume2, text: "Chất lượng âm thanh tiêu chuẩn", included: true },
      { icon: Heart, text: "Tạo danh sách phát", included: true },
      { icon: Users, text: "Tính năng xã hội cơ bản", included: true },
      { icon: Download, text: "Tải xuống ngoại tuyến", included: false },
      { icon: BarChart3, text: "Phân tích nâng cao", included: false },
      { icon: MessageCircle, text: "Hỗ trợ ưu tiên", included: false },
      { icon: Trophy, text: "Sự kiện độc quyền", included: false },
      { icon: Zap, text: "Tìm kiếm bằng AI", included: false },
      { icon: Sparkles, text: "Chủ đề tuỳ chỉnh", included: false }
    ],
    premium: [
      { icon: Music, text: "Nghe nhạc không giới hạn", included: true },
      { icon: Volume2, text: "Âm thanh chất lượng cao (320kbps)", included: true },
      { icon: Heart, text: "Không giới hạn playlist & album", included: true },
      { icon: Users, text: "Đầy đủ tính năng xã hội", included: true },
      { icon: Download, text: "Tải xuống ngoại tuyến không giới hạn", included: true },
      { icon: BarChart3, text: "Phân tích thói quen nghe nhạc", included: true },
      { icon: MessageCircle, text: "Hỗ trợ 24/7", included: true },
      { icon: Trophy, text: "Nội dung & sự kiện độc quyền", included: true },
      { icon: Zap, text: "Tìm kiếm giai điệu & lời bằng AI", included: true },
      { icon: Sparkles, text: "Chủ đề & hồ sơ tuỳ chỉnh", included: true }
    ]
  };

  // Lấy tỉ giá khi component mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setIsLoadingRate(true);
        const rate = await exchangeRateApi.getUSDtoVND();
        setExchangeRate(rate);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Dùng tỉ giá mặc định nếu có lỗi
        setExchangeRate(24000);
      } finally {
        setIsLoadingRate(false);
      }
    };

    fetchExchangeRate();
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
        price: 42.0, 
        originalPrice: 48.0,
        amountVND: getAmountVND(42.0)
      }
    };
  }, [exchangeRate]);

  const benefits = [
    {
      icon: Download,
      title: "Tải xuống không giới hạn",
      description: "Tải bất kỳ bài hát nào để nghe ngoại tuyến, lý tưởng khi di chuyển"
    },
    {
      icon: Volume2,
      title: "Âm thanh chất lượng cao",
      description: "Phát nhạc 320kbps trong trẻo cho trải nghiệm tốt nhất"
    },
    {
      icon: Zap,
      title: "Tìm kiếm bằng AI",
      description: "Tìm bài hát bằng giai điệu hoặc một phần lời với AI"
    },
    {
      icon: BarChart3,
      title: "Phân tích thói quen nghe",
      description: "Hiểu sâu sở thích âm nhạc và khám phá xu hướng mới"
    },
    {
      icon: Users,
      title: "Tính năng xã hội",
      description: "Chia sẻ nhạc, tạo playlist chung và tham gia cộng đồng"
    },
    {
      icon: Trophy,
      title: "Nội dung độc quyền",
      description: "Tham gia sự kiện, nghe phát hành sớm và nội dung nghệ sĩ"
    }
  ];

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      
      const plan = pricing[selectedPlan];
      
      // Kiểm tra plan và amountVND
      if (!plan || !plan.amountVND || plan.amountVND <= 0) {
        throw new Error('Giá trị đơn hàng không hợp lệ. Vui lòng thử lại.');
      }
      
      const description = `Premium ${selectedPlan === "monthly" ? "Tháng" : "Năm"}`;
      
      console.log('Creating order with:', {
        amount: plan.amountVND,
        description: description,
        plan: selectedPlan
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
        throw new Error('Không nhận được link thanh toán từ server');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setIsUpgrading(false);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tạo đơn hàng. Vui lòng thử lại.',
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
            <h1 className="text-5xl font-bold">Khám phá Premium</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Trải nghiệm âm nhạc trọn vẹn với tính năng nâng cao, chất lượng cao và nội dung độc quyền.
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
              Theo tháng
            </Button>
            <Button
              variant={selectedPlan === "yearly" ? "default" : "ghost"}
              onClick={() => setSelectedPlan("yearly")}
              className="rounded-md"
            >
              Theo năm
              <Badge variant="secondary" className="ml-2">Tiết kiệm ~12%</Badge>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Free Plan */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Gói Free</CardTitle>
              <div className="text-4xl font-bold">$0</div>
              <p className="text-muted-foreground">Phù hợp với người nghe cơ bản</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.free.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <feature.icon className="w-4 h-4 shrink-0" />
                  <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                    {feature.text}
                  </span>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-6">
                Gói hiện tại
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-gradient-primary/10 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-primary text-white px-4 py-1 rounded-bl-lg">
              <span className="text-sm font-medium">Phổ biến nhất</span>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                Gói Premium
              </CardTitle>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  ${pricing[selectedPlan].price}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{selectedPlan === "monthly" ? "tháng" : "năm"}
                  </span>
                </div>
                {exchangeRate && !isLoadingRate && (
                  <div className="text-sm text-muted-foreground">
                    1 USD = {exchangeRate.toLocaleString('vi-VN')} VNĐ
                  </div>
                )}
                {isLoadingRate && (
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang tải tỉ giá...</span>
                  </div>
                )}
                {pricing[selectedPlan].originalPrice && (
                  <div className="text-sm text-muted-foreground line-through">
                    Gốc ${pricing[selectedPlan].originalPrice}/năm
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">Tất cả những gì bạn cần cho trải nghiệm âm nhạc tối ưu</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.premium.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <feature.icon className="w-4 h-4 shrink-0" />
                  <span>{feature.text}</span>
                </div>
              ))}
              <Button 
                variant="hero" 
                className="w-full mt-6" 
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? "Đang xử lý..." : "Nâng cấp lên Premium"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Vì sao nên chọn Premium?</h2>
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
          <h2 className="text-3xl font-bold text-center mb-8">Câu hỏi thường gặp</h2>
          <div className="space-y-4">
            {[
              {
                question: "Tôi có thể hủy bất cứ lúc nào không?",
                answer: "Có. Bạn có thể hủy gói Premium bất cứ lúc nào và vẫn giữ quyền lợi đến hết chu kỳ thanh toán."
              },
              {
                question: "Có dùng thử miễn phí không?",
                answer: "Có! Người dùng mới được dùng thử Premium 30 ngày. Không cần thẻ để bắt đầu."
              },
              {
                question: "Chất lượng âm thanh của Premium là gì?",
                answer: "Premium phát nhạc chất lượng 320kbps, so với 128kbps ở gói Free."
              },
              {
                question: "Tôi có thể dùng Premium trên nhiều thiết bị không?",
                answer: "Có, bạn có thể sử dụng trên tối đa 5 thiết bị cùng lúc."
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
          <h2 className="text-2xl font-bold mb-4">Sẵn sàng nâng cấp trải nghiệm nghe nhạc?</h2>
          <p className="text-muted-foreground mb-6">Tham gia cùng hàng triệu người dùng đã chọn Premium.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="lg" onClick={handleUpgrade} disabled={isUpgrading}>
              {isUpgrading ? "Đang xử lý..." : "Bắt đầu hành trình Premium"}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/profile')}
            >
              Xem lịch sử thanh toán
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Premium;