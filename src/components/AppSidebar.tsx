import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Compass, 
  ListMusic, 
  Users, 
  Music,
  ChevronLeft,
  Trophy,
  Library,
  Mic
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
// Removed Friend Requests polling; requests are handled within Social panel

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "Music Recognition", url: "/music-recognition", icon: Mic },
  { title: "My Library", url: "/playlists", icon: Library },
  { title: "Trending", url: "/top100", icon: Trophy },
  { title: "Social", url: "/social", icon: Users },
];

export function AppSidebar() {
  const { openMobile, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-to-r from-primary/20 via-primary/15 to-transparent text-primary font-bold border-l-4 border-primary shadow-lg shadow-primary/20" 
      : "hover:bg-muted/50 border-l-4 border-transparent";

  // No per-item notifications in sidebar; Social panel handles requests
  const getNotificationCount = (_url: string) => 0;

  // Không hiển thị section user info nào ở sidebar nữa, chỉ giữ lại SidebarMenu/menuItems nav

  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="none"
      className="w-64 fixed left-0 top-0 h-screen border-r"
    >
      <SidebarHeader className="p-6 border-b border-border/40 flex flex-col items-center justify-center">
        <div className="flex items-center justify-between w-full">
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
        {/* Xoá toàn bộ state sidebarAvatar, sidebarName, UI/avatar... và đoạn JSX avatar/user */}
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
                        end={item.url === "/"}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 relative
                          ${getNavCls({ isActive })}
                          ${isActive ? "scale-[1.03] translate-x-1" : ""}
                          ${isActive ? "ring-2 ring-primary/30" : ""}
                        `}
                        onClick={() => {
                          // Close mobile sidebar when navigating
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${itemIsActive ? "scale-125 text-primary drop-shadow-lg" : ""}`} />
                        <span className={`font-medium transition-all duration-300 ${itemIsActive ? "drop-shadow-sm" : ""}`}>
                          {item.title}
                        </span>
                        {/* Active indicator - gradient border */}
                        {itemIsActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary to-primary/50 rounded-r-full" />
                        )}
                        
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
