import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Compass, 
  ListMusic, 
  Brain, 
  Users, 
  Music,
  ChevronLeft,
  TrendingUp,
  Trophy,
  Library,
  Mic,
  Clock
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

// Mock notification data - in real app, this would come from context/state
const getNotificationCount = (url: string) => {
  if (url === "/social") {
    // 3 friend requests + 2 unread messages = 5 total
    return 5;
  }
  return 0;
};

const getTotalNotifications = () => {
  return 5; // Total unread notifications across all sections
};

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "My Library", url: "/playlists", icon: Library },
  { title: "Listening History", url: "/listening-history", icon: Clock },
  { title: "Trending", url: "/trending", icon: TrendingUp },
  { title: "Top 100", url: "/top100", icon: Trophy },
  { title: "Playlist", url: "/playlist", icon: ListMusic },
  { title: "Music Recognition", url: "/music-recognition", icon: Mic },
  { title: "Quiz", url: "/quiz", icon: Brain },
  { title: "Social", url: "/social", icon: Users },
];

export function AppSidebar() {
  const { openMobile, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";
  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="none"
      className="w-64 fixed left-0 top-0 h-screen border-r"
    >
      <SidebarHeader className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Music className="h-8 w-8 text-primary flex-shrink-0" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoVerse
            </span>
          </div>
          
          {/* Mobile close button - only show on mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenMobile(false)}
              className="lg:hidden h-6 w-6"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-background/95 backdrop-blur-sm">
        <SidebarGroup>
          <SidebarGroupContent> 
            <SidebarMenu className="px-3 space-y-1">
              {menuItems.map((item) => {
                const notificationCount = getNotificationCount(item.url);
                const itemIsActive = isActive(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={itemIsActive}
                      tooltip={item.title}
                    >
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative
                          ${getNavCls({ isActive })}
                        `}
                        onClick={() => {
                          // Close mobile sidebar when navigating
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">
                          {item.title}
                        </span>
                        
                        {/* Notification badge */}
                        {notificationCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto h-5 min-w-5 text-xs"
                          >
                            {notificationCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}