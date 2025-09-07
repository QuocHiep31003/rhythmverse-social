import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
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
  Sparkles
} from "lucide-react";

const Premium = () => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

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
      { icon: Zap, text: "AI-powered search", included: false },
      { icon: Sparkles, text: "Custom themes", included: false }
    ],
    premium: [
      { icon: Music, text: "Unlimited music streaming", included: true },
      { icon: Volume2, text: "High-quality audio (320kbps)", included: true },
      { icon: Heart, text: "Unlimited playlists & albums", included: true },
      { icon: Users, text: "Full social features", included: true },
      { icon: Download, text: "Unlimited offline downloads", included: true },
      { icon: BarChart3, text: "Advanced listening analytics", included: true },
      { icon: MessageCircle, text: "24/7 priority support", included: true },
      { icon: Trophy, text: "Exclusive events & content", included: true },
      { icon: Zap, text: "AI melody & lyrics search", included: true },
      { icon: Sparkles, text: "Custom themes & profiles", included: true }
    ]
  };

  const pricing = {
    monthly: { price: 9.99, originalPrice: null },
    yearly: { price: 99.99, originalPrice: 119.88 }
  };

  const benefits = [
    {
      icon: Download,
      title: "Unlimited Downloads",
      description: "Download any track for offline listening, perfect for commutes and travel"
    },
    {
      icon: Volume2,
      title: "High-Quality Audio",
      description: "Stream in crystal clear 320kbps quality for the best listening experience"
    },
    {
      icon: Zap,
      title: "AI-Powered Search",
      description: "Find songs by humming melodies or typing partial lyrics with our AI technology"
    },
    {
      icon: BarChart3,
      title: "Listening Analytics",
      description: "Get detailed insights into your music taste and discover new patterns"
    },
    {
      icon: Users,
      title: "Social Features",
      description: "Share music with friends, create collaborative playlists, and join music communities"
    },
    {
      icon: Trophy,
      title: "Exclusive Content",
      description: "Access premium events, early releases, and exclusive artist content"
    }
  ];

  const handleUpgrade = () => {
    setIsUpgrading(true);
    // Mock payment process
    setTimeout(() => {
      setIsUpgrading(false);
      // Show success message or redirect
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-primary bg-clip-text text-transparent mb-4">
            <Crown className="w-8 h-8 text-primary" />
            <h1 className="text-5xl font-bold">EchoVerse Premium</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of your music experience with premium features, 
            high-quality streaming, and exclusive content.
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
              <Badge variant="secondary" className="ml-2">Save 17%</Badge>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Free Plan */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="text-4xl font-bold">$0</div>
              <p className="text-muted-foreground">Perfect for casual listeners</p>
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
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-gradient-primary/10 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-primary text-white px-4 py-1 rounded-bl-lg">
              <span className="text-sm font-medium">Most Popular</span>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                Premium
              </CardTitle>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  ${pricing[selectedPlan].price}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{selectedPlan === "monthly" ? "month" : "year"}
                  </span>
                </div>
                {pricing[selectedPlan].originalPrice && (
                  <div className="text-sm text-muted-foreground line-through">
                    Originally ${pricing[selectedPlan].originalPrice}/year
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">Everything you need for the ultimate music experience</p>
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
                {isUpgrading ? "Processing..." : "Upgrade to Premium"}
              </Button>
            </CardContent>
          </Card>
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
                answer: "Yes, you can cancel your premium subscription at any time. Your premium features will remain active until the end of your billing period."
              },
              {
                question: "Do you offer a free trial?",
                answer: "Yes! New users get a 30-day free trial of Premium. No credit card required to start."
              },
              {
                question: "What audio quality do I get with Premium?",
                answer: "Premium subscribers enjoy high-quality 320kbps audio streaming, compared to 128kbps for free users."
              },
              {
                question: "Can I use Premium on multiple devices?",
                answer: "Yes, you can use your Premium account on up to 5 devices simultaneously."
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
          <p className="text-muted-foreground mb-6">Join millions of music lovers who've already made the switch to Premium.</p>
          <Button variant="hero" size="lg" onClick={handleUpgrade} disabled={isUpgrading}>
            {isUpgrading ? "Processing..." : "Start Your Premium Journey"}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Premium;