import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload, Play, Plus, Trash2, Edit2, X, ChevronsUpDown, Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { songsApi, artistsApi, genresApi, moodsApi, songContributorApi, songGenreApi, songMoodApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL, fetchWithAuth } from "@/services/api/config";
import type { SongContributor } from "@/services/api/songContributorApi";
import type { SongGenre } from "@/services/api/songGenreApi";
import type { SongMood } from "@/services/api/songMoodApi";
import type { Song, SongCreateUpdateData } from "@/services/api/songApi";

const metadataSchema = z.object({
  name: z.string().min(1, "Tên bài hát không được để trống").max(200),
  releaseYear: z.coerce.number().min(1900, "Năm phát hành không hợp lệ").max(new Date().getFullYear() + 1),
  duration: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const toArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const obj = value as { data?: unknown; content?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.content)) return obj.content as T[];
  }
  return [];
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    if (message) {
      return message;
    }
  }
  return fallback;
};

type SongMetadataUpdate = Partial<SongCreateUpdateData> & { status?: string; file?: File };

type MetadataFormValues = z.infer<typeof metadataSchema>;

interface SongEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: number;
  onSuccess?: () => void;
  initialTab?: "metadata" | "contributor" | "genre" | "mood" | "genre-mood";
}

const ROLE_LABELS: Record<string, string> = {
  PERFORMER_MAIN: "Main vocal",
  PERFORMER_FEAT: "Feat",
  COMPOSER: "Composer",
  LYRICIST: "Lyricist",
  PRODUCER: "Producer",
  OTHER: "Other",
};

const ROLE_ORDER = [
  "PERFORMER_MAIN",
  "PERFORMER_FEAT",
  "COMPOSER",
  "LYRICIST",
  "PRODUCER",
  "OTHER",
];

