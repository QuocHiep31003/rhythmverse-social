import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const { theme, setTheme } = useTheme();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const adminToken = localStorage.getItem("adminAuth") || "mock-admin-token";
      
      const res = await fetch('http://localhost:8080/api/trending/test/recalculate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Trending scores recalculated successfully!");
      } else {
        toast.error(data.message || "Failed to recalculate trending scores");
      }
    } catch (error) {
      console.error("Error recalculating trending:", error);
      toast.error("Failed to recalculate trending scores");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground">Quản lý cấu hình và tùy chọn hệ thống</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Giao diện</CardTitle>
          <CardDescription>Tùy chỉnh giao diện hiển thị</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Chế độ hiển thị</Label>
              <p className="text-sm text-muted-foreground">
                Chọn giữa chế độ sáng và tối
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="gap-2"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4" />
                  Chế độ sáng
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  Chế độ tối
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cài đặt chung</CardTitle>
          <CardDescription>Cấu hình chung cho hệ thống</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site-name">Tên website</Label>
            <Input id="site-name" defaultValue="Echoverse" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">Mô tả</Label>
            <Input id="site-description" defaultValue="Nền tảng âm nhạc trực tuyến" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cho phép đăng ký mới</Label>
              <p className="text-sm text-muted-foreground">
                Cho phép người dùng mới đăng ký tài khoản
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Cài đặt cho việc tải lên file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="max-file-size">Kích thước file tối đa (MB)</Label>
            <Input id="max-file-size" type="number" defaultValue="50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowed-formats">Định dạng cho phép</Label>
            <Input id="allowed-formats" defaultValue="mp3, wav, flac" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảo mật</CardTitle>
          <CardDescription>Cài đặt bảo mật hệ thống</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Xác thực 2 lớp</Label>
              <p className="text-sm text-muted-foreground">
                Bắt buộc xác thực 2 lớp cho admin
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Giới hạn đăng nhập</Label>
              <p className="text-sm text-muted-foreground">
                Khóa tài khoản sau 5 lần đăng nhập sai
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trending</CardTitle>
          <CardDescription>Quản lý tính toán điểm trending</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tính lại Trending</Label>
              <p className="text-sm text-muted-foreground">
                Tính lại điểm trending cho tất cả bài hát dựa trên dữ liệu mới nhất
              </p>
            </div>
            <Button 
              onClick={handleRecalculate}
              disabled={isRecalculating}
              variant="outline"
              className="gap-2"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tính...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Tính lại
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Hủy</Button>
        <Button>Lưu thay đổi</Button>
      </div>
    </div>
  );
};

export default AdminSettings;