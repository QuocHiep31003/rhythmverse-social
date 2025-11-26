import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { listeningHistoryApi, ListeningHistoryDTO, ListeningHistoryImportResponse, BehaviorEmbeddingReport } from "@/services/api/listeningHistoryApi";
import { Moon, Sun } from "lucide-react";

const AdminSettings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [bulkInput, setBulkInput] = useState("");
  const [incrementPlayCount, setIncrementPlayCount] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ListeningHistoryImportResponse | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [behaviorSummary, setBehaviorSummary] = useState<BehaviorEmbeddingReport | null>(null);

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
          <CardTitle>Import lượt nghe (beta)</CardTitle>
          <CardDescription>
            Dán danh sách `userId,songId,listenCount?,listenedDuration?` (mỗi dòng một bản ghi). Ví dụ:
            <br />
            <code>12,345,5,180</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="userId,songId,listenCount?,listenedDuration?
42,99,3,120"
            className="min-h-[140px] font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tăng play count trên bài hát</Label>
              <p className="text-sm text-muted-foreground">
                Bật khi muốn cộng thêm lượt nghe vào playCount (sử dụng thận trọng).
              </p>
            </div>
            <Switch checked={incrementPlayCount} onCheckedChange={setIncrementPlayCount} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setBulkInput("")}>
              Xóa nội dung
            </Button>
            <Button
              onClick={async () => {
                if (!bulkInput.trim()) {
                  toast({
                    title: "Thiếu dữ liệu",
                    description: "Vui lòng nhập ít nhất một dòng dữ liệu để import.",
                    variant: "destructive",
                  });
                  return;
                }
                setIsImporting(true);
                try {
                  const histories: ListeningHistoryDTO[] = bulkInput
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const [userIdRaw, songIdRaw, countRaw, durationRaw] = line.split(",").map((p) => p.trim());
                      const userId = Number(userIdRaw);
                      const songId = Number(songIdRaw);
                      if (!Number.isFinite(userId) || !Number.isFinite(songId)) {
                        throw new Error(`Dòng không hợp lệ: ${line}`);
                      }
                      const listenCount = countRaw ? Number(countRaw) : undefined;
                      const listenedDuration = durationRaw ? Number(durationRaw) : undefined;
                      const dto: ListeningHistoryDTO = {
                        userId,
                        songId,
                      };
                      if (listenCount && listenCount > 0) dto.listenCount = listenCount;
                      if (listenedDuration && listenedDuration > 0) dto.listenedDuration = listenedDuration;
                      return dto;
                    });

                  const summary = await listeningHistoryApi.importHistories({
                    histories,
                    incrementPlayCount,
                  });
                  setImportSummary(summary);
                  toast({
                    title: "Import thành công",
                    description: `Đã xử lý ${summary.received} bản ghi (mới ${summary.created}, cập nhật ${summary.updated}, bỏ qua ${summary.skipped}).`,
                  });
                } catch (error: any) {
                  console.error("Import histories failed", error);
                  toast({
                    title: "Import thất bại",
                    description: error?.message || "Không thể import lượt nghe",
                    variant: "destructive",
                  });
                } finally {
                  setIsImporting(false);
                }
              }}
              disabled={isImporting}
            >
              {isImporting ? "Đang import..." : "Import lượt nghe"}
            </Button>
          </div>
          {importSummary && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Nhận: <span className="font-medium text-foreground">{importSummary.received}</span> • Mới:{" "}
                <span className="font-medium text-foreground">{importSummary.created}</span> • Cập nhật:{" "}
                <span className="font-medium text-foreground">{importSummary.updated}</span> • Bỏ qua:{" "}
                <span className="font-medium text-foreground">{importSummary.skipped}</span>
              </p>
              <p>Increment play count: {importSummary.incrementPlayCount ? "Có" : "Không"}</p>
              <p>Xử lý lúc: {new Date(importSummary.processedAt).toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tính lại vector hành vi</CardTitle>
          <CardDescription>
            Gọi trực tiếp BehaviorEmbeddingService (không cần chờ scheduler). Chỉ thực hiện khi đã import dữ liệu mới.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={async () => {
              setIsRecomputing(true);
              try {
                const summary = await listeningHistoryApi.recomputeBehaviorEmbedding();
                setBehaviorSummary(summary);
                toast({
                  title: "Đã tính lại behavior embedding",
                  description: `Cập nhật ${summary.updatedSongs}/${summary.totalSongs} bài hát.`,
                });
              } catch (error: any) {
                console.error("Recompute behavior embedding failed", error);
                toast({
                  title: "Không thể tính lại",
                  description: error?.message || "Vui lòng thử lại sau",
                  variant: "destructive",
                });
              } finally {
                setIsRecomputing(false);
              }
            }}
            disabled={isRecomputing}
          >
            {isRecomputing ? "Đang tính..." : "Chạy lại behavior embedding"}
          </Button>
          {behaviorSummary && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Tổng bài hát: <span className="font-medium text-foreground">{behaviorSummary.totalSongs}</span> • Đã
                cập nhật: <span className="font-medium text-foreground">{behaviorSummary.updatedSongs}</span>
              </p>
              <p>Cutoff: {new Date(behaviorSummary.cutoff).toLocaleString()}</p>
            </div>
          )}
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

      {/* Trending recalculation section removed */}

      <div className="flex justify-end gap-4">
        <Button variant="outline">Hủy</Button>
        <Button>Lưu thay đổi</Button>
      </div>
    </div>
  );
};

export default AdminSettings;