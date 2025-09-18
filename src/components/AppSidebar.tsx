import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Compass, 
  ListMusic, 
  Brain, 
  Users, 
  Music,
  ChevronLeft,
  PanelLeft
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
  const { state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <div
      className="group/sidebar-hover min-w-[80px]"
      onMouseEnter={() => !isMobile && setOpen(true)}
      onMouseLeave={() => !isMobile && setOpen(false)}
    >
      <Sidebar 
        variant="sidebar" 
        collapsible="icon"
        style={{
          "--sidebar-width": "16rem", // 64 -> w-64 = 256px = 16rem
          "--sidebar-width-icon": "5rem", // 20 -> w-20 = 80px = 5rem
        } as React.CSSProperties}
      >
      <SidebarHeader className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Music className="h-8 w-8 text-primary flex-shrink-0" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
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

      {/* Desktop toggle button - hidden when expanded, shows on hover when collapsed */}
      {/* <div className="hidden group-data-[collapsible=icon]:block px-3 py-2">
        <SidebarTrigger className="h-8 w-8 opacity-0 group-hover/sidebar-hover:opacity-100 transition-opacity duration-200" />
      </div> */}

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
                        <span className="font-medium group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                        
                        {/* Desktop notification badge */}
                        {notificationCount > 0 && (
                          <>
                            <Badge 
                              variant="destructive" 
                              className="ml-auto h-5 min-w-5 text-xs group-data-[collapsible=icon]:hidden"
                            >
                              {notificationCount}
                            </Badge>
                            {/* Icon mode notification dot */}
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full group-data-[collapsible=icon]:block hidden" />
                          </>
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
    </div>
  );
}