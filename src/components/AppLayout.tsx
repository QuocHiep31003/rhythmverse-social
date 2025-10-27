import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import TopBar from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Outlet } from "react-router-dom";

/**
 * Mobile menu trigger with notification badge.
 */
const MobileTrigger = () => {
  const totalNotifications = 5; // TODO: replace with real data from global state or API

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

/**
 * App layout with sidebar and topbar.
 * Uses Outlet instead of props.children for nested routes.
 */
const AppLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-dark">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main area */}
        <SidebarInset className="flex flex-col min-w-0 lg:ml-64">
          {/* Top bar */}
          {!isMobile && <TopBar />}

          {/* Main content */}
          <main className="flex-1 p-0">
            <Outlet /> {/* ✅ render route con tại đây */}
          </main>
        </SidebarInset>

        {/* Mobile trigger */}
        <MobileTrigger />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
