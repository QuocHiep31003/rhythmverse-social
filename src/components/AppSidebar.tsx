import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Compass, 
  ListMusic, 
  Brain, 
  Users, 
  Music,
  Menu,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  { title: "Playlist", url: "/playlist", icon: ListMusic },
  { title: "Quiz", url: "/quiz", icon: Brain },
  { title: "Social", url: "/social", icon: Users },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-background/95 backdrop-blur-sm border-r border-border/40">
        {/* Logo and Toggle */}
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="h-8 w-8 text-primary flex-shrink-0" />
              {!collapsed && (
                <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  EchoVerse
                </span>
              )}
            </div>
            
            {/* Desktop toggle button */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-6 w-6 hover:bg-muted/50"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 space-y-1">
              {menuItems.map((item) => {
                const notificationCount = getNotificationCount(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                          ${getNavCls({ isActive })}
                        `}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!collapsed && <span className="font-medium">{item.title}</span>}
                        </div>
                        {notificationCount > 0 && !collapsed && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 text-xs">
                            {notificationCount}
                          </Badge>
                        )}
                        {notificationCount > 0 && collapsed && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
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