export const SongEditDialog = ({
  open,
  onOpenChange,
  songId,
  onSuccess,
  initialTab = "metadata",
}: SongEditDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [songData, setSongData] = useState<Song | null>(null);
  const [contributors, setContributors] = useState<SongContributor[]>([]);
  const [songGenres, setSongGenres] = useState<SongGenre[]>([]);
  const [songMoods, setSongMoods] = useState<SongMood[]>([]);
  const [allArtists, setAllArtists] = useState<{ id: number, name: string, avatar?: string }[]>([]);
  const [allGenres, setAllGenres] = useState<{ id: number, name: string }[]>([]);
  const [allMoods, setAllMoods] = useState<{ id: number, name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"metadata" | "contributor" | "genre-mood">(initialTab === "genre" || initialTab === "mood" ? "genre-mood" : initialTab);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [newContributorRole, setNewContributorRole] = useState<string>("PERFORMER_MAIN");
  const [newContributorArtistId, setNewContributorArtistId] = useState<number | null>(null);
  const [showAddGenre, setShowAddGenre] = useState(false);
  const [newGenreId, setNewGenreId] = useState<number | null>(null);
  const [newGenreScore, setNewGenreScore] = useState<string>("1.0");
  const [showAddMood, setShowAddMood] = useState(false);
  const [newMoodId, setNewMoodId] = useState<number | null>(null);
  const [newMoodScore, setNewMoodScore] = useState<string>("1.0");
  const [editingGenreId, setEditingGenreId] = useState<number | null>(null);
  const [genreScoreDraft, setGenreScoreDraft] = useState<string>("");
  const [editingMoodId, setEditingMoodId] = useState<number | null>(null);
  const [moodScoreDraft, setMoodScoreDraft] = useState<string>("");
  const [genreSearch, setGenreSearch] = useState("");
  const [moodSearch, setMoodSearch] = useState("");
  const [artistPickerOpen, setArtistPickerOpen] = useState(false);
  const [fingerprintStatus, setFingerprintStatus] = useState<number | null>(null);
  const [checkingFingerprint, setCheckingFingerprint] = useState(false);
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const [isSavingGenre, setIsSavingGenre] = useState(false);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "contributor" | "genre" | "mood";
    id: number;
    name: string;
  } | null>(null);

  const contributorGroups = useMemo(() => {
    const grouped: Record<string, SongContributor[]> = {};
    contributors.forEach((contributor) => {
      const key = contributor.role || "OTHER";
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(contributor);
    });
    return grouped;
  }, [contributors]);

  const roleSections = useMemo(() => {
    const existingRoles = Object.keys(contributorGroups);
    const extras = existingRoles.filter((role) => !ROLE_ORDER.includes(role));
    return [...ROLE_ORDER, ...extras];
  }, [contributorGroups]);

  const selectedGenre = useMemo(
    () => (newGenreId ? allGenres.find((genre) => genre.id === newGenreId) : undefined),
    [allGenres, newGenreId]
  );
  const filteredSongGenres = useMemo(() => {
    if (!genreSearch.trim()) return songGenres;
    const keyword = genreSearch.trim().toLowerCase();
    return songGenres.filter((sg) => sg.genreName.toLowerCase().includes(keyword));
  }, [songGenres, genreSearch]);

  const filteredSongMoods = useMemo(() => {
    if (!moodSearch.trim()) return songMoods;
    const keyword = moodSearch.trim().toLowerCase();
    return songMoods.filter((sm) => sm.moodName.toLowerCase().includes(keyword));
  }, [songMoods, moodSearch]);


  const selectedMood = useMemo(
    () => (newMoodId ? allMoods.find((mood) => mood.id === newMoodId) : undefined),
    [allMoods, newMoodId]
  );

  const selectedArtist = useMemo(
    () => (newContributorArtistId ? allArtists.find((artist) => artist.id === newContributorArtistId) : undefined),
    [allArtists, newContributorArtistId]
  );

  const albumName = useMemo(() => {
    if (!songData) return null;
    if (typeof songData.album === "string" && songData.album) return songData.album;
    if (songData.album && typeof songData.album === "object" && "name" in songData.album) {
      return songData.album.name as string;
    }
    if (songData.albumName) return songData.albumName;
    return null;
  }, [songData]);

  const artistLookup = useMemo(() => {
    const map = new Map<number, { id: number; name: string; avatar?: string }>();
    allArtists.forEach((artist) => map.set(artist.id, artist));
    return map;
  }, [allArtists]);

  const form = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: "",
      releaseYear: new Date().getFullYear(),
      duration: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (!open) {
      setShowAddContributor(false);
      setShowAddGenre(false);
      setShowAddMood(false);
      setNewContributorArtistId(null);
      setArtistPickerOpen(false);
      setNewGenreId(null);
      setGenrePickerOpen(false);
      setNewGenreScore("1.0");
      setNewMoodId(null);
      setMoodPickerOpen(false);
      setNewMoodScore("1.0");
      setGenreSearch("");
      setMoodSearch("");
      setEditingGenreId(null);
      setGenreScoreDraft("");
      setEditingMoodId(null);
      setMoodScoreDraft("");
      setIsSavingGenre(false);
      setIsSavingMood(false);
    }
  }, [open]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [song, contributorsData, genresData, moodsData, artistsData, genresList, moodsList] = await Promise.all([
        songsApi.getById(String(songId)),
        songContributorApi.getBySong(songId),
        songGenreApi.getBySong(songId),
        songMoodApi.getBySong(songId),
        artistsApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
        genresApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
        moodsApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
      ]);

      if (song) {
        setSongData(song);
        form.reset({
          name: song.name || "",
          releaseYear: song.releaseYear || new Date().getFullYear(),
          duration: song.duration !== undefined && song.duration !== null ? String(song.duration) : "",
          status: (song.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
        });
      }

      setContributors(toArray<SongContributor>(contributorsData));
      setSongGenres(toArray<SongGenre>(genresData));
      setSongMoods(toArray<SongMood>(moodsData));
      setAllArtists(toArray(artistsData));
      setAllGenres(toArray(genresList));
      setAllMoods(toArray(moodsList));
      setEditingGenreId(null);
      setGenreScoreDraft("");
      setEditingMoodId(null);
      setMoodScoreDraft("");
      setNewGenreScore("1.0");
      setNewMoodScore("1.0");
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu bài hát",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, songId]);

  // Load song data and related data
  useEffect(() => {
    if (open && songId) {
      loadData();
      setActiveTab(initialTab === "genre" || initialTab === "mood" ? "genre-mood" : initialTab);
    }
  }, [open, songId, initialTab, loadData]);

  const handleSaveMetadata = async (data: MetadataFormValues) => {
    try {
      setIsLoading(true);
      const updateData: SongMetadataUpdate = {
        name: data.name,
        releaseYear: data.releaseYear,
        status: data.status,
      };
      if (data.duration) updateData.duration = data.duration;

      console.log("📝 Updating song metadata:", updateData);
      console.log("📝 Status value:", updateData.status);

      if (selectedFile) {
        updateData.file = selectedFile;
        await songsApi.updateWithFile(String(songId), updateData as SongCreateUpdateData);
      } else {
        await songsApi.update(String(songId), updateData as SongCreateUpdateData);
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật metadata bài hát",
      });
      await loadData();
      onSuccess?.();
    } catch (error) {
      console.error("Error updating metadata:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật metadata",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContributor = async () => {
    if (!newContributorArtistId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn nghệ sĩ",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await songContributorApi.add(songId, newContributorArtistId, newContributorRole);
      toast({
        title: "Thành công",
        description: "Đã thêm contributor",
      });
      setShowAddContributor(false);
      setNewContributorArtistId(null);
      setArtistPickerOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error adding contributor:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể thêm contributor"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveContributor = async (contributorId: number) => {
    try {
      setIsLoading(true);
      await songContributorApi.remove(contributorId, songId);
      toast({
        title: "Thành công",
        description: "Đã xóa contributor",
      });
      await loadData();
    } catch (error) {
      console.error("Error removing contributor:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa contributor"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGenre = async () => {
    if (!newGenreId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn thể loại",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const score = parseFloat(newGenreScore);
      await songGenreApi.add(songId, newGenreId, Number.isFinite(score) ? score : 1.0);
      toast({
        title: "Thành công",
        description: "Đã thêm genre mới vào bài hát",
      });
      setNewGenreId(null);
      setNewGenreScore("1.0");
      setGenrePickerOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error adding genre:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể thêm thể loại"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGenre = async (songGenreId: number, score: number) => {
    try {
      setIsLoading(true);
      setIsSavingGenre(true);
      await songGenreApi.update(songGenreId, score);
      toast({
        title: "Thành công",
        description: "Đã cập nhật thể loại",
      });
      setEditingGenreId(null);
      setGenreScoreDraft("");
      await loadData();
    } catch (error) {
      console.error("Error updating genre:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thể loại",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSavingGenre(false);
    }
  };

  const handleRemoveGenre = async (songGenreId: number) => {
    try {
      setIsLoading(true);
      await songGenreApi.remove(songGenreId, songId);
      toast({
        title: "Thành công",
        description: "Đã xóa thể loại",
      });
      await loadData();
    } catch (error) {
      console.error("Error removing genre:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa thể loại"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMood = async () => {
    if (!newMoodId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn mood",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const score = parseFloat(newMoodScore);
      await songMoodApi.add(songId, newMoodId, Number.isFinite(score) ? score : 1.0);
      toast({
        title: "Thành công",
        description: "Đã thêm mood mới vào bài hát",
      });
      setNewMoodId(null);
      setNewMoodScore("1.0");
      setMoodPickerOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error adding mood:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể thêm mood"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMood = async (songMoodId: number, score: number) => {
    try {
      setIsLoading(true);
      setIsSavingMood(true);
      await songMoodApi.update(songMoodId, score);
      toast({
        title: "Thành công",
        description: "Đã cập nhật mood",
      });
      setEditingMoodId(null);
      setMoodScoreDraft("");
      await loadData();
    } catch (error) {
      console.error("Error updating mood:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật mood",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSavingMood(false);
    }
  };

  const handleRemoveMood = async (songMoodId: number) => {
    try {
      setIsLoading(true);
      await songMoodApi.remove(songMoodId, songId);
      toast({
        title: "Thành công",
        description: "Đã xóa mood",
      });
      await loadData();
    } catch (error) {
      console.error("Error removing mood:", error);
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xóa mood"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "contributor") {
        await handleRemoveContributor(deleteConfirm.id);
      } else if (deleteConfirm.type === "genre") {
        await handleRemoveGenre(deleteConfirm.id);
      } else if (deleteConfirm.type === "mood") {
        await handleRemoveMood(deleteConfirm.id);
      }
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang xử lý...</p>
            </div>
          </div>
        )}

        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            Chỉnh sửa bài hát
          </DialogTitle>
          <DialogDescription>
            Quản lý metadata, contributors, genres và moods của bài hát
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "metadata" | "contributor" | "genre-mood")
          }
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-6 mt-4 mb-0">
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="contributor">Contributor</TabsTrigger>
            <TabsTrigger value="genre-mood">Genre và Mood</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Metadata Tab */}
            <TabsContent value="metadata" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveMetadata)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ID - Read only */}
                    <FormItem>
                      <FormLabel>ID</FormLabel>
                      <Input 
                        value={songData?.id || ""} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>

                    {/* Name - Editable */}
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

                    {/* Release Year - Editable */}
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

                    {/* Status - Editable */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trạng thái</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Duration - Read only */}
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
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Play Count - Read only */}
                    <FormItem>
                      <FormLabel>Lượt phát</FormLabel>
                      <Input 
                        value={songData?.playCount?.toLocaleString() || "0"} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>

                    {/* Album - Read only */}
                    <FormItem>
                      <FormLabel>Album</FormLabel>
                      <Input 
                        value={albumName || "Chưa có album"} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>

                    {/* UUID - Read only display */}
                    <FormItem>
                      <FormLabel>UUID (S3)</FormLabel>
                      <Input 
                        value={songData?.uuid ? (songData.uuid.length > 60 ? songData.uuid.substring(0, 60) + "..." : songData.uuid) : "Chưa có"} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>

                    {/* ACR ID with Check button */}
                    <FormItem>
                      <FormLabel>ACR ID (Fingerprint)</FormLabel>
                      <div className="flex gap-2">
                        <Input 
                          value={songData?.acrId || ""} 
                          disabled 
                          className="bg-muted flex-1"
                          placeholder="Chưa có ACR ID"
                        />
                        {songData?.acrId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!songData?.acrId) return;
                              setCheckingFingerprint(true);
                              try {
                                const url = `${API_BASE_URL}/songs/test/acr/check?acr_id=${encodeURIComponent(songData.acrId)}`;
                                const response = await fetchWithAuth(url, {
                                  method: 'GET',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (!response.ok) {
                                  const errorText = await response.text();
                                  throw new Error(errorText || `HTTP ${response.status}`);
                                }
                                
                                const data = await response.json();
                                if (data.success) {
                                  setFingerprintStatus(data.state);
                                  if (data.state === 1) {
                                    toast({
                                      title: "✅ Fingerprint Ready",
                                      description: "Fingerprint đã sẵn sàng",
                                    });
                                  } else if (data.state === 0) {
                                    toast({
                                      title: "⏳ Đang xử lý",
                                      description: "Fingerprint đang được xử lý",
                                    });
                                  } else if (data.state === -1) {
                                    toast({
                                      title: "❌ Lỗi",
                                      description: "Fingerprint gặp lỗi",
                                      variant: "destructive",
                                    });
                                  }
                                } else {
                                  toast({
                                    title: "Lỗi",
                                    description: data.message || data.error || "Không thể kiểm tra fingerprint",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                console.error("[SongEditDialog] Check fingerprint error:", error);
                                const errorMessage = error instanceof Error ? error.message : "Không thể kiểm tra fingerprint. Vui lòng thử lại.";
                                toast({
                                  title: "Lỗi",
                                  description: errorMessage,
                                  variant: "destructive",
                                });
                              } finally {
                                setCheckingFingerprint(false);
                              }
                            }}
                            disabled={checkingFingerprint || !songData?.acrId}
                          >
                            {checkingFingerprint ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang check...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Check
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {fingerprintStatus !== null && (
                        <div className="mt-2">
                          {fingerprintStatus === 1 ? (
                            <div className="flex items-center gap-2 text-green-600 font-semibold">
                              <span className="text-xl">✅</span>
                              <span>Ready - Fingerprint đã sẵn sàng</span>
                            </div>
                          ) : fingerprintStatus === 0 ? (
                            <div className="flex items-center gap-2 text-yellow-600">
                              <span className="text-xl">⏳</span>
                              <span>Đang xử lý (Processing)</span>
                            </div>
                          ) : fingerprintStatus === -1 || fingerprintStatus === -999 ? (
                            <div className="flex items-center gap-2 text-red-600">
                              <span className="text-xl">❌</span>
                              <span>Lỗi (Error) - Fingerprint đang hư</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <span className="text-xl">❌</span>
                              <span>Lỗi - Unknown status ({fingerprintStatus})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </FormItem>

                    {/* Created At - Read only */}
                    <FormItem>
                      <FormLabel>Ngày tạo</FormLabel>
                      <Input 
                        value={songData?.createdAt ? new Date(songData.createdAt).toLocaleString("vi-VN") : "N/A"} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>

                    {/* Updated At - Read only */}
                    <FormItem>
                      <FormLabel>Ngày cập nhật</FormLabel>
                      <Input 
                        value={songData?.updatedAt ? new Date(songData.updatedAt).toLocaleString("vi-VN") : "N/A"} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>
                  </div>

                  {/* File Upload - Full width */}
                  <FormItem>
                    <FormLabel>Upload file nhạc mới (chỉ upload khi cần thay đổi)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setSelectedFile(file || null);
                        }}
                        disabled={uploading}
                      />
                    </FormControl>
                    {selectedFile && (
                      <div className="text-sm text-muted-foreground">
                        File đã chọn: {selectedFile.name}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      size="sm"
                      className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                    >
                      {isLoading ? "Đang lưu..." : "Lưu metadata"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Contributor Tab */}
            <TabsContent value="contributor" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Contributors</h3>
                  <p className="text-sm text-muted-foreground">
                    Nhóm theo vai trò để quản lý dễ hơn
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setShowAddContributor((prev) => {
                      if (prev) {
                        setNewContributorArtistId(null);
                        setArtistPickerOpen(false);
                      }
                      return !prev;
                    })
                  }
                  size="sm"
                  className={cn(
                    "gap-2",
                    showAddContributor 
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  {showAddContributor ? "Đóng form" : "Thêm Contributor"}
                </Button>
              </div>

              {showAddContributor && (
                <div className="rounded-xl border bg-muted/40 p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select value={newContributorRole} onValueChange={setNewContributorRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Nghệ sĩ</label>
                      <Popover open={artistPickerOpen} onOpenChange={setArtistPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !newContributorArtistId && "text-muted-foreground"
                            )}
                          >
                            {newContributorArtistId
                              ? selectedArtist?.name || "Chọn nghệ sĩ"
                              : "Tìm và chọn nghệ sĩ"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <Command>
                            <CommandInput placeholder="Tìm nghệ sĩ..." />
                            <CommandEmpty>Không tìm thấy nghệ sĩ.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {allArtists.map((artist) => (
                                  <CommandItem
                                    key={artist.id}
                                    value={artist.id.toString()}
                                    onSelect={(value) => {
                                      setNewContributorArtistId(Number(value));
                                      setArtistPickerOpen(false);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4",
                                        newContributorArtistId === artist.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {artist.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      onClick={handleAddContributor} 
                      size="sm"
                      className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                    >
                      Thêm
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddContributor(false);
                        setNewContributorArtistId(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Hủy
                    </Button>
                    {newContributorArtistId && (
                      <span className="text-sm text-muted-foreground">
                        Đã chọn: {selectedArtist?.name}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {roleSections.map((role) => {
                  const label = ROLE_LABELS[role] || role;
                  const roleContributors = contributorGroups[role] || [];
                  return (
                    <div key={role} className="rounded-xl border bg-card">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="font-semibold">{label}</div>
                        <Badge variant="secondary">{roleContributors.length}</Badge>
                      </div>
                      <div className="px-4 py-4">
                        {roleContributors.length ? (
                          <div className="space-y-3">
                            {roleContributors.map((contributor) => {
                              const artistMeta = artistLookup.get(contributor.artistId);
                              const displayName = artistMeta?.name || contributor.artistName;
                              const displayInitial = (displayName || "-").charAt(0).toUpperCase();
                              return (
                                <div
                                  key={contributor.id}
                                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 shadow-sm transition hover:shadow-md"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border">
                                      {artistMeta?.avatar ? (
                                        <AvatarImage src={artistMeta.avatar} alt={displayName} />
                                      ) : null}
                                      <AvatarFallback>{displayInitial}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="font-medium leading-tight">{displayName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {ROLE_LABELS[contributor.role] || contributor.role}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setDeleteConfirm({
                                          type: "contributor",
                                          id: contributor.id,
                                          name: displayName,
                                        })
                                      }
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">
                            Chưa có nghệ sĩ cho vai trò này
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Genre và Mood Tab */}
            <TabsContent value="genre-mood" className="mt-4 space-y-6">
              {/* Genre Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Genres</h3>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm genre..."
                      className="pl-9"
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                    />
                  </div>
                </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Genre</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSongGenres.map((sg) => (
                    <TableRow key={sg.id}>
                      <TableCell>{sg.genreName}</TableCell>
                      <TableCell>
                        {editingGenreId === sg.id ? (
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={genreScoreDraft}
                            onChange={(e) => setGenreScoreDraft(e.target.value)}
                            onBlur={() => {
                              // 如果正在保存，不恢复旧值
                              if (!isSavingGenre) {
                                setGenreScoreDraft(sg.score.toString());
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const parsed = parseFloat(genreScoreDraft);
                                const newScore = Number.isFinite(parsed) ? parsed : sg.score;
                                handleUpdateGenre(sg.id, newScore);
                              }
                            }}
                            className="w-24"
                          />
                        ) : (
                          <span>{sg.score}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingGenreId === sg.id ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // 防止输入框失去焦点
                                  setIsSavingGenre(true);
                                }}
                                onClick={() => {
                                  const parsed = parseFloat(genreScoreDraft);
                                  const newScore = Number.isFinite(parsed) ? parsed : sg.score;
                                  handleUpdateGenre(sg.id, newScore);
                                  setIsSavingGenre(false);
                                }}
                                disabled={isLoading}
                              >
                                Lưu
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  setEditingGenreId(null);
                                  setGenreScoreDraft("");
                                }}
                                disabled={isLoading}
                              >
                                Hủy
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingGenreId(sg.id);
                                setGenreScoreDraft(sg.score.toString());
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm({ type: "genre", id: sg.id, name: sg.genreName })}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSongGenres.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {songGenres.length === 0 ? "Chưa có genre nào" : "Không tìm thấy genre phù hợp"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {!showAddGenre && (
                <div className="flex justify-start">
                  <Button
                    onClick={() => {
                      setShowAddGenre(true);
                      setNewGenreId(null);
                      setNewGenreScore("1.0");
                      setGenrePickerOpen(false);
                    }}
                    variant="default"
                    className={cn(
                      "gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90",
                      "border border-[hsl(var(--admin-border))]"
                    )}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm genre mới
                  </Button>
                </div>
              )}

              {showAddGenre && (
                <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-muted/20 p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[220px] flex-1 space-y-2">
                      <label className="text-sm font-medium">Genre</label>
                      <Popover open={genrePickerOpen} onOpenChange={setGenrePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !selectedGenre && "text-muted-foreground"
                            )}
                          >
                            {selectedGenre ? selectedGenre.name : "Select genre"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Tìm genre..." />
                            <CommandEmpty>Không tìm thấy genre.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {allGenres.map((genre) => (
                                  <CommandItem
                                    key={genre.id}
                                    value={genre.id.toString()}
                                    onSelect={(value) => {
                                      setNewGenreId(Number(value));
                                      setGenrePickerOpen(false);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4",
                                        newGenreId === genre.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {genre.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="w-[140px] space-y-2">
                      <label className="text-sm font-medium">Score</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={newGenreScore}
                        onChange={(e) => setNewGenreScore(e.target.value)}
                        placeholder="1.0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleAddGenre}
                        size="sm"
                        className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                      >
                        Lưu
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddGenre(false);
                          setNewGenreId(null);
                          setNewGenreScore("1.0");
                          setGenrePickerOpen(false);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                  {!selectedGenre && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chọn 1 genre và nhập score trong khoảng 0.0 - 1.0
                    </p>
                  )}
                </div>
              )}
              </div>

              {/* Mood Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Moods</h3>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm mood..."
                      className="pl-9"
                      value={moodSearch}
                      onChange={(e) => setMoodSearch(e.target.value)}
                    />
                  </div>
                </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mood</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSongMoods.map((sm) => (
                    <TableRow key={sm.id}>
                      <TableCell>{sm.moodName}</TableCell>
                      <TableCell>
                        {editingMoodId === sm.id ? (
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={moodScoreDraft}
                            onChange={(e) => setMoodScoreDraft(e.target.value)}
                            onBlur={() => {
                              // 如果正在保存，不恢复旧值
                              if (!isSavingMood) {
                                setMoodScoreDraft(sm.score.toString());
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const parsed = parseFloat(moodScoreDraft);
                                const newScore = Number.isFinite(parsed) ? parsed : sm.score;
                                handleUpdateMood(sm.id, newScore);
                              }
                            }}
                            className="w-24"
                          />
                        ) : (
                          <span>{sm.score}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingMoodId === sm.id ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // 防止输入框失去焦点
                                  setIsSavingMood(true);
                                }}
                                onClick={() => {
                                  const parsed = parseFloat(moodScoreDraft);
                                  const newScore = Number.isFinite(parsed) ? parsed : sm.score;
                                  handleUpdateMood(sm.id, newScore);
                                  setIsSavingMood(false);
                                }}
                                disabled={isLoading}
                              >
                                Lưu
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  setEditingMoodId(null);
                                  setMoodScoreDraft("");
                                }}
                                disabled={isLoading}
                              >
                                Hủy
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingMoodId(sm.id);
                                setMoodScoreDraft(sm.score.toString());
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm({ type: "mood", id: sm.id, name: sm.moodName })}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSongMoods.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {songMoods.length === 0 ? "Chưa có mood nào" : "Không tìm thấy mood phù hợp"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {!showAddMood && (
                <div className="flex justify-start">
                  <Button
                    onClick={() => {
                      setShowAddMood(true);
                      setNewMoodId(null);
                      setNewMoodScore("1.0");
                      setMoodPickerOpen(false);
                    }}
                    variant="default"
                    className={cn(
                      "gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90",
                      "border border-[hsl(var(--admin-border))]"
                    )}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm mood mới
                  </Button>
                </div>
              )}

              {showAddMood && (
                <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-muted/20 p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[220px] flex-1 space-y-2">
                      <label className="text-sm font-medium">Mood</label>
                      <Popover open={moodPickerOpen} onOpenChange={setMoodPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !selectedMood && "text-muted-foreground")}
                          >
                            {selectedMood ? selectedMood.name : "Select mood"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Tìm mood..." />
                            <CommandEmpty>Không tìm thấy mood.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {allMoods.map((mood) => (
                                  <CommandItem
                                    key={mood.id}
                                    value={mood.id.toString()}
                                    onSelect={(value) => {
                                      setNewMoodId(Number(value));
                                      setMoodPickerOpen(false);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4",
                                        newMoodId === mood.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {mood.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="w-[140px] space-y-2">
                      <label className="text-sm font-medium">Score</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={newMoodScore}
                        onChange={(e) => setNewMoodScore(e.target.value)}
                        placeholder="1.0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleAddMood}
                        size="sm"
                        className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))]/90"
                      >
                        Lưu
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddMood(false);
                          setNewMoodId(null);
                          setNewMoodScore("1.0");
                          setMoodPickerOpen(false);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                  {!selectedMood && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chọn 1 mood và nhập score trong khoảng 0.0 - 1.0
                    </p>
                  )}
                </div>
              )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {deleteConfirm?.type === "contributor" ? "contributor" : deleteConfirm?.type === "genre" ? "genre" : "mood"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa "{deleteConfirm?.name}" khỏi bài hát? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default SongEditDialog;

