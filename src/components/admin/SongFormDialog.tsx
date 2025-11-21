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
import { genresApi, artistsApi, moodsApi, songGenreApi, songMoodApi } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const contributorFieldConfigs = [
  { field: "performerIds", label: "Ca sĩ chính", required: true, badgeLabel: "ca sĩ" },
  { field: "featIds", label: "Feat (ca sĩ phụ)", required: false, badgeLabel: "feat" },
  { field: "composerIds", label: "Nhạc sĩ (Composer)", required: false, badgeLabel: "composer" },
  { field: "lyricistIds", label: "Người viết lời (Lyricist)", required: false, badgeLabel: "lyricist" },
  { field: "producerIds", label: "Producer", required: false, badgeLabel: "producer" },
] as const;

type ContributorField = typeof contributorFieldConfigs[number]["field"];

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
  performerIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 ca sĩ chính"),
  featIds: z.array(z.number()).optional(),
  composerIds: z.array(z.number()).optional(),
  lyricistIds: z.array(z.number()).optional(),
  producerIds: z.array(z.number()).optional(),
  artistIds: z.array(z.number()).optional(),
  moodIds: z.array(z.number()).optional(),
  duration: z.string().optional(),
});

type SongFormValues = z.infer<typeof songFormSchema>;

interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SongFormValues & { file?: File }, genreScores?: Map<number, number>, moodScores?: Map<number, number>) => void;
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
  const [genrePopoverOpen, setGenrePopoverOpen] = useState(false);
  const [moodPopoverOpen, setMoodPopoverOpen] = useState(false);
  const [genreScores, setGenreScores] = useState<Map<number, string>>(new Map());
  const [moodScores, setMoodScores] = useState<Map<number, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<SongFormValues | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Store selected file for update
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeContributorPopover, setActiveContributorPopover] = useState<ContributorField | null>(null);

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      name: "",
      releaseYear: new Date().getFullYear(),
      genreIds: [],
      performerIds: [],
      featIds: [],
      composerIds: [],
      lyricistIds: [],
      producerIds: [],
      artistIds: [],
      moodIds: [],
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
      const apiData = defaultValues as {
        genres?: {id: number}[];
        moods?: {id: number}[];
        performers?: {id: number}[];
        singer?: {id: number}[];
        feat?: {id: number}[];
        composer?: {id: number}[];
        lyricist?: {id: number}[];
        producer?: {id: number}[];
        performerIds?: number[];
        featIds?: number[];
        composerIds?: number[];
        lyricistIds?: number[];
        producerIds?: number[];
        duration?: string;
      };

      const resolvedPerformerIds = apiData.performerIds
        ?? apiData.singer?.map((a) => a.id)
        ?? apiData.performers?.map((a) => a.id)
        ?? defaultValues.performerIds
        ?? [];
      const resolvedFeatIds = apiData.featIds
        ?? apiData.feat?.map((a) => a.id)
        ?? defaultValues.featIds
        ?? [];
      const resolvedComposerIds = apiData.composerIds
        ?? apiData.composer?.map((a) => a.id)
        ?? defaultValues.composerIds
        ?? [];
      const resolvedLyricistIds = apiData.lyricistIds
        ?? apiData.lyricist?.map((a) => a.id)
        ?? defaultValues.lyricistIds
        ?? [];
      const resolvedProducerIds = apiData.producerIds
        ?? apiData.producer?.map((a) => a.id)
        ?? defaultValues.producerIds
        ?? [];

      const unionArtistIds = Array.from(new Set([
        ...resolvedPerformerIds,
        ...resolvedFeatIds,
        ...resolvedComposerIds,
        ...resolvedLyricistIds,
        ...resolvedProducerIds,
      ]));

      const formValues = {
        ...defaultValues,
        performerIds: resolvedPerformerIds,
        featIds: resolvedFeatIds,
        composerIds: resolvedComposerIds,
        lyricistIds: resolvedLyricistIds,
        producerIds: resolvedProducerIds,
        artistIds: unionArtistIds,
        genreIds: apiData.genres?.map((g: {id: number}) => g.id) || defaultValues.genreIds || [],
        moodIds: apiData.moods?.map((m: {id: number}) => m.id) || defaultValues.moodIds || [],
        duration: apiData.duration || defaultValues.duration || "",
      };
      // Lưu giá trị gốc để so sánh khi submit
      setSelectedFile(null); // Reset file when dialog opens with existing data
      form.reset(formValues);
    } else if (open) {
      setSelectedFile(null); // Reset file when creating new song
      setGenreScores(new Map());
      setMoodScores(new Map());
      form.reset({
        name: "",
        releaseYear: new Date().getFullYear(),
        genreIds: [],
        artistIds: [],
        moodIds: [],
        duration: "",
      });
    }
    
  }, [open, defaultValues, form]);


  const handleFileChange = async (file: File | undefined) => {
    if (!file) {
      setSelectedFile(null);
      if (mode === "create") {
        setFileError("Vui lòng chọn file audio để tạo bài hát");
      }
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Get duration from file
      const duration = await getAudioDuration(file);
      form.setValue("duration", duration);
      
      // Store file - will be uploaded to S3 via backend API when form is submitted
      setSelectedFile(file);
      setFileError(null);
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("File processing error:", error);
      alert("Lỗi khi xử lý file. Vui lòng thử lại.");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const collectArtistIds = (values: SongFormValues): number[] => {
    const ids = new Set<number>();
    (values.performerIds ?? []).forEach((id) => ids.add(id));
    (values.featIds ?? []).forEach((id) => ids.add(id));
    (values.composerIds ?? []).forEach((id) => ids.add(id));
    (values.lyricistIds ?? []).forEach((id) => ids.add(id));
    (values.producerIds ?? []).forEach((id) => ids.add(id));
    return Array.from(ids);
  };

  const handleSubmit = (data: SongFormValues) => {
    if (mode === "create" && !selectedFile) {
      setFileError("Vui lòng chọn file audio trước khi lưu");
      return;
    }

    const artistUnion = collectArtistIds(data);
    const normalizedData: SongFormValues & { file?: File } = {
      ...data,
      artistIds: artistUnion,
      file: selectedFile || undefined,
    };
    
    // Convert genreScores and moodScores from Map<number, string> to Map<number, number>
    const genreScoresMap = new Map<number, number>();
    genreScores.forEach((scoreStr, genreId) => {
      const score = parseFloat(scoreStr);
      if (Number.isFinite(score) && score >= 0 && score <= 1) {
        genreScoresMap.set(genreId, score);
      } else {
        genreScoresMap.set(genreId, 1.0); // Default to 1.0 if invalid
      }
    });
    
    const moodScoresMap = new Map<number, number>();
    moodScores.forEach((scoreStr, moodId) => {
      const score = parseFloat(scoreStr);
      if (Number.isFinite(score) && score >= 0 && score <= 1) {
        moodScoresMap.set(moodId, score);
      } else {
        moodScoresMap.set(moodId, 1.0); // Default to 1.0 if invalid
      }
    });
    
    // For update mode: include file if selected, exclude duration
    if (mode === "edit") {
      const { duration, file: _unusedFile, ...restData } = normalizedData;
      const submitData: SongFormValues & { file?: File } = {
        ...restData,
        file: selectedFile || undefined, // Include file if selected
        // Don't send duration - backend will reject it
      };
      onSubmit(submitData);
    } else {
      // Create mode: send as normal (may include file for create too)
      // Note: duration can be included in create mode if needed
      onSubmit(normalizedData, genreScoresMap, moodScoresMap);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="metadata" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-1 md:mx-2 mt-1 md:mt-2 mb-0 w-full overflow-x-auto">
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="contributor">Contributor</TabsTrigger>
                <TabsTrigger value="genre">Genre</TabsTrigger>
                <TabsTrigger value="mood">Mood</TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-y-auto px-1 md:px-2 py-3">
                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="md:col-span-2">
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 mb-3">
                          File nhạc * {mode === "edit" && "(Chỉ upload file mới)"}
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-3">
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
                            {mode === "edit" && (
                              <div className="text-sm text-muted-foreground">
                                Upload file mới để thay thế audio hiện tại
                              </div>
                            )}
                            {selectedFile && !uploading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="truncate text-xs">
                                  File đã chọn: {selectedFile.name}
                                </span>
                              </div>
                            )}
                            {fileError && (
                              <p className="text-sm text-destructive">{fileError}</p>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contributor" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Nghệ sĩ & Credits</h3>
                    <p className="text-sm text-muted-foreground">
                      Sắp xếp nghệ sĩ theo từng vai trò. Thứ tự trong danh sách sẽ được giữ nguyên.
                    </p>
                  </div>
                  {contributorFieldConfigs.map(({ field, label, required, badgeLabel }) => (
                    <FormField
                      key={field}
                      control={form.control}
                      name={field}
                      render={({ field: formField }) => {
                        const value: number[] = formField.value ?? [];
                        const isOpen = activeContributorPopover === field;
                        return (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              {label} {required && <span className="text-destructive">*</span>}
                              {value.length > 0 && (
                                <span className="text-xs bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-2 py-0.5 rounded-full">
                                  {value.length} đã chọn
                                </span>
                              )}
                            </FormLabel>
                            <Popover
                              open={isOpen}
                              onOpenChange={(open) => {
                                setActiveContributorPopover(open ? field : null);
                                if (!open) setArtistSearchQuery("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between h-12 transition-all duration-200 hover:border-[hsl(var(--admin-active))] hover:shadow-sm",
                                      !value.length && "text-muted-foreground",
                                      value.length && "border-[hsl(var(--admin-active))] bg-[hsl(var(--admin-hover))]"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 flex-1 text-left">
                                      {value.length ? (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-[hsl(var(--admin-active))] rounded-full"></div>
                                          <span className="font-medium">
                                            {value.length} nghệ sĩ {badgeLabel ? `(${badgeLabel})` : ""}
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
                                      const isSelected = value.includes(artist.id);
                                      return (
                                        <CommandItem
                                          key={artist.id}
                                          value={artist.id.toString()}
                                          onSelect={() => {
                                            if (isSelected) {
                                              formField.onChange(value.filter((id) => id !== artist.id));
                                            } else {
                                              formField.onChange([...value, artist.id]);
                                            }
                                          }}
                                          className={cn(
                                            "flex items-center justify-between p-3 cursor-pointer transition-all duration-200",
                                            isSelected && "bg-[hsl(var(--admin-hover))] text-[hsl(var(--admin-active-foreground))]"
                                          )}
                                        >
                                          <div className="flex items-center gap-3 flex-1">
                                            <div
                                              className={cn(
                                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                                                isSelected
                                                  ? "bg-[hsl(var(--admin-active))] border-[hsl(var(--admin-active))]"
                                                  : "border-muted-foreground"
                                              )}
                                            >
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
                            {value.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {value.map((artistId) => {
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
                                        onClick={() => formField.onChange(value.filter((id) => id !== artistId))}
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
                        );
                      }}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="genre" className="space-y-4">
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
                                          const newScores = new Map(genreScores);
                                          newScores.delete(genre.id);
                                          setGenreScores(newScores);
                                        } else {
                                          field.onChange([...(field.value || []), genre.id]);
                                          const newScores = new Map(genreScores);
                                          newScores.set(genre.id, "1.0");
                                          setGenreScores(newScores);
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
                          <div className="space-y-2 mt-3">
                            {field.value.map((genreId: number) => {
                              const genre = allGenres.find(g => g.id === genreId);
                              const currentScore = genreScores.get(genreId) || "1.0";
                              return (
                                <div
                                  key={genreId}
                                  className="group flex items-center gap-3 bg-gradient-to-r from-[hsl(var(--admin-hover))] to-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                                >
                                  <div className="w-2 h-2 bg-[hsl(var(--admin-active-foreground))] rounded-full"></div>
                                  <span className="truncate flex-1 min-w-0">{genre?.name || `ID: ${genreId}`}</span>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground">Score:</label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="1"
                                      value={currentScore}
                                      onChange={(e) => {
                                        const newScores = new Map(genreScores);
                                        newScores.set(genreId, e.target.value);
                                        setGenreScores(newScores);
                                      }}
                                      className="w-20 h-8 text-xs"
                                      placeholder="1.0"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange(
                                        field.value?.filter((id: number) => id !== genreId)
                                      );
                                      const newScores = new Map(genreScores);
                                      newScores.delete(genreId);
                                      setGenreScores(newScores);
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
                </TabsContent>

                <TabsContent value="mood" className="space-y-4">
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
                                          const newScores = new Map(moodScores);
                                          newScores.delete(mood.id);
                                          setMoodScores(newScores);
                                        } else {
                                          field.onChange([...(field.value || []), mood.id]);
                                          const newScores = new Map(moodScores);
                                          newScores.set(mood.id, "1.0");
                                          setMoodScores(newScores);
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
                          <div className="space-y-2 mt-3">
                            {field.value.map((moodId: number) => {
                              const mood = allMoods.find(m => m.id === moodId);
                              const currentScore = moodScores.get(moodId) || "1.0";
                              return (
                                <div
                                  key={moodId}
                                  className="group flex items-center gap-3 bg-gradient-to-r from-[hsl(var(--admin-hover))] to-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                                >
                                  <div className="w-2 h-2 bg-[hsl(var(--admin-active-foreground))] rounded-full"></div>
                                  <span className="truncate flex-1 min-w-0">{mood?.name || `ID: ${moodId}`}</span>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground">Score:</label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="1"
                                      value={currentScore}
                                      onChange={(e) => {
                                        const newScores = new Map(moodScores);
                                        newScores.set(moodId, e.target.value);
                                        setMoodScores(newScores);
                                      }}
                                      className="w-20 h-8 text-xs"
                                      placeholder="1.0"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange(
                                        field.value?.filter((id: number) => id !== moodId)
                                      );
                                      const newScores = new Map(moodScores);
                                      newScores.delete(moodId);
                                      setMoodScores(newScores);
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
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="mt-2">
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