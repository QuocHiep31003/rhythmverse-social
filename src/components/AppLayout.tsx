import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import TopBar from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

const MobileToggle = () => {
  const { toggleSidebar } = useSidebar();
  const totalNotifications = 5; // This would come from global state

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 bg-background/80 backdrop-blur-sm border border-border/40"
    >
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
    </Button>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-dark">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {!isMobile && <TopBar />}
          <main className="flex-1 overflow-auto p-0">
            {children}
          </main>
        </div>
        {isMobile && <MobileToggle />}
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;