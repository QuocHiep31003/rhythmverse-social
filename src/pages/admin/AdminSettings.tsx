import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const AdminSettings = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground">Quản lý cấu hình và tùy chọn hệ thống</p>
      </div>

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

      <div className="flex justify-end gap-4">
        <Button variant="outline">Hủy</Button>
        <Button>Lưu thay đổi</Button>
      </div>
    </div>
  );
};

export default AdminSettings;