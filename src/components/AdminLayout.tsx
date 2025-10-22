import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Home, Users, ListMusic, Settings, LogOut, Menu, Disc3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

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
                className={`w-full justify-start transition-all duration-200 ${
                  isActive 
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