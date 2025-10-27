import { useEffect } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Home, Users, ListMusic, Settings, LogOut, Menu, Disc3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

/**
 * Admin layout with sidebar navigation, mobile sheet menu,
 * and authentication check via JWT token in localStorage.
 */
const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Kiểm tra token admin
  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    // Nếu chưa đăng nhập và không phải trang login → redirect về login
    if (!token && location.pathname !== "/admin/login") {
      navigate("/admin/login");
    }
  }, [navigate, location]);

  // ✅ Xử lý logout
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminRole");
    toast.success("Đã đăng xuất");
    navigate("/admin/login");
  };

  // Nếu đang ở trang login, không hiển thị layout
  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

  // ✅ Menu sidebar
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
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Echoverse</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );

  // ✅ Layout hiển thị chính
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            <h2 className="font-bold">Admin Panel</h2>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="pt-16 md:pt-0 p-6 md:p-8">
          <Outlet /> {/* ✅ Render route con tại đây */}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
