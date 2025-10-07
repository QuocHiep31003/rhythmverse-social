import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Check, ChevronsUpDown } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, debounce } from "@/lib/utils";
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
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  const [artistSearchResults, setArtistSearchResults] = useState<any[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);

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

  const searchArtists = useCallback(async (query: string) => {
    if (!query.trim()) {
      setArtistSearchResults([]);
      return;
    }
    
    try {
      setIsSearchingArtists(true);
      const data = await artistsApi.getAll({
        page: 0,
        size: 20,
        sort: "name,asc",
        search: query
      });
      const results = Array.isArray(data) ? data : data.content || [];
      setArtistSearchResults(results);
    } catch (error) {
      console.error("Error searching artists:", error);
      setArtistSearchResults([]);
    } finally {
      setIsSearchingArtists(false);
    }
  }, []);

  const debouncedSearchArtists = useCallback(
    debounce((query: string) => {
      searchArtists(query);
    }, 2000),
    [searchArtists]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const genresData = await genresApi.getAll();
        setGenres(Array.isArray(genresData) ? genresData : genresData.content || []);
      } catch (error) {
        console.error("Error loading genres:", error);
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nghệ sĩ * (chọn ít nhất 1)</FormLabel>
                  <Popover open={artistPopoverOpen} onOpenChange={setArtistPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          {field.value?.length
                            ? `Đã chọn ${field.value.length} nghệ sĩ`
                            : "Tìm kiếm và chọn nghệ sĩ..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Tìm kiếm nghệ sĩ..."
                          value={artistSearchQuery}
                          onValueChange={(value) => {
                            setArtistSearchQuery(value);
                            if (value) {
                              debouncedSearchArtists(value);
                            } else {
                              setArtistSearchResults([]);
                            }
                          }}
                        />
                        <CommandEmpty>
                          {isSearchingArtists ? "Đang tìm kiếm..." : "Không tìm thấy nghệ sĩ"}
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {artistSearchResults.map((artist) => (
                            <CommandItem
                              key={artist.id}
                              value={artist.id.toString()}
                              onSelect={() => {
                                const isSelected = field.value?.includes(artist.id);
                                if (isSelected) {
                                  field.onChange(
                                    field.value?.filter((id: number) => id !== artist.id)
                                  );
                                } else {
                                  field.onChange([...(field.value || []), artist.id]);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={artist.avatar} alt={artist.name} />
                                  <AvatarFallback>{artist.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">{artist.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ID: {artist.id} • {artist.country || "N/A"}
                                  </span>
                                </div>
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  field.value?.includes(artist.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {field.value?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((artistId: number) => {
                        const artist = artistSearchResults.find((a) => a.id === artistId);
                        if (!artist) return null;
                        return (
                          <div
                            key={artistId}
                            className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                          >
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={artist.avatar} alt={artist.name} />
                              <AvatarFallback className="text-xs">{artist.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{artist.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter((id: number) => id !== artistId)
                                );
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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