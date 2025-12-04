import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { reportApi, ReportType } from "@/services/api/reportApi";
import { toast } from "@/hooks/use-toast";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ReportType;
  typeId: number | string;
  typeName?: string;
}

export const ReportDialog = ({
  open,
  onOpenChange,
  type,
  typeId,
  typeName,
}: ReportDialogProps) => {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập mô tả về báo cáo",
        variant: "destructive",
      });
      return;
    }

    if (description.trim().length < 10) {
      toast({
        title: "Lỗi",
        description: "Mô tả phải có ít nhất 10 ký tự",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Validate và convert typeId sang number
      let numericTypeId: number;
      if (typeof typeId === 'number') {
        numericTypeId = typeId;
      } else if (typeof typeId === 'string') {
        const parsed = Number(typeId);
        if (isNaN(parsed) || !isFinite(parsed)) {
          toast({
            title: "Lỗi",
            description: "ID không hợp lệ. Vui lòng thử lại sau.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        numericTypeId = parsed;
      } else {
        toast({
          title: "Lỗi",
          description: "ID không hợp lệ. Vui lòng thử lại sau.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      
      // Validate typeId phải là số nguyên dương
      if (!Number.isInteger(numericTypeId) || numericTypeId <= 0) {
        toast({
          title: "Lỗi",
          description: "ID phải là số nguyên dương hợp lệ.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Log dữ liệu trước khi gửi để debug
      const reportData = {
        type,
        typeId: numericTypeId,
        description: description.trim(),
      };
      console.log('[ReportDialog] Submitting report:', reportData);
      
      await reportApi.create(reportData);

      toast({
        title: "Thành công",
        description: "Báo cáo của bạn đã được gửi. Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.",
      });

      // Reset form và đóng dialog
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể gửi báo cáo. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setDescription("");
      onOpenChange(false);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case ReportType.SONG:
        return "bài hát";
      case ReportType.ARTIST:
        return "nghệ sĩ";
      case ReportType.ALBUM:
        return "album";
      case ReportType.PLAYLIST:
        return "playlist";
      default:
        return "nội dung";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Báo cáo {getTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            {typeName && (
              <span className="font-medium text-foreground">{typeName}</span>
            )}
            <br />
            Vui lòng mô tả chi tiết vấn đề bạn gặp phải. Báo cáo của bạn sẽ được xem xét bởi đội ngũ quản trị viên.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">
              Mô tả <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Ví dụ: Nội dung không phù hợp, vi phạm bản quyền, thông tin sai lệch..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
              disabled={submitting}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/2000 ký tự (tối thiểu 10 ký tự)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim() || description.trim().length < 10}
          >
            {submitting ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

