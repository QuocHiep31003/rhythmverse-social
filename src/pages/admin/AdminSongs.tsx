import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
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
import { SongEditDialog } from "@/components/admin/SongEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { songsApi, genresApi, moodsApi, songGenreApi, songMoodApi } from "@/services/api";
import type { Song } from "@/services/api/songApi";
import { toast } from "@/hooks/use-toast";
import { debounce } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminSongs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [songsList, setSongsList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedGenreId, setSelectedGenreId] = useState<number | undefined>();
  const [selectedMoodId, setSelectedMoodId] = useState<number | undefined>();
  const [genres, setGenres] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<string>("name,asc");
  const [editTab, setEditTab] = useState<"metadata" | "contributor" | "genre" | "mood">("metadata");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: "Active" },
      { value: "PENDING_RELEASE", label: "Pending Release" },
      { value: "INACTIVE", label: "Inactive" },
    ],
    []
  );

  const getArtistsDisplay = (song: Song): string => {
    if (typeof song.artists === "string" && song.artists.trim()) {
      return song.artists.trim();
    }
    if (Array.isArray(song.performers) && song.performers.length > 0) {
      return song.performers.map((artist) => artist.name).filter(Boolean).join(", ");
    }
    if (Array.isArray(song.artists) && song.artists.length > 0) {
      return song.artists.map((artist) => artist.name).filter(Boolean).join(", ");
    }
    if (Array.isArray(song.artistNames) && song.artistNames.length > 0) {
      return song.artistNames.filter(Boolean).join(", ");
    }
    return "";
  };

  const loadFilterData = async () => {
    try {
      const [genresData, moodsData] = await Promise.all([
        genresApi.getAll({ page: 0, size: 1000 }),
        moodsApi.getAll({ page: 0, size: 1000 }),
      ]);

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
        sort: sortBy,
        search: searchQuery || undefined,
        genreId: selectedGenreId,
        moodId: selectedMoodId,
        status: selectedStatus,
      });
      setSongsList(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load songs list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedGenreId, selectedMoodId, selectedStatus, sortBy]);

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

  const handleEdit = (song: Song, tab?: "metadata" | "contributor" | "genre" | "mood") => {
    setFormMode("edit");
    setSelectedSong(song);
    setEditTab(tab || "metadata");
    setFormOpen(true);
  };

  const handleDeleteClick = (song: Song) => {
    setSelectedSong(song);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any, genreScores?: Map<number, number>, moodScores?: Map<number, number>) => {
    setIsSubmitting(true);
    try {
      if (formMode === "create") {
        toast({
          title: "Uploading and processing audio",
          description: "Uploading to S3, creating HLS and syncing ACR may take 1-2 minutes. Please keep this page open.",
          duration: 60000,
        });
      }

      if (formMode === "create") {
        // Create song without genreIds and moodIds first, then add them with scores
        const { genreIds, moodIds, file, ...songData } = data;
        let createdSong: Song | undefined;

        if (!file) {
          toast({
            title: "Missing audio file",
            description: "Please select an audio file before creating a new song.",
            variant: "destructive",
          });
          return;
        }

        createdSong = await songsApi.createWithFile({
          ...songData,
          genreIds,
          moodIds,
          file,
        });
        
        // Add genres with scores after song is created
        if (createdSong && createdSong.id && genreIds && genreIds.length > 0) {
          for (const genreId of genreIds) {
            const score = genreScores?.get(genreId) || 1.0;
            try {
              await songGenreApi.add(Number(createdSong.id), genreId, score);
            } catch (error) {
              console.error(`Error adding genre ${genreId} with score ${score}:`, error);
            }
          }
        }
        
        // Add moods with scores after song is created
        if (createdSong && createdSong.id && moodIds && moodIds.length > 0) {
          for (const moodId of moodIds) {
            const score = moodScores?.get(moodId) || 1.0;
            try {
              await songMoodApi.add(Number(createdSong.id), moodId, score);
            } catch (error) {
              console.error(`Error adding mood ${moodId} with score ${score}:`, error);
            }
          }
        }
      } else if (selectedSong) {
        if (data.file) {
          await songsApi.updateWithFile(String(selectedSong.id), data);
        } else {
          await songsApi.update(String(selectedSong.id), data);
        }
      } else {
        throw new Error("Could not identify the song to update");
      }

      toast({
        title: "Success",
        description:
          formMode === "create" ? "Song created successfully" : "Song updated successfully",
      });
      setFormOpen(false);
      loadSongs();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save song",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      if (!selectedSong) return;
      await songsApi.delete(String(selectedSong.id));
      toast({ title: "Success", description: "Song deleted successfully" });
      setDeleteOpen(false);
      loadSongs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete song",
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
      toast({ title: "Success", description: "Excel file exported successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export Excel file",
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
        title: "Error",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await songsApi.importExcel(file);
      toast({ title: "Success", description: result });
      loadSongs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import Excel file",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                Song Management
              </h1>
              <div className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">
                  {totalElements} songs
                </Badge>
                {loading && <span className="text-xs">Loading...</span>}
              </div>
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
              Add Song
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

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Status:</label>
                  <Select
                    value={selectedStatus || "all"}
                    onValueChange={(value) => {
                      setSelectedStatus(value === "all" ? undefined : value);
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Sắp xếp:</label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value);
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name,asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name,desc">Name (Z-A)</SelectItem>
                      <SelectItem value="createdAt,desc">Date created (Newest)</SelectItem>
                      <SelectItem value="createdAt,asc">Date created (Oldest)</SelectItem>
                      <SelectItem value="releaseYear,desc">Release year (Newest)</SelectItem>
                      <SelectItem value="releaseYear,asc">Release year (Oldest)</SelectItem>
                      <SelectItem value="updatedAt,desc">Date modified (Newest)</SelectItem>
                      <SelectItem value="updatedAt,asc">Date modified (Oldest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedGenreId(undefined);
                    setSelectedMoodId(undefined);
                    setSelectedStatus(undefined);
                    setSortBy("name,asc");
                    setCurrentPage(0);
                  }}
                  className="gap-2"
                >
                  Clear Filters
                </Button>

                <Badge variant="secondary">
                  {totalElements} bài hát
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : songsList.length === 0 ? (
              <div className="text-center py-8">
                {searchQuery
                  ? "No songs found"
                  : "No songs yet"}
              </div>
            ) : (
              <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin rounded-b-lg">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--admin-card))] border-b border-border/70">
                    <TableRow>
                      <TableHead className="w-16 text-center text-sm font-medium text-muted-foreground">
                        #
                      </TableHead>
                      <TableHead className="w-1/2 text-sm font-medium text-muted-foreground">
                        Song
                      </TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">
                        Artist
                      </TableHead>
                      <TableHead className="w-28 text-center text-sm font-medium text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="w-24 text-right text-sm font-medium text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {songsList.map((song, index) => (
                      <TableRow key={song.id} className="border-border/60 hover:bg-muted/50">
                        <TableCell className="text-center">
                          {currentPage * pageSize + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{song.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {song.releaseYear ? `Release year: ${song.releaseYear}` : "Unknown"}
                              {song.duration ? ` • ${song.duration}` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getArtistsDisplay(song) || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              song.status === "INACTIVE"
                                ? "bg-muted text-muted-foreground border border-dashed"
                                : song.status === "PENDING_RELEASE"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/40"
                                : "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))]"
                            }
                          >
                            {song.status === "INACTIVE"
                              ? "Inactive"
                              : song.status === "PENDING_RELEASE"
                              ? "Pending Release"
                              : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination outside of scrollable area */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Showing {songsList.length} of {totalElements} songs
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
      {formMode === "edit" && selectedSong ? (
        <SongEditDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          songId={Number(selectedSong.id)}
          initialTab={editTab}
          onSuccess={() => {
            setFormOpen(false);
            loadSongs();
          }}
        />
      ) : (
        <SongFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleFormSubmit}
          defaultValues={selectedSong}
          isLoading={isSubmitting}
          mode={formMode}
        />
      )}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Song?"
        description={`Are you sure you want to delete song "${selectedSong?.name}"? This action cannot be undone.`}
        isLoading={isSubmitting}
      />
    </div>



  );
};

export default AdminSongs;
