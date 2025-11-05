import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMusic } from "@/contexts/MusicContext";
import {
  Play,
  Pause,
  Pencil,
  Trash2,
  Plus,
  Search,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Music,
} from "lucide-react";
import { SongFormDialog } from "@/components/admin/SongFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { songsApi, artistsApi, genresApi, moodsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { debounce, formatPlayCount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_AVATAR_URL =
  "https://res-console.cloudinary.com/dhylbhwvb/thumbnails/v1/image/upload/v1759805930/eG5vYjR5cHBjbGhzY2VrY3NzNWU";

const AdminSongs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [songsList, setSongsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentSong, isPlaying, playSong, togglePlay, setQueue } = useMusic();
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedArtistId, setSelectedArtistId] = useState<number | undefined>();
  const [selectedGenreId, setSelectedGenreId] = useState<number | undefined>();
  const [selectedMoodId, setSelectedMoodId] = useState<number | undefined>();
  const [artists, setArtists] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFilterData = async () => {
    try {
      const [artistsData, genresData, moodsData] = await Promise.all([
        artistsApi.getAll({ page: 0, size: 1000 }),
        genresApi.getAll({ page: 0, size: 1000 }),
        moodsApi.getAll({ page: 0, size: 1000 }),
      ]);

      setArtists(artistsData.content || []);
      setGenres(genresData.content || []);
      setMoods(moodsData.content || []);
    } catch (error) {
      console.error("Error loading filter data:", error);
    }
  };

  const loadSongs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await songsApi.getAll({
        page: currentPage,
        size: pageSize,
        sort: "name,asc",
        search: searchQuery || undefined,
        artistId: selectedArtistId,
        genreId: selectedGenreId,
        moodId: selectedMoodId,
      });
      setSongsList(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách bài hát",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedArtistId, selectedGenreId, selectedMoodId]);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  useEffect(() => {
    loadFilterData();
  }, []);

  const handleCreate = () => {
    setFormMode("create");
    setSelectedSong(null);
    setFormOpen(true);
  };

  const handleEdit = (song: any) => {
    setFormMode("edit");
    setSelectedSong(song);
    setFormOpen(true);
  };

  const handleDeleteClick = (song: any) => {
    setSelectedSong(song);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (formMode === "create") {
        await songsApi.create(data);
      } else {
        if (data.file) {
          // console.log('cái dkmm')
          await songsApi.updateWithFile(String(selectedSong.id), data);
        } else {
          await songsApi.update(String(selectedSong.id), data);
        }
      }

      toast({
        title: "Thành công",
        description:
          formMode === "create" ? "Đã tạo bài hát mới" : "Đã cập nhật bài hát",
      });
      setFormOpen(false);
      loadSongs();
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu bài hát",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await songsApi.delete(selectedSong.id);
      toast({ title: "Thành công", description: "Đã xóa bài hát" });
      setDeleteOpen(false);
      loadSongs();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa bài hát",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Warn user before closing/reloading tab while submitting (e.g., uploading file)
  useEffect(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
  }, [isSubmitting]);

  const handleExport = async () => {
    try {
      await songsApi.exportExcel();
      toast({ title: "Thành công", description: "Xuất file Excel thành công" });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Lỗi khi xuất file Excel",
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file Excel (.xlsx hoặc .xls)",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await songsApi.importExcel(file);
      toast({ title: "Thành công", description: result });
      loadSongs();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Lỗi khi nhập file Excel",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePlayClick = (song: any) => {
    const playableSongs = songsList.map(s => ({
      ...s,
      audio: s.audioUrl,
      artist: s.artists?.map((a: any) => a.name).join(", ") || "Unknown",
      genre: s.genres?.[0]?.name || "Unknown",
    }));

    const playableSong = playableSongs.find(s => s.id === song.id);

    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setQueue(playableSongs);
      playSong(playableSong);
    }
  };

  const goToPage = (page: number) => setCurrentPage(page);
  const goToFirstPage = () => setCurrentPage(0);
  const goToLastPage = () => setCurrentPage(totalPages - 1);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(0, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages)
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section with Modern Design */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">
                Quản lý Bài hát
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">
                  {totalElements} bài hát
                </Badge>
                {loading && <span className="text-xs">Đang tải...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />

            {/* Export Button */}
            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>

            {/* Import Button */}
            <Button
              variant="outline"
              onClick={handleImportClick}
              disabled={isSubmitting}
              className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>

            {/* Add Song Button */}
            <Button
              onClick={handleCreate}
              className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Thêm bài hát
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-lg flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="border-b bg-gradient-to-r from-background to-muted/20 flex-shrink-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl font-bold">Songs Directory</CardTitle>
                  <CardDescription>Manage and organize your music library</CardDescription>
                </div>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or artist..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
              {/* Filter Dropdowns */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Artist:</label>
                  <Select
                    value={selectedArtistId?.toString() || "all"}
                    onValueChange={(value) => {
                      setSelectedArtistId(value === "all" ? undefined : Number(value));
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All artists" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All artists</SelectItem>
                      {artists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id.toString()}>
                          {artist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Genre:</label>
                  <Select
                    value={selectedGenreId?.toString() || "all"}
                    onValueChange={(value) => {
                      setSelectedGenreId(value === "all" ? undefined : Number(value));
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genres</SelectItem>
                      {genres.map((genre) => (
                        <SelectItem key={genre.id} value={genre.id.toString()}>
                          {genre.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Mood:</label>
                  <Select
                    value={selectedMoodId?.toString() || "all"}
                    onValueChange={(value) => {
                      setSelectedMoodId(value === "all" ? undefined : Number(value));
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All moods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All moods</SelectItem>
                      {moods.map((mood) => (
                        <SelectItem key={mood.id} value={mood.id.toString()}>
                          {mood.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedArtistId(undefined);
                    setSelectedGenreId(undefined);
                    setSelectedMoodId(undefined);
                    setCurrentPage(0);
                  }}
                  className="gap-2"
                >
                  Clear Filters
                </Button>

                <Badge variant="secondary">
                  {totalElements} songs
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : songsList.length === 0 ? (
              <div className="text-center py-8">
                {searchQuery
                  ? "Không tìm thấy bài hát phù hợp"
                  : "Chưa có bài hát nào"}
              </div>
            ) : (
              <>
                {/* Fixed Header */}
                <div className="flex-shrink-0 border-b-2 border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr>
                        <th className="w-16 text-center text-sm font-medium text-muted-foreground p-3">STT</th>
                        <th className="w-12 text-left text-sm font-medium text-muted-foreground p-3"></th>
                        <th className="w-64 text-left text-sm font-medium text-muted-foreground p-3">Bài hát</th>
                        <th className="w-48 text-left text-sm font-medium text-muted-foreground p-3">Nghệ sĩ</th>
                        <th className="w-32 text-left text-sm font-medium text-muted-foreground p-3">Năm phát hành</th>
                        <th className="w-56 text-left text-sm font-medium text-muted-foreground p-3">Thể loại</th>
                        <th className="w-28 text-left text-sm font-medium text-muted-foreground p-3">Lượt nghe</th>
                        <th className="w-28 text-right text-sm font-medium text-muted-foreground p-3">Hành động</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
                  <table className="w-full table-fixed">
                    <tbody>
                      {songsList.map((song, index) => (
                        <tr key={song.id} className="border-b border-border hover:bg-muted/50">
                          <td className="w-16 text-center p-3">
                            {currentPage * pageSize + index + 1}
                          </td>
                          <td className="w-12 p-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePlayClick(song)}
                              className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors"
                            >
                              {currentSong?.id === song.id && isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                          <td className="w-64 p-3">
                            <div className="flex items-center gap-3">
                              <span className="font-medium truncate">{song.name}</span>
                            </div>
                          </td>
                          <td className="w-48 p-3 truncate">
                            {song.artists?.map((a: any) => a.name).join(", ") ||
                              "—"}
                          </td>
                          <td className="w-32 p-3">{song.releaseYear || "—"}</td>
                          <td className="w-56 p-3">
                            <div className="flex flex-wrap gap-1">
                              {song.genres?.map((g: any) => (
                                <span
                                  key={g.id}
                                  className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                                >
                                  {g.name}
                                </span>
                              )) || "—"}
                            </div>
                          </td>
                          <td className="w-28 text-center p-3">
                            <div className="flex flex-wrap gap-1">
                              {formatPlayCount(song.playCount || 0)}
                            </div>
                          </td>
                          <td className="w-28 text-right p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(song)}
                                className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(song)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination outside of scrollable area */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Hiển thị {songsList.length} trên tổng số {totalElements} bài hát
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={goToFirstPage}
                disabled={currentPage === 0}
                className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
                className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map((page) => (
                <Button
                  key={page}
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(page)}
                  className={`h-8 w-8 border-[hsl(var(--admin-border))] ${currentPage === page
                    ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]"
                    : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                    }`}
                >
                  {page + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages - 1}
                className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToLastPage}
                disabled={currentPage >= totalPages - 1}
                className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <SongFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedSong}
        isLoading={isSubmitting}
        mode={formMode}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Xóa bài hát?"
        description={`Bạn có chắc muốn xóa bài hát "${selectedSong?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>



  );
};

export default AdminSongs;
