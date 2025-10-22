import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { genresApi, artistsApi } from "@/services/api";

const songFormSchema = z.object({
  name: z.string().min(1, "Tên bài hát không được để trống").max(200),
  releaseYear: z.coerce.number().min(1900, "Năm phát hành không hợp lệ").max(new Date().getFullYear() + 1),
  genreIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 thể loại"),
  artistIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 nghệ sĩ"),
  audioUrl: z.string().optional(),
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
  const [allGenres, setAllGenres] = useState<any[]>([]);
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  const [genreSearchQuery, setGenreSearchQuery] = useState("");
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [genrePopoverOpen, setGenrePopoverOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioInputMode, setAudioInputMode] = useState<"upload" | "url">("upload");

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      name: "",
      releaseYear: new Date().getFullYear(),
      genreIds: [],
      artistIds: [],
      audioUrl: "",
      ...defaultValues,
    },
  });

  // Filter local data thay vì call API
  const filteredArtists = artistSearchQuery.trim()
    ? allArtists.filter((artist) =>
        artist.name.toLowerCase().includes(artistSearchQuery.toLowerCase())
      )
    : allArtists;

  const filteredGenres = genreSearchQuery.trim()
    ? allGenres.filter((genre) =>
        genre.name.toLowerCase().includes(genreSearchQuery.toLowerCase())
      )
    : allGenres;

  // Load toàn bộ artists và genres khi component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [artistsData, genresData] = await Promise.all([
          artistsApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
          genresApi.getAll({ page: 0, size: 1000, sort: "name,asc" })
        ]);
        
        setAllArtists(Array.isArray(artistsData) ? artistsData : artistsData.content || []);
        setAllGenres(Array.isArray(genresData) ? genresData : genresData.content || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (open && defaultValues) {
      // Xử lý data từ API: artists và genres là array of objects
      const apiData = defaultValues as any;
      const formValues = {
        ...defaultValues,
        artistIds: apiData.artists?.map((a: any) => a.id) || defaultValues.artistIds || [],
        genreIds: apiData.genres?.map((g: any) => g.id) || defaultValues.genreIds || [],
        audioUrl: apiData.audioUrl || defaultValues.audioUrl || "",
      };
      form.reset(formValues);
    } else if (open) {
      form.reset({
        name: "",
        releaseYear: new Date().getFullYear(),
        genreIds: [],
        artistIds: [],
        audioUrl: "",
      });
    }
  }, [open, defaultValues, form]);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = "dhylbhwvb"; // Cloudinary cloud name
    const uploadPreset = "EchoVerse"; // Unsigned upload preset
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("resource_type", "video"); // audio files use 'video' resource type
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      throw error;
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress (Cloudinary doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      
      const url = await uploadToCloudinary(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      form.setValue("audioUrl", url);
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Lỗi khi upload file. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (data: SongFormValues) => {
    onSubmit(data);
  };

  const selectedArtistIds = form.watch("artistIds") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
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
              name="genreIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thể loại * (chọn ít nhất 1)</FormLabel>
                  <Popover open={genrePopoverOpen} onOpenChange={setGenrePopoverOpen}>
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
                            ? `Đã chọn ${field.value.length} thể loại`
                            : "Tìm kiếm và chọn thể loại..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Tìm kiếm thể loại..."
                          value={genreSearchQuery}
                          onValueChange={setGenreSearchQuery}
                        />
                        <CommandEmpty>
                          Không tìm thấy thể loại
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {filteredGenres.map((genre) => (
                            <CommandItem
                              key={genre.id}
                              value={genre.id.toString()}
                              onSelect={() => {
                                const isSelected = field.value?.includes(genre.id);
                                if (isSelected) {
                                  field.onChange(
                                    field.value?.filter((id: number) => id !== genre.id)
                                  );
                                } else {
                                  field.onChange([...(field.value || []), genre.id]);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-medium">{genre.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {genre.id}
                                </span>
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  field.value?.includes(genre.id)
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
                      {field.value.map((genreId: number) => {
                        const genre = allGenres.find(g => g.id === genreId);
                        return (
                          <div
                            key={genreId}
                            className="flex items-center gap-1 bg-[hsl(var(--admin-hover))] text-[hsl(var(--admin-active-foreground))] px-2 py-1 rounded-md text-sm"
                          >
                            <span>{genre?.name || `ID: ${genreId}`}</span>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter((id: number) => id !== genreId)
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
                          onValueChange={setArtistSearchQuery}
                        />
                        <CommandEmpty>
                          Không tìm thấy nghệ sĩ
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {filteredArtists.map((artist) => (
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
                        const artist = allArtists.find((a) => a.id === artistId);
                        if (!artist) return null;
                        return (
                          <div
                            key={artistId}
                            className="flex items-center gap-1 bg-[hsl(var(--admin-hover))] text-[hsl(var(--admin-active-foreground))] px-2 py-1 rounded-md text-sm"
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
              name="audioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File nhạc * {mode === "edit" && "(Upload file mới hoặc cập nhật URL)"}</FormLabel>
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      variant={audioInputMode === "upload" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioInputMode("upload")}
                      className="flex-1"
                    >
                      Upload File
                    </Button>
                    <Button
                      type="button"
                      variant={audioInputMode === "url" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioInputMode("url")}
                      className="flex-1"
                    >
                      Nhập URL
                    </Button>
                  </div>
                  <FormControl>
                    <div className="space-y-2">
                      {audioInputMode === "upload" ? (
                        <>
                          <Input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              handleFileChange(file);
                            }}
                            disabled={uploading}
                          />
                          {uploading && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">
                                Đang upload... {uploadProgress}%
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                  className="bg-[hsl(var(--admin-active))] h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <Input
                          placeholder="https://example.com/audio.mp3"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                          }}
                        />
                      )}
                      {field.value && !uploading && (
                        <div className="text-sm text-muted-foreground">
                          ✓ Audio URL: {field.value.substring(0, 60)}...
                        </div>
                      )}
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