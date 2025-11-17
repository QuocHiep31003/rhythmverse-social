import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Search, Music2, User, X, Upload, ChevronsUpDown, Check } from "lucide-react";
import { songsApi } from "@/services/api";
import { uploadImage } from "@/config/cloudinary";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

// === Validation Schema ===
const albumSchema = z.object({
  name: z.string().min(1, "Album name is required"),
  artistId: z.number().min(1, "Artist is required"),
  songIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 bài hát"),
  releaseDate: z.string().min(1, "Release date is required"),
  coverUrl: z.string().optional().or(z.literal("")),
});

export type AlbumFormValues = z.infer<typeof albumSchema>;

interface Artist {
  id: number;
  name: string;
  country: string;
  debutYear: number;
  avatar?: string;
}

interface SongOption {
  id: number;
  name: string;
  releaseYear?: number | null;
  isInOtherAlbum?: boolean;
}

interface AlbumFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AlbumFormValues) => void;
  defaultValues?: Partial<AlbumFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
  artists: Artist[];
  existingSongs?: SongOption[];
}

export const AlbumFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
  artists,
  existingSongs = [],
}: AlbumFormDialogProps) => {
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [artistQuery, setArtistQuery] = useState("");
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [songQuery, setSongQuery] = useState("");
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [songsPopoverOpen, setSongsPopoverOpen] = useState(false);

  const form = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      name: "",
      artistId: 0,
      songIds: [],
      releaseDate: new Date().toISOString().split("T")[0],
      coverUrl: "",
      ...defaultValues,
    },
  });

  const artistId = form.watch("artistId");
  const selectedSongs = form.watch("songIds") || [];

  useEffect(() => {
    if (open && mode === "create") {
      form.reset({
        name: "",
        artistId: 0,
        songIds: [],
        releaseDate: new Date().toISOString().split("T")[0],
        coverUrl: "",
      });
      setCoverPreview("");
      setArtistQuery("");
      setSongs([]);
      setSongQuery("");
    }
    if (open && defaultValues) {
      const normalized = {
        name: defaultValues.name || "",
        artistId: Number(defaultValues.artistId) || 0,
        songIds: (defaultValues.songIds as number[]) || [],
        releaseDate: defaultValues.releaseDate
          ? new Date(defaultValues.releaseDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        coverUrl: defaultValues.coverUrl || "",
      } as AlbumFormValues;

      form.reset(normalized);
      setCoverPreview(normalized.coverUrl || "");
      const currentArtist = artists.find((a) => a.id === Number(normalized.artistId));
      if (currentArtist) {
        setArtistQuery(currentArtist.name);
      }
    }
  }, [open, mode, defaultValues, form, artists]);

  useEffect(() => {
    if (!open) return;
    if (mode !== "edit") return;
    if (artistQuery) return;
    if (artistId && artistId > 0) {
      const currentArtist = artists.find((a) => a.id === Number(artistId));
      if (currentArtist) {
        setArtistQuery(currentArtist.name);
      }
    }
  }, [artistId, mode, open, artistQuery, artists]);

  const mergeExistingSongs = useCallback((fetched: SongOption[]) => {
    if ((!defaultValues?.songIds || defaultValues.songIds.length === 0) && existingSongs.length === 0) {
      return fetched;
    }
    const map = new Map<number, SongOption>();
    existingSongs.forEach((song) => {
      if (!song) return;
      map.set(Number(song.id), {
        id: Number(song.id),
        name: song.name,
        releaseYear: song.releaseYear ?? null,
        isInOtherAlbum: false,
      });
    });
    fetched.forEach((song) => {
      if (!map.has(song.id)) {
        map.set(song.id, song);
      }
    });
    return Array.from(map.values());
  }, [existingSongs, defaultValues]);

  const fetchSongsWithoutAlbum = useCallback(async (query: string) => {
    setLoadingSongs(true);
    try {
      const response = await songsApi.getWithoutAlbum({ page: 0, size: 500, search: query || undefined });
      const available = (response.content || []).map((item: any) => ({
        id: Number(item.id),
        name: item.name,
        releaseYear: item.releaseYear ?? null,
        isInOtherAlbum: false,
      })) as SongOption[];

      const merged = mergeExistingSongs(available);
      setSongs(merged);
    } catch (error) {
      console.error("Error loading songs without album:", error);
    } finally {
      setLoadingSongs(false);
    }
  }, [mergeExistingSongs]);

  useEffect(() => {
    if (!open) return;
    fetchSongsWithoutAlbum("");
  }, [open, fetchSongsWithoutAlbum]);

  useEffect(() => {
    if (!open) return;
    const handler = setTimeout(() => {
      fetchSongsWithoutAlbum(songQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [songQuery, open, fetchSongsWithoutAlbum]);

  const handleArtistSelect = (artist: Artist) => {
    form.setValue("artistId", artist.id);
    setArtistQuery(artist.name);
    setShowArtistDropdown(false);
  };

  const handleSongToggle = (id: number) => {
    const current = form.getValues("songIds");
    form.setValue(
      "songIds",
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setCoverPreview(result.secure_url);
      form.setValue("coverUrl", result.secure_url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverPreview("");
    form.setValue("coverUrl", "");
  };

  const handleFormSubmit = (values: AlbumFormValues) => {
    onSubmit({
      ...values,
      artistId: Number(values.artistId),
      songIds: values.songIds?.map(Number) || [],
    });
  };

  const filteredArtists = artists.filter((a) =>
    a.name.toLowerCase().includes(artistQuery.toLowerCase())
  );

  const songLookup = useMemo(() => {
    const map = new Map<number, SongOption>();
    [...existingSongs, ...songs].forEach((song) => {
      if (song) {
        map.set(Number(song.id), song);
      }
    });
    return map;
  }, [existingSongs, songs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-zinc-950 border border-zinc-800 rounded-xl p-0 text-white">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800">
          <DialogTitle className="text-2l font-bold">
            {mode === "create" ? "Tạo Album mới" : "Chỉnh sửa Album"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Fill in the album details. You can add songs later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="flex flex-col sm:flex-row gap-6 px-6 py-6"
          >
            <input type="hidden" {...form.register("coverUrl")} />
            <div className="flex flex-col items-center justify-start gap-4 w-full sm:w-2/5">
              <div className="relative w-40 h-40 border-2 border-dashed border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-900">
                {coverPreview ? (
                  <>
                    <img
                      src={coverPreview}
                      alt="Album cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-zinc-800 transition-colors">
                    <Upload className="w-6 h-6 mb-1 text-gray-400" />
                    <span className="text-xs text-gray-500 text-center px-2">
                      {uploading ? "Uploading..." : "Upload cover"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">
                Max 5MB. Supported formats
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Album Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter album name..."
                        className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="artistId"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm">Artist *</FormLabel>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3 h-3 text-gray-400" />
                      <Input
                        value={artistQuery}
                        onChange={(e) => {
                          setArtistQuery(e.target.value);
                          setShowArtistDropdown(true);
                        }}
                        onFocus={() => setShowArtistDropdown(true)}
                        placeholder="Search artist..."
                        className="pl-8 bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm"
                      />
                      {showArtistDropdown && filteredArtists.length > 0 && (
                        <div className="absolute z-30 w-full bg-zinc-900 border border-zinc-700 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:hidden">
                          {filteredArtists.map((artist) => (
                            <div
                              key={artist.id}
                              onClick={() => handleArtistSelect(artist)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 cursor-pointer transition-colors"
                            >
                              {artist.avatar ? (
                                <img
                                  src={artist.avatar}
                                  alt={artist.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                              <div>
                                <p className="font-medium text-sm">
                                  {artist.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {artist.country} • {artist.debutYear}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Release Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-zinc-900 border-zinc-700 focus:border-indigo-500 transition-colors h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="songIds"
                render={({ field }) => {
                  const selectedDetails = (field.value || []).map((id: number) => songLookup.get(id)).filter(Boolean) as SongOption[];
                  return (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Songs <span className="text-gray-500 text-xs">(bắt buộc)</span>
                      </FormLabel>
                      <Popover open={songsPopoverOpen} onOpenChange={setSongsPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-sm"
                          >
                            <span>
                              {field.value?.length
                                ? `Đã chọn ${field.value.length} bài hát`
                                : "Chọn bài hát"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Tìm bài hát..."
                              value={songQuery}
                              onValueChange={setSongQuery}
                            />
                            <CommandEmpty>
                              {loadingSongs ? "Đang tải bài hát..." : "Không tìm thấy bài hát."}
                            </CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {songs.map((song) => {
                                  const checked = field.value?.includes(song.id);
                                  return (
                                    <CommandItem
                                      key={song.id}
                                      value={song.name}
                                      onSelect={() => handleSongToggle(song.id)}
                                      className="flex items-center gap-2"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => handleSongToggle(song.id)}
                                        className="h-4 w-4"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{song.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {song.releaseYear ?? "Chưa rõ"}
                                        </p>
                                      </div>
                                      {checked && <Check className="h-4 w-4 text-green-500" />}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedDetails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedDetails.map((song) => (
                            <Badge key={song.id} variant="secondary" className="gap-2">
                              {song.name}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleSongToggle(song.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <DialogFooter className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading || uploading}
                  className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 transition-colors h-8 text-xs px-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || uploading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-8 text-xs px-3"
                >
                  {uploading
                    ? "Uploading..."
                    : isLoading
                    ? "Saving..."
                    : mode === "create"
                    ? "Create Album"
                    : "Update Album"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AlbumFormDialog;