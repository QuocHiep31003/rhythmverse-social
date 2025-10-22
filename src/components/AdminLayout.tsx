import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Home, Users, ListMusic, Settings, LogOut, Menu, Disc3, Sun, Moon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuth");
    if (!isAuthenticated && location.pathname !== "/admin/login") {
      navigate("/admin/login");
    }
  }, [navigate, location]);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    toast.success("Đã đăng xuất");
    navigate("/admin/login");
  };

  if (location.pathname === "/admin/login") {
    return <>{children}</>;
  }

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/admin/home" },
    { icon: Music, label: "Bài hát", path: "/admin/songs" },
    { icon: Disc3, label: "Albums", path: "/admin/albums" },
    { icon: ListMusic, label: "Playlists", path: "/admin/playlists" },
    { icon: Users, label: "Nghệ sĩ", path: "/admin/artists" },
    { icon: Music, label: "Thể loại", path: "/admin/genres" },
    { icon: Users, label: "Người dùng", path: "/admin/users" },
    { icon: Settings, label: "Cài đặt", path: "/admin/settings" },
  ];

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
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start transition-all ${
                  isActive 
                    ? "bg-gradient-admin text-white hover:opacity-90" 
                    : "hover:bg-[hsl(var(--admin-card))]"
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[hsl(var(--admin-border))] space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-[hsl(var(--admin-card))]"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 mr-3" />
          ) : (
            <Moon className="w-4 h-4 mr-3" />
          )}
          {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Đăng xuất
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
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
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