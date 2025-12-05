import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Home, Users, ListMusic, Settings, LogOut, Menu, Disc3, Heart, Tag, TrendingUp, Package, Crown, ChevronDown, FolderTree, BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { stopTokenRefreshInterval, clearTokens } from "@/services/api/config";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [premiumMenuOpen, setPremiumMenuOpen] = useState(false);
  const [contentMenuOpen, setContentMenuOpen] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);

  useEffect(() => {
    // Clear token user nếu có (không cho phép 2 token cùng lúc)
    const userToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (userToken && location.pathname !== "/admin/login") {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    }

    const isAuthenticated = localStorage.getItem("adminAuth");
    if (!isAuthenticated && location.pathname !== "/admin/login") {
      navigate("/admin/login");
    }
  }, [navigate, location]);

  const handleLogout = () => {
    // Stop token refresh interval
    stopTokenRefreshInterval();
    clearTokens();
    
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRole");
    localStorage.removeItem("adminEmail");
    toast.success("Logged out");
    navigate("/admin/login");
  };


  const menuItems = [
    { 
      icon: BarChart3, 
      label: "Dashboard & Analytics", 
      path: null, 
      menuKey: "dashboard",
      children: [
        { label: "Dashboard", path: "/admin/home" },
        { label: "Trending", path: "/admin/trending" },
      ]
    },
    { 
      icon: FolderTree, 
      label: "Content Management", 
      path: null, 
      menuKey: "content",
      children: [
        { label: "Songs", path: "/admin/songs" },
        { label: "Artists", path: "/admin/artists" },
        { label: "Genres", path: "/admin/genres" },
        { label: "Moods", path: "/admin/moods" },
        { label: "Albums", path: "/admin/albums" },
        { label: "Playlists", path: "/admin/playlists" },
        { label: "System Playlists", path: "/admin/system-playlists" },
        { label: "Banners", path: "/admin/banners" },
      ]
    },
    { 
      icon: Crown, 
      label: "Premium", 
      path: null, 
      menuKey: "premium",
      children: [
        { label: "Premium Dashboard", path: "/admin/premium-dashboard" },
        { label: "Subscription Plans", path: "/admin/subscription-plans" },
        { label: "Subscriptions Management", path: "/admin/subscriptions-management" },
      ]
    },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  // Check if current path is in any submenu and open the parent menu
  useEffect(() => {
    // Chỉ chạy khi không phải trang login
    if (location.pathname === "/admin/login") {
      return;
    }
    const isPremiumPath = location.pathname === "/admin/premium-dashboard" || 
                          location.pathname === "/admin/subscription-plans" ||
                          location.pathname === "/admin/subscriptions-management";
    if (isPremiumPath) {
      setPremiumMenuOpen(true);
    }

    const isContentPath = location.pathname === "/admin/songs" ||
                          location.pathname === "/admin/artists" ||
                          location.pathname === "/admin/genres" ||
                          location.pathname === "/admin/moods" ||
                          location.pathname === "/admin/albums" ||
                          location.pathname === "/admin/playlists" ||
                          location.pathname === "/admin/banners";
    if (isContentPath) {
      setContentMenuOpen(true);
    }

    const isDashboardPath = location.pathname === "/admin/home" ||
                             location.pathname === "/admin/trending";
    if (isDashboardPath) {
      setDashboardMenuOpen(true);
    }
  }, [location.pathname]);

  // Early return sau khi tất cả hooks đã được gọi
  if (location.pathname === "/admin/login") {
    return <>{children}</>;
  }

  const Sidebar = () => (






    <div className="flex flex-col h-full bg-[hsl(var(--admin-sidebar))] border-r border-[hsl(var(--admin-border))]">
      <div className="p-6 border-b border-[hsl(var(--admin-border))]">

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-admin flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Echoverse</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>


      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          
          // Menu có children (dropdown)
          if (item.children) {
            const isOpen = item.menuKey === "premium" ? premiumMenuOpen :
                          item.menuKey === "content" ? contentMenuOpen :
                          item.menuKey === "dashboard" ? dashboardMenuOpen : false;
            
            const toggleMenu = () => {
              if (item.menuKey === "premium") {
                setPremiumMenuOpen(!premiumMenuOpen);
              } else if (item.menuKey === "content") {
                setContentMenuOpen(!contentMenuOpen);
              } else if (item.menuKey === "dashboard") {
                setDashboardMenuOpen(!dashboardMenuOpen);
              }
            };

            return (
              <div key={item.label} className="space-y-1">
                <div
                  onClick={toggleMenu}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-[hsl(var(--admin-hover))]"
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </div>
                  <ChevronDown className={`w-4 h-4 ${isOpen ? "" : "rotate-[-90deg]"}`} />
                </div>
                {isOpen && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => {
                      const isActive = location.pathname === child.path;
                      return (
                        <Link key={child.path} to={child.path}>
                          <div
                            className={`w-full px-3 py-2 rounded-md text-sm cursor-pointer ${
                              isActive
                                ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold"
                                : "hover:bg-[hsl(var(--admin-hover))]"
                            }`}
                          >
                            {child.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          // Menu thường
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path!}>
              <Button
                variant="ghost"
                className={`w-full justify-start transition-all duration-200 ${isActive
                  ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold hover:bg-[hsl(var(--admin-hover))] dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]"
                  : "hover:bg-[hsl(var(--admin-hover))] dark:hover:bg-transparent dark:hover:text-[hsl(var(--admin-hover-text))]"
                  }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>





      <div className="p-4 border-t border-[hsl(var(--admin-border))]">

        <Button
          variant="ghost"
          className="w-full justify-start transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );


  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--admin-sidebar))] border-b border-[hsl(var(--admin-border))]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-admin flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold">Admin Panel</h2>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-[hsl(var(--admin-sidebar))]">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}







      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="pt-16 md:pt-0 p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;