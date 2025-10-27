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
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { uploadImage } from "@/config/cloudinary";

const moodFormSchema = z.object({
  name: z.string().min(1, "Tên mood không được để trống").max(100),
  iconUrl: z.string().optional(),
});

type MoodFormValues = z.infer<typeof moodFormSchema>;

interface MoodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MoodFormValues) => void;
  defaultValues?: Partial<MoodFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const MoodFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
}: MoodFormDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const form = useForm<MoodFormValues>({
    resolver: zodResolver(moodFormSchema),
    defaultValues: {
      name: "",
      iconUrl: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset(defaultValues);
      setPreviewUrl(defaultValues.iconUrl || "");
    } else if (open) {
      form.reset({
        name: "",
        iconUrl: "",
      });
      setPreviewUrl("");
    }
  }, [open, defaultValues, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setPreviewUrl(result.secure_url);
      form.setValue("iconUrl", result.secure_url);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl("");
    form.setValue("iconUrl", "");
  };

  const handleSubmit = (data: MoodFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Thêm Mood mới" : "Chỉnh sửa Mood"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập tên mood nhạc mới"
              : "Cập nhật tên mood"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên mood *</FormLabel>
                  <FormControl>
                    <Input placeholder="Happy, Sad, Relaxed..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Icon Upload */}
            <FormField
              control={form.control}
              name="iconUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
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
                          <span className="text-xs text-muted-foreground">Upload icon</span>
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
                        * Khuyến nghị 512x512px, tối đa 5MB (JPG, PNG, WebP)
                      </p>
                    </div>
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

