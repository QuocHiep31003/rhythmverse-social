import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Loader2, Upload, Play } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { genresApi, artistsApi, moodsApi } from "@/services/api";

// Utility function to get audio duration from file or URL
const getAudioDuration = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      URL.revokeObjectURL(url);
      resolve(formatted);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve("0:00");
    });
    
    audio.src = url;
  });
};

const songFormSchema = z.object({
  name: z.string().min(1, "Tên bài hát không được để trống").max(200),
  releaseYear: z.coerce.number().min(1900, "Năm phát hành không hợp lệ").max(new Date().getFullYear() + 1),
  genreIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 thể loại"),
  artistIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 nghệ sĩ"),
  moodIds: z.array(z.number()).optional(),
  audioUrl: z.string().optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true; // Optional field
      try {
        new URL(val);
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma'];
        const lowerVal = val.toLowerCase();
        return audioExtensions.some(ext => lowerVal.includes(ext)) || 
               lowerVal.includes('cloudinary.com') || 
               lowerVal.includes('res.cloudinary.com');
      } catch {
        return false;
      }
    }, {
      message: "URL không hợp lệ hoặc không phải file audio. Vui lòng nhập URL có định dạng .mp3, .wav, .m4a hoặc từ Cloudinary"
    }),
  duration: z.string().optional(),
});

type SongFormValues = z.infer<typeof songFormSchema>;

interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SongFormValues & { file?: File }) => void;
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
  const [allGenres, setAllGenres] = useState<{id: number, name: string}[]>([]);
  const [allArtists, setAllArtists] = useState<{id: number, name: string, avatar?: string, country?: string}[]>([]);
  const [allMoods, setAllMoods] = useState<{id: number, name: string}[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  const [genreSearchQuery, setGenreSearchQuery] = useState("");
  const [moodSearchQuery, setMoodSearchQuery] = useState("");
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [genrePopoverOpen, setGenrePopoverOpen] = useState(false);
  const [moodPopoverOpen, setMoodPopoverOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<SongFormValues | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Store selected file for update

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      name: "",
      releaseYear: new Date().getFullYear(),
      genreIds: [],
      artistIds: [],
      moodIds: [],
      audioUrl: "",
      duration: "",
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

  const filteredMoods = moodSearchQuery.trim()
    ? allMoods.filter((mood) =>
        mood.name.toLowerCase().includes(moodSearchQuery.toLowerCase())
      )
    : allMoods;

  // Load toàn bộ artists, genres và moods khi component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [artistsData, genresData, moodsData] = await Promise.all([
          artistsApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
          genresApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
          moodsApi.getAll({ page: 0, size: 1000, sort: "name,asc" })
        ]);
        
        setAllArtists(Array.isArray(artistsData) ? artistsData : artistsData.content || []);
        setAllGenres(Array.isArray(genresData) ? genresData : genresData.content || []);
        setAllMoods(Array.isArray(moodsData) ? moodsData : moodsData.content || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (open && defaultValues) {
      // Xử lý data từ API: artists, genres và moods là array of objects
      const apiData = defaultValues as {artists?: {id: number}[], genres?: {id: number}[], moods?: {id: number}[], audioUrl?: string, duration?: string};
      const formValues = {
        ...defaultValues,
        artistIds: apiData.artists?.map((a: {id: number}) => a.id) || defaultValues.artistIds || [],
        genreIds: apiData.genres?.map((g: {id: number}) => g.id) || defaultValues.genreIds || [],
        moodIds: apiData.moods?.map((m: {id: number}) => m.id) || defaultValues.moodIds || [],
        audioUrl: apiData.audioUrl || defaultValues.audioUrl || "",
        duration: apiData.duration || defaultValues.duration || "",
      };
      // Lưu giá trị gốc để so sánh khi submit
      setOriginalAudioUrl(apiData.audioUrl || "");
      setSelectedFile(null); // Reset file when dialog opens with existing data
      form.reset(formValues);
    } else if (open) {
      setOriginalAudioUrl("");
      setSelectedFile(null); // Reset file when creating new song
      form.reset({
        name: "",
        releaseYear: new Date().getFullYear(),
        genreIds: [],
        artistIds: [],
        moodIds: [],
        audioUrl: "",
        duration: "",
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
    if (!file) {
      setSelectedFile(null);
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Get duration from file
      const duration = await getAudioDuration(file);
      form.setValue("duration", duration);
      
      // Store file for update (will be sent to backend)
      setSelectedFile(file);
      
      // For create mode, still upload to Cloudinary to get URL
      // For update mode, file will be sent directly to backend
      if (mode === "create") {
        // Simulate progress
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
      } else {
        // Update mode: just store file, don't upload yet
        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      }
    } catch (error) {
      console.error("File processing error:", error);
      alert("Lỗi khi xử lý file. Vui lòng thử lại.");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (data: SongFormValues) => {
    // For update mode: include file if selected, exclude duration and audioUrl
    if (mode === "edit") {
      const { duration, audioUrl, ...restData } = data;
      const submitData: SongFormValues & { file?: File } = {
        ...restData,
        file: selectedFile || undefined, // Include file if selected
        // Don't send audioUrl or duration - backend will reject them
      };
      onSubmit(submitData);
    } else {
      // Create mode: send as normal (may include file for create too)
      // Note: duration can be included in create mode if needed
      onSubmit(data);
    }
  };

  const handleConfirmSubmit = () => {
    if (pendingSubmit) {
      onSubmit(pendingSubmit);
      setShowConfirmDialog(false);
      setPendingSubmit(null);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setPendingSubmit(null);
  };

  const selectedArtistIds = form.watch("artistIds") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên bài hát *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Tên bài hát" 
                      {...field} 
                      className="admin-input transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <FormField
              control={form.control}
              name="releaseYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Năm phát hành *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="2024" 
                      {...field} 
                      className="admin-input transition-all duration-200"
                    />
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
                  <FormLabel>Thời lượng (mm:ss)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="3:45" 
                      {...field} 
                      disabled
                      className="admin-input transition-all duration-200"
                    />
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
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    Thể loại *
                    {field.value?.length > 0 && (
                      <span className="text-xs bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-2 py-0.5 rounded-full">
                        {field.value.length} đã chọn
                      </span>
                    )}
                  </FormLabel>
                  <Popover open={genrePopoverOpen} onOpenChange={setGenrePopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-12 transition-all duration-200 hover:border-[hsl(var(--admin-active))] hover:shadow-sm",
                            !field.value?.length && "text-muted-foreground",
                            field.value?.length && "border-[hsl(var(--admin-active))] bg-[hsl(var(--admin-hover))]"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 text-left">
                            {field.value?.length ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full"></div>
                                <span className="font-medium">
                                  {field.value.length} thể loại đã chọn
                                </span>
                              </div>
                            ) : (
                              <span>Tìm kiếm và chọn thể loại...</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 shadow-lg border-[hsl(var(--admin-border))]" align="start">
                      <Command shouldFilter={false}>
                        <div className="p-3 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                          <CommandInput
                            placeholder="Tìm kiếm thể loại..."
                            value={genreSearchQuery}
                            onValueChange={setGenreSearchQuery}
                            className="border-0 focus:ring-0"
                          />
                        </div>
                        <CommandEmpty className="py-6 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs">🔍</span>
                            </div>
                            <span>Không tìm thấy thể loại</span>
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto scrollbar-admin">
                          {filteredGenres.map((genre) => {
                            const isSelected = field.value?.includes(genre.id);
                            return (
                              <CommandItem
                                key={genre.id}
                                value={genre.id.toString()}
                                onSelect={() => {
                                  if (isSelected) {
                                    field.onChange(
                                      field.value?.filter((id: number) => id !== genre.id)
                                    );
                                  } else {
                                    field.onChange([...(field.value || []), genre.id]);
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 cursor-pointer transition-all duration-200",
                                  isSelected && "bg-[hsl(var(--admin-hover))] text-[hsl(var(--admin-active-foreground))]"
                                )}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                                    isSelected 
                                      ? "bg-[hsl(var(--admin-active))] border-[hsl(var(--admin-active))]" 
                                      : "border-muted-foreground"
                                  )}>
                                    {isSelected && (
                                      <Check className="h-3 w-3 text-[hsl(var(--admin-active-foreground))]" />
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{genre.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ID: {genre.id}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full animate-pulse"></div>
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {field.value?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {field.value.map((genreId: number) => {
                        const genre = allGenres.find(g => g.id === genreId);
                        return (
                          <div
                            key={genreId}
                            className="group flex items-center gap-2 bg-gradient-to-r from-[hsl(var(--admin-hover))] to-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
                          >
                            <div className="w-2 h-2 bg-[hsl(var(--admin-active-foreground))] rounded-full"></div>
                            <span className="truncate max-w-[120px]">{genre?.name || `ID: ${genreId}`}</span>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter((id: number) => id !== genreId)
                                );
                              }}
                              className="ml-1 hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-all duration-200 opacity-70 hover:opacity-100"
                            >
                              <span className="text-xs">×</span>
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
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    Nghệ sĩ *
                    {field.value?.length > 0 && (
                      <span className="text-xs bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-2 py-0.5 rounded-full">
                        {field.value.length} đã chọn
                      </span>
                    )}
                  </FormLabel>
                  <Popover open={artistPopoverOpen} onOpenChange={setArtistPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-12 transition-all duration-200 hover:border-[hsl(var(--admin-active))] hover:shadow-sm",
                            !field.value?.length && "text-muted-foreground",
                            field.value?.length && "border-[hsl(var(--admin-active))] bg-[hsl(var(--admin-hover))]"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 text-left">
                            {field.value?.length ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full"></div>
                                <span className="font-medium">
                                  {field.value.length} nghệ sĩ đã chọn
                                </span>
                              </div>
                            ) : (
                              <span>Tìm kiếm và chọn nghệ sĩ...</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 shadow-lg border-[hsl(var(--admin-border))]" align="start">
                      <Command shouldFilter={false}>
                        <div className="p-3 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                          <CommandInput
                            placeholder="Tìm kiếm nghệ sĩ..."
                            value={artistSearchQuery}
                            onValueChange={setArtistSearchQuery}
                            className="border-0 focus:ring-0"
                          />
                        </div>
                        <CommandEmpty className="py-6 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs">🎤</span>
                            </div>
                            <span>Không tìm thấy nghệ sĩ</span>
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto scrollbar-admin">
                          {filteredArtists.map((artist) => {
                            const isSelected = field.value?.includes(artist.id);
                            return (
                              <CommandItem
                                key={artist.id}
                                value={artist.id.toString()}
                                onSelect={() => {
                                  if (isSelected) {
                                    field.onChange(
                                      field.value?.filter((id: number) => id !== artist.id)
                                    );
                                  } else {
                                    field.onChange([...(field.value || []), artist.id]);
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 cursor-pointer transition-all duration-200",
                                  isSelected && "bg-[hsl(var(--admin-hover))] text-[hsl(var(--admin-active-foreground))]"
                                )}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                                    isSelected 
                                      ? "bg-[hsl(var(--admin-active))] border-[hsl(var(--admin-active))]" 
                                      : "border-muted-foreground"
                                  )}>
                                    {isSelected && (
                                      <Check className="h-3 w-3 text-[hsl(var(--admin-active-foreground))]" />
                                    )}
                                  </div>
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={artist.avatar} alt={artist.name} />
                                    <AvatarFallback className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] text-xs">
                                      {artist.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{artist.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ID: {artist.id} • {artist.country || "N/A"}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full animate-pulse"></div>
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {field.value?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {field.value.map((artistId: number) => {
                        const artist = allArtists.find((a) => a.id === artistId);
                        if (!artist) return null;
                        return (
                          <div
                            key={artistId}
                            className="group flex items-center gap-2 bg-gradient-to-r from-[hsl(var(--admin-hover))] to-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={artist.avatar} alt={artist.name} />
                              <AvatarFallback className="bg-[hsl(var(--admin-active-foreground))] text-[hsl(var(--admin-active))] text-xs">
                                {artist.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[120px]">{artist.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter((id: number) => id !== artistId)
                                );
                              }}
                              className="ml-1 hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-all duration-200 opacity-70 hover:opacity-100"
                            >
                              <span className="text-xs">×</span>
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

            <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="moodIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    Mood (tùy chọn)
                    {field.value && field.value.length > 0 && (
                      <span className="text-xs bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-2 py-0.5 rounded-full">
                        {field.value.length} đã chọn
                      </span>
                    )}
                  </FormLabel>
                  <Popover open={moodPopoverOpen} onOpenChange={setMoodPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-12 transition-all duration-200 hover:border-[hsl(var(--admin-active))] hover:shadow-sm",
                            !field.value?.length && "text-muted-foreground",
                            field.value?.length && "border-[hsl(var(--admin-active))] bg-[hsl(var(--admin-hover))]"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 text-left">
                            {field.value?.length ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full"></div>
                                <span className="font-medium">
                                  {field.value.length} mood đã chọn
                                </span>
                              </div>
                            ) : (
                              <span>Tìm kiếm và chọn mood...</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 shadow-lg border-[hsl(var(--admin-border))]" align="start">
                      <Command shouldFilter={false}>
                        <div className="p-3 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                          <CommandInput
                            placeholder="Tìm kiếm mood..."
                            value={moodSearchQuery}
                            onValueChange={setMoodSearchQuery}
                            className="border-0 focus:ring-0"
                          />
                        </div>
                        <CommandEmpty className="py-6 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs">😊</span>
                            </div>
                            <span>Không tìm thấy mood</span>
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto scrollbar-admin">
                          {filteredMoods.map((mood) => {
                            const isSelected = field.value?.includes(mood.id);
                            return (
                              <CommandItem
                                key={mood.id}
                                value={mood.id.toString()}
                                onSelect={() => {
                                  if (isSelected) {
                                    field.onChange(
                                      field.value?.filter((id: number) => id !== mood.id)
                                    );
                                  } else {
                                    field.onChange([...(field.value || []), mood.id]);
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 cursor-pointer transition-all duration-200",
                                  isSelected && "bg-[hsl(var(--admin-hover))] text-[hsl(var(--admin-active-foreground))]"
                                )}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                                    isSelected 
                                      ? "bg-[hsl(var(--admin-active))] border-[hsl(var(--admin-active))]" 
                                      : "border-muted-foreground"
                                  )}>
                                    {isSelected && (
                                      <Check className="h-3 w-3 text-[hsl(var(--admin-active-foreground))]" />
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{mood.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ID: {mood.id}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full animate-pulse"></div>
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {field.value.map((moodId: number) => {
                        const mood = allMoods.find(m => m.id === moodId);
                        return (
                          <div
                            key={moodId}
                            className="group flex items-center gap-2 bg-gradient-to-r from-[hsl(var(--admin-hover))] to-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
                          >
                            <div className="w-2 h-2 bg-[hsl(var(--admin-active-foreground))] rounded-full"></div>
                            <span className="truncate max-w-[120px]">{mood?.name || `ID: ${moodId}`}</span>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter((id: number) => id !== moodId)
                                );
                              }}
                              className="ml-1 hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-all duration-200 opacity-70 hover:opacity-100"
                            >
                              <span className="text-xs">×</span>
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
            </div>

            <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="audioUrl"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 mb-3">
                      File nhạc * {mode === "edit" && "(Chỉ upload file mới)"}
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {/* Upload file input */}
                        <div className="space-y-2">
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
                        </div>

                        {/* Hiển thị URL hiện tại (chỉ ở chế độ edit) */}
                        {mode === "edit" && originalAudioUrl && (
                          <div className="space-y-2 p-3 bg-muted/50 rounded-md border border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">
                                Audio hiện tại:
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const audio = new Audio(originalAudioUrl);
                                  audio.play().catch((err) => {
                                    console.error("Error playing audio:", err);
                                    alert("Không thể phát audio. Vui lòng kiểm tra URL.");
                                  });
                                }}
                                className="flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                Nghe thử
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="truncate text-xs">
                                {originalAudioUrl.substring(0, 80)}{originalAudioUrl.length > 80 ? '...' : ''}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Hiển thị URL mới nếu đã upload file (chế độ create) */}
                        {mode === "create" && field.value && !uploading && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="truncate text-xs">
                              Audio URL: {field.value.substring(0, 60)}{field.value.length > 60 ? '...' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            </div>

            <DialogFooter className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-active-foreground))] transition-all duration-200"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 transition-all duration-200"
              >
                {isLoading ? "Đang lưu..." : mode === "create" ? "Tạo" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Confirm Dialog for critical field changes */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Xác nhận thay đổi quan trọng
            </DialogTitle>
            <DialogDescription>
              Bạn đang thay đổi các trường quan trọng có thể ảnh hưởng đến việc nhận diện bài hát:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {pendingSubmit && (
              <>
                {pendingSubmit.audioUrl !== originalAudioUrl && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Audio URL:</strong> Đã thay đổi
                      <br />
                      <span className="text-xs">Thay đổi URL audio có thể ảnh hưởng đến bài hát.</span>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelConfirm}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSubmit}
            >
              Xác nhận thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};