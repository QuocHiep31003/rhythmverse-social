import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { genresApi, artistsApi } from "@/services/api";

const songFormSchema = z.object({
  name: z.string().min(1, "Tên bài hát không được để trống").max(200),
  releaseYear: z.coerce.number().min(1900, "Năm phát hành không hợp lệ").max(new Date().getFullYear() + 1),
  genre: z.string().min(1, "Vui lòng chọn thể loại"),
  artistIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 nghệ sĩ"),
  album: z.string().max(200).optional().or(z.literal("")),
  duration: z.coerce.number().min(1, "Thời lượng phải lớn hơn 0"),
  cover: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  audio: z.string().url("URL audio không hợp lệ"),
  avatar: z.string().optional(),
});

type SongFormValues = z.infer<typeof songFormSchema>;

interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SongFormValues) => void;
  defaultValues?: Partial<SongFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const SongFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
}: SongFormDialogProps) => {
  const [genres, setGenres] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      name: "",
      releaseYear: new Date().getFullYear(),
      genre: "",
      artistIds: [],
      album: "",
      duration: 180,
      cover: "",
      audio: "",
      avatar: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [genresData, artistsData] = await Promise.all([
          genresApi.getAll(),
          artistsApi.getAll(),
        ]);
        setGenres(Array.isArray(genresData) ? genresData : genresData.content || []);
        setArtists(Array.isArray(artistsData) ? artistsData : artistsData.content || []);
      } catch (error) {
        console.error("Error loading genres/artists:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (open && defaultValues) {
      form.reset(defaultValues);
      setPreviewUrl(defaultValues.avatar || "");
    } else if (open) {
      form.reset({
        name: "",
        releaseYear: new Date().getFullYear(),
        genre: "",
        artistIds: [],
        album: "",
        duration: 180,
        cover: "",
        audio: "",
        avatar: "",
      });
      setPreviewUrl("");
    }
  }, [open, defaultValues, form]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 5MB");
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/doa8bsmwv/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      form.setValue('avatar', data.secure_url);
      setPreviewUrl(data.secure_url);
      toast.success("Tải ảnh lên thành công");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    form.setValue('avatar', '');
    setPreviewUrl('');
  };

  const handleSubmit = (data: SongFormValues) => {
    onSubmit(data);
  };

  const selectedArtistIds = form.watch("artistIds") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm bài hát mới" : "Chỉnh sửa bài hát"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập thông tin để tạo bài hát mới"
              : "Cập nhật thông tin bài hát"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên bài hát *</FormLabel>
                  <FormControl>
                    <Input placeholder="Tên bài hát" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Năm phát hành *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thể loại *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thể loại" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genres.map((genre) => (
                        <SelectItem key={genre.id} value={genre.name}>
                          {genre.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="artistIds"
              render={() => (
                <FormItem>
                  <FormLabel>Nghệ sĩ * (chọn ít nhất 1)</FormLabel>
                  <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
                    {artists.map((artist) => (
                      <FormField
                        key={artist.id}
                        control={form.control}
                        name="artistIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={artist.id}
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(artist.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, artist.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== artist.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {artist.name} ({artist.country})
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Đã chọn: {selectedArtistIds.length} nghệ sĩ
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ảnh bài hát</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {previewUrl ? (
                        <div className="relative w-32 h-32">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2"
                            onClick={handleRemoveImage}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                          {uploading && <span className="text-sm text-muted-foreground">Đang tải...</span>}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="album"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Album (không bắt buộc)</FormLabel>
                  <FormControl>
                    <Input placeholder="Tên album" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thời lượng (giây) *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="180" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover URL (không bắt buộc)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/cover.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio URL *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/audio.mp3"
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
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Đang lưu..." : mode === "create" ? "Tạo" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};