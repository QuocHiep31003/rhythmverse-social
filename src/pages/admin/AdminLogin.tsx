import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Music } from "lucide-react";
import { authApi } from "@/services/api"; // ✅ Import API
import { useEffect } from "react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Nếu đã đăng nhập admin rồi, vào trang login thì redirect luôn
    const token = localStorage.getItem("adminToken");
    if (token) {
      navigate("/admin/home", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Gọi API login admin thật
      const response = await authApi.loginAdmin({
        email,
        password,
      });

      // Kiểm tra response
      if (!response.token) {
        throw new Error("Không nhận được token từ server");
      }

      // Lưu token và auth flag (phục vụ AdminLayout kiểm tra)
      localStorage.setItem("adminToken", response.token);
      localStorage.setItem("adminEmail", response.email);
      localStorage.setItem("adminRole", response.role);
      localStorage.setItem("adminAuth", "true");

      toast.success("Đăng nhập thành công!");
      navigate("/admin/home");
    } catch (error: any) {
      toast.error(error.message || "Email hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/10">
      <Card className="w-full max-w-md rounded-xl shadow-2xl border border-border/40">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-admin flex items-center justify-center shadow-md">
              <Music className="w-9 h-9 text-primary drop-shadow-glow" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">Admin Panel</CardTitle>
            <CardDescription className="text-base text-muted-foreground">Đăng nhập để quản lý hệ thống</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="rounded-lg text-base px-4 py-3"
                placeholder="admin@echoverse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="rounded-lg text-base px-4 py-3"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-lg text-base font-semibold py-3" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
