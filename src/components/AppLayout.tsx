import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import TopBar from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import userPreferenceApi from "@/services/api/userPreferenceApi";
import { getAuthToken } from "@/services/api/config";
import { coldStartStorage } from "@/utils/coldStartStorage";
import ArtistOnboardingModal from "@/components/onboarding/ArtistOnboardingModal";

interface AppLayoutProps {
  children: React.ReactNode;
}




const MobileTrigger = () => {
  const totalNotifications = 5; // This would come from global state

  return (
    <SidebarTrigger className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 bg-background/80 backdrop-blur-sm border border-border/40">
      <div className="relative">
        <Menu className="h-5 w-5" />
        {totalNotifications > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 min-w-5 text-xs p-0 flex items-center justify-center"
          >
            {totalNotifications}
          </Badge>
        )}
      </div>
    </SidebarTrigger>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const seedStatusRef = useRef<"unknown" | "checking" | "completed" | "required">("unknown");
  const inflightRef = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      seedStatusRef.current = "unknown";
      setShowOnboarding(false);
      return;
    }

    if (coldStartStorage.isCompleted()) {
      seedStatusRef.current = "completed";
      setShowOnboarding(false);
      return;
    }

    if (inflightRef.current || seedStatusRef.current === "completed") {
      return;
    }

    let cancelled = false;
    inflightRef.current = true;

    const enforceSeed = async () => {
      try {
        const seed = await userPreferenceApi.getSeed();
        if (cancelled) {
          return;
        }
        const completed = Boolean(seed?.completed && seed?.initialEmbedding);
        if (completed) {
          coldStartStorage.markCompleted();
          seedStatusRef.current = "completed";
          setShowOnboarding(false);
          return;
        }
        coldStartStorage.markIncomplete();
        seedStatusRef.current = "required";
        setShowOnboarding(true);
      } catch (error) {
        console.error("[AppLayout] Không kiểm tra được seed preferences:", error);
      } finally {
        inflightRef.current = false;
      }
    };

    enforceSeed();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const handleOnboardingCompleted = () => {
    coldStartStorage.markCompleted();
    seedStatusRef.current = "completed";
    setShowOnboarding(false);
    
    // Lưu pathname hiện tại để tránh vấn đề closure
    const currentPath = location.pathname;
    
    // Reload trang Home để gọi lại API recommend ban đầu sau khi chọn 10 artist
    // Đợi một chút để modal đóng hoàn toàn trước khi reload
    setTimeout(() => {
      if (currentPath === "/") {
        // Nếu đang ở trang Home, reload để refresh các component recommend
        window.location.reload();
      } else {
        // Nếu không ở trang Home, navigate về Home và reload
        navigate("/", { replace: true });
        setTimeout(() => {
          window.location.reload();
        }, 50);
      }
    }, 300);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-dark">

        <AppSidebar />


        <SidebarInset className="flex flex-col min-w-0 lg:ml-64">

          {!isMobile && <TopBar />}


          <main className="flex-1 p-0">
            {children}
          </main>
        </SidebarInset>


        <MobileTrigger />
      </div>

      <ArtistOnboardingModal open={showOnboarding} onCompleted={handleOnboardingCompleted} />
    </SidebarProvider>
  );
};

export default AppLayout;