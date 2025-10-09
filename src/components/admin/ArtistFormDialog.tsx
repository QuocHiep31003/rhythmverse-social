import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

const artistFormSchema = z.object({
  name: z.string().min(1, "Tên nghệ sĩ không được để trống").max(200),
  country: z.string().min(1, "Quốc gia không được để trống").max(100),
  debutYear: z.coerce.number().min(1900, "Năm debut không hợp lệ").max(new Date().getFullYear()),
  description: z.string().max(1000).optional().or(z.literal("")),
  avatar: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
});

type ArtistFormValues = z.infer<typeof artistFormSchema>;

interface ArtistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ArtistFormValues) => void;
  defaultValues?: Partial<ArtistFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const ArtistFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
}: ArtistFormDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const form = useForm<ArtistFormValues>({
    resolver: zodResolver(artistFormSchema),
    defaultValues: {
      name: "",
      country: "",
      debutYear: new Date().getFullYear(),
      description: "",
      avatar: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset(defaultValues);
      setPreviewUrl(defaultValues.avatar || "");
    } else if (open) {
      form.reset({
        name: "",
        country: "",
        debutYear: new Date().getFullYear(),
        description: "",
        avatar: "",
      });
      setPreviewUrl("");
    }
  }, [open, defaultValues, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 5MB");
      return;
    }

    setUploading(true);
  const cloudName = "dhylbhwvb";
  const uploadPreset = "EchoVerse";
try {
  setUploading(true);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (data.secure_url) {
    setPreviewUrl(data.secure_url);
    form.setValue("avatar", data.secure_url);
    toast.success("Upload ảnh thành công!");
  } else {
    toast.error("Không lấy được URL từ Cloudinary");
  }

} catch (error) {
  toast.error("Lỗi khi upload ảnh");
  console.error(error);
} finally {
  setUploading(false);
}}

  const handleRemoveImage = () => {
    setPreviewUrl("");
    form.setValue("avatar", "");
  };

  const handleSubmit = (data: ArtistFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm nghệ sĩ mới" : "Chỉnh sửa nghệ sĩ"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập thông tin để tạo nghệ sĩ mới"
              : "Cập nhật thông tin nghệ sĩ"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Avatar Upload */}
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ảnh đại diện</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-4">
                      {previewUrl ? (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload ảnh</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>
                      )}
                      <p className="text-xs text-muted-foreground">
                        * Cloudinary sẽ được cấu hình sau. Hiện tại đang dùng demo mode.
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên nghệ sĩ *</FormLabel>
                  <FormControl>
                    <Input placeholder="Tên nghệ sĩ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quốc gia *</FormLabel>
                  <FormControl>
                    <Input placeholder="Việt Nam, United States..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debutYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Năm debut *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2020" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Giới thiệu về nghệ sĩ..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || uploading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading || uploading}>
                {isLoading ? "Đang lưu..." : uploading ? "Đang upload..." : mode === "create" ? "Tạo" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};