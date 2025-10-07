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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock, Globe, Upload, Image } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const playlistFormSchema = z.object({
  name: z.string().min(1, "Tên playlist không được để trống").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
  songLimit: z.number().min(1).max(1000).default(500),
  coverImage: z.string().optional().or(z.literal("")),
});

export type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

interface PlaylistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlaylistFormValues) => void;
  defaultValues?: Partial<PlaylistFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const PlaylistFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
}: PlaylistFormDialogProps) => {
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: true,
      songLimit: 500,
      coverImage: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset(defaultValues);
      if (defaultValues.coverImage) {
        setCoverPreview(defaultValues.coverImage);
      }
    } else if (open) {
      form.reset({
        name: "",
        description: "",
        isPublic: true,
        songLimit: 500,
        coverImage: "",
      });
      setCoverPreview("");
      setCoverFile(null);
    }
  }, [open, defaultValues, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        form.setError("coverImage", {
          type: "manual",
          message: "File ảnh không được vượt quá 5MB",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        form.setError("coverImage", {
          type: "manual",
          message: "File phải là định dạng ảnh",
        });
        return;
      }

      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCoverPreview(result);
        form.setValue("coverImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: PlaylistFormValues) => {
    onSubmit(data);
  };

  const isPublic = form.watch("isPublic");
  const songLimit = form.watch("songLimit");
  const name = form.watch("name");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === "create" ? "Tạo playlist mới" : "Chỉnh sửa playlist"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {mode === "create"
              ? "Nhập thông tin để tạo playlist mới"
              : "Cập nhật thông tin playlist"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col max-h-[calc(100vh-200px)]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Cover Image Upload */}
                <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Ảnh bìa</FormLabel>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                      {coverPreview ? (
                        <img 
                          src={coverPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Image className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                          <p className="text-xs text-gray-400">Upload ảnh</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="bg-background/50 border-border text-white"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-400 mt-1">
                        Đề xuất: 1000x1000px, tối đa 5MB (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Tên playlist *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Tên playlist" 
                      {...field} 
                      className="bg-background/50 border-border text-white"
                    />
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
                  <FormLabel className="text-white">Mô tả (không bắt buộc)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả playlist..."
                      className="resize-none bg-background/50 border-border text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Privacy Settings */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Chế độ công khai</FormLabel>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      {field.value ? (
                        <Globe className="w-5 h-5 text-green-500" />
                      ) : (
                        <Lock className="w-5 h-5 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium text-white">{field.value ? "Công khai" : "Riêng tư"}</p>
                        <p className="text-sm text-gray-400">
                          {field.value
                            ? "Mọi người có thể tìm kiếm và xem playlist này"
                            : "Chỉ bạn có thể xem playlist này"}
                        </p>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Song Limit */}
            <FormField
              control={form.control}
              name="songLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Giới hạn bài hát</FormLabel>
                  <div className="flex items-center gap-4">
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        className="w-32 bg-background/50 border-border text-white"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 500)}
                      />
                    </FormControl>
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                      {songLimit} bài hát tối đa
                    </Badge>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            {name && (
              <div className="space-y-2 pt-4 border-t border-border">
                <FormLabel className="text-white">Xem trước</FormLabel>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      {coverPreview ? (
                        <AvatarImage src={coverPreview} alt={name} />
                      ) : (
                        <AvatarFallback className="bg-primary/20 text-white">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg text-white">{name}</h3>
                      {form.watch("description") && (
                        <p className="text-sm text-gray-400 mt-1">
                          {form.watch("description")}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={isPublic ? "default" : "secondary"}>
                          {isPublic ? "Công khai" : "Riêng tư"}
                        </Badge>
                        <Badge variant="outline" className="text-gray-400 border-gray-600">
                          0/{songLimit} bài hát
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Đang lưu..." : mode === "create" ? "Tạo playlist" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};