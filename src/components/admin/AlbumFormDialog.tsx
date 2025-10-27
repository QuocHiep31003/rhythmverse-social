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
import { Textarea } from "@/components/ui/textarea";
import { Search, Image, Music2, User, X, Upload } from "lucide-react";
import { songsApi } from "@/services/api";
import { debounce } from "lodash";
import { uploadImage } from "@/config/cloudinary";
import { toast } from "sonner";

// === Validation Schema ===
const albumSchema = z.object({
  name: z.string().min(1, "Album name is required"),
  artistId: z.number().min(1, "Artist is required"),
  songIds: z.array(z.number()).optional().default([]),
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

interface Song {
  id: number;
  name: string;
  releaseYear: number;
  albumId?: number | null;
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
}

export const AlbumFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
  artists,
}: AlbumFormDialogProps) => {
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [artistQuery, setArtistQuery] = useState("");
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [songQuery, setSongQuery] = useState("");
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // ✅ Reset form each time "create new" dialog opens
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
      setFilteredSongs([]);
      setSongQuery("");
    }
    if (open && defaultValues) {
      // Normalize date format for the date input
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
      // Pre-fill artist search box when editing
      const currentArtist = artists.find((a) => a.id === Number(normalized.artistId));
      if (currentArtist) {
        setArtistQuery(currentArtist.name);
      }
    }
  }, [open, mode, defaultValues, form, artists]);

  // Keep artist query in sync if artistId changes while editing and query is empty
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

  // ✅ Load songs by artist, filter out those already in another album
  useEffect(() => {
    if (artistId && artistId > 0) {
      setLoadingSongs(true);
      songsApi
        .getByArtist(artistId)
        .then((res) => {
          // FE filter logic: mark which songs already have album
          const processed = res.map((song: Song) => ({
            ...song,
            isInOtherAlbum:
              !!song.albumId &&
              song.albumId !== (defaultValues as any)?.id, // ignore current album
          }));

          setSongs(processed);
          setFilteredSongs(processed);
        })
        .finally(() => setLoadingSongs(false));
    } else {
      setSongs([]);
      setFilteredSongs([]);
    }
  }, [artistId, defaultValues]);

  // ✅ Debounced song search
  const handleSongSearch = debounce((query: string) => {
    const lower = query.toLowerCase();
    setFilteredSongs(
      songs.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.releaseYear.toString().includes(lower)
      )
    );
  }, 200);

  // ✅ Select artist
  const handleArtistSelect = (artist: Artist) => {
    form.setValue("artistId", artist.id);
    setArtistQuery(artist.name);
    setShowArtistDropdown(false);
  };

  // ✅ Select/Deselect song
  const handleSongToggle = (id: number) => {
    const current = form.getValues("songIds");
    form.setValue(
      "songIds",
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  // ✅ Upload image to Cloudinary
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-zinc-950 border border-zinc-800 rounded-xl p-0 text-white">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800">
          <DialogTitle className="text-2xl font-bold">
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
            {/* Hidden field to register coverUrl with RHF */}
            <input type="hidden" {...form.register("coverUrl")} />
            
            {/* === LEFT: COVER PREVIEW === */}
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

            {/* === RIGHT: FORM FIELDS === */}
            <div className="flex-1 space-y-4">
              {/* Album Name */}
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

              {/* Artist Select */}
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

              {/* Release Date */}
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

              {/* Song Selection - COMPACT VERSION */}
              <FormField
                control={form.control}
                name="songIds"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      Songs <span className="text-gray-500 text-xs">(optional)</span>
                    </FormLabel>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
                      {loadingSongs ? (
                        <p className="text-center text-gray-400 text-sm py-2">
                          Loading songs...
                        </p>
                      ) : songs.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-2">
                          {artistId
                            ? "No songs available for this artist."
                            : "Select an artist first."}
                        </p>
                      ) : (
                        <>
                          <Input
                            placeholder="Search songs..."
                            value={songQuery}
                            onChange={(e) => {
                              setSongQuery(e.target.value);
                              handleSongSearch(e.target.value);
                            }}
                            className="bg-zinc-950 border-zinc-700 text-sm h-8 focus:border-indigo-500 transition-colors"
                          />
                          
                          {/* Compact scrollable song list - CHỈ HIỆN 2 DÒNG */}
                          <div className="max-h-16 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:hidden">
                            {filteredSongs.map((song) => {
                              const checked = selectedSongs.includes(song.id);
                              const disabled = song.isInOtherAlbum;
                              return (
                                <div
                                  key={song.id}
                                  onClick={() =>
                                    !disabled && handleSongToggle(song.id)
                                  }
                                  className={`flex items-center gap-2 px-2 py-1 rounded border text-xs transition-all ${
                                    disabled
                                      ? "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
                                      : checked
                                      ? "bg-indigo-600 border-indigo-600 cursor-pointer hover:bg-indigo-700"
                                      : "bg-zinc-800 border-zinc-700 hover:border-zinc-500 cursor-pointer hover:bg-zinc-700"
                                  }`}
                                >
                                  <Music2 className="w-3 h-3 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{song.name}</p>
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {song.releaseYear}
                                  </span>
                                  {disabled && (
                                    <span className="text-xs text-red-400 whitespace-nowrap ml-1">
                                      (taken)
                                    </span>
                                  )}
                                  {checked && !disabled && (
                                    <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center ml-1">
                                      <div className="w-1 h-1 bg-indigo-600 rounded-full" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Selected songs count */}
                          {selectedSongs.length > 0 && (
                            <div className="pt-2 border-t border-zinc-700">
                              <p className="text-xs text-gray-400">
                                Selected: {selectedSongs.length} song{selectedSongs.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {/* Footer */}
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