import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Download,
  Upload,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Music
} from "lucide-react";
import { AlbumFormDialog } from "@/components/admin/AlbumFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { albumsApi } from "@/services/api/albumApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface Artist {
  id: number;
  name: string;
  country: string;
  debutYear: number;
  description: string;
}

interface Song {
  id: number;
  name: string;
  releaseYear: number;
  genre: string;
  artistIds: number[];
  artists: Artist[];
}

interface Album {
  id: number;
  name: string;
  artistId: number;
  songIds: number[];
  artist: Artist;
  songs: Song[];
  releaseDate: string;
  coverUrl?: string;
  artistName?: string;
  description?: string;
}

interface AlbumResponse {
  content: Album[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_IMAGE_URL =
  "https://tse4.mm.bing.net/th/id/OIP.5Xw-6Hc_loqdGyqQG6G2IgHaEr?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";

const AdminAlbums = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArtist, setFilterArtist] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadAlbums();
    loadArtists();
  }, [currentPage, pageSize, searchQuery, filterArtist, filterYear, sortBy]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      // Xử lý sắp xếp theo chuẩn Songs page
      let sortParam = "name,asc";
      if (sortBy === "name-desc") sortParam = "name,desc";
      else if (sortBy === "date-newest") sortParam = "releaseDate,desc";
      else if (sortBy === "date-oldest") sortParam = "releaseDate,asc";

      const params: any = {
        page: currentPage,
        size: pageSize,
        sort: sortParam,
      };
      if (searchQuery) params.search = searchQuery;
      if (filterArtist !== "all") params.artistId = Number(filterArtist);
      if (filterYear !== "all") params.releaseYear = Number(filterYear);

      const data = await albumsApi.getAll(params);
      setAlbums(data.content || []);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error("Lỗi loadAlbums:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách albums",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const loadArtists = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/artists?page=0&size=1000`);
      if (!res.ok) return;
      const data = await res.json();
      setArtists(data.content || []);
    } catch (e) {
      console.error("Load artists failed:", e);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedAlbum(null);
    setFormOpen(true);
  };

  const handleEdit = (album: Album) => {
    setFormMode("edit");
    setSelectedAlbum(album);
    setFormOpen(true);
  };

  const handleDeleteClick = (album: Album) => {
    setSelectedAlbum(album);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: data.name,
        artistId: data.artistId,
        songIds: data.songIds || [],
        releaseDate: data.releaseDate,
        description: data.description || "",
        coverUrl: data.coverUrl || ""
      };

      const method = formMode === "create" ? "POST" : "PUT";
      const url =
        formMode === "create"
          ? `${API_BASE_URL}/albums`
          : `${API_BASE_URL}/albums/${selectedAlbum?.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok)
        throw new Error(formMode === "create" ? "Tạo album thất bại" : "Cập nhật thất bại");

      toast({
        title: "Thành công",
        description:
          formMode === "create"
            ? "Đã tạo album mới"
            : "Đã cập nhật album thành công"
      });
      setFormOpen(false);
      loadAlbums();
    } catch (e) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu album",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAlbum) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/albums/${selectedAlbum.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failed");

      toast({
        title: "Thành công",
        description: "Đã xóa album"
      });
      setDeleteOpen(false);
      loadAlbums();
    } catch (e) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa album",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/albums/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "albums_export.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Đã xuất file thành công" });
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể export albums",
        variant: "destructive"
      });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: "Lỗi", description: "Vui lòng chọn file Excel (.xlsx hoặc .xls)", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/albums/import`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Import failed");
      }
      const msg = await res.text();
      toast({ title: "Đã import", description: msg || "Import albums thành công" });
      loadAlbums();
    } catch (e: any) {
      toast({ title: "Lỗi import", description: e?.message || "Không thể import albums", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getAlbumCover = (album: Album) => {
    const a: any = album as any;
    const url =
      album.coverUrl ||
      a.cover ||
      a.imageUrl ||
      a.image ||
      a.thumbnailUrl ||
      a.thumbnail;
    return url ? `${url}?t=${album.id}` : DEFAULT_IMAGE_URL;
  };

  const goToPage = (page: number) => setCurrentPage(page);
  const goToFirstPage = () => setCurrentPage(0);
  const goToLastPage = () => setCurrentPage(totalPages - 1);
  const goToPrev = () => setCurrentPage(p => Math.max(0, p - 1));
  const goToNext = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages)
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const availableYears = Array.from(
    new Set(
      albums
        .map(a => (a.releaseDate ? new Date(a.releaseDate).getFullYear() : null))
        .filter(Boolean)
    )
  ).sort((a, b) => (b as number) - (a as number));

  const handleClearFilters = () => {
    setFilterArtist("all");
    setFilterYear("all");
    setSearchQuery("");
    setSortBy("name-asc");
    setCurrentPage(0);
  };

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section (match Songs page style) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Quản lý Albums</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">{totalElements} albums</Badge>
                {loading && <span className="text-xs">Đang tải...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />

            <Button variant="outline" onClick={handleExport} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button variant="outline" onClick={handleImportClick} disabled={isSubmitting} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors">
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button onClick={handleCreate} className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg">
              <Plus className="w-4 h-4" /> Tạo album
            </Button>
          </div>
        </div>

        {/* Content */}
        <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="flex-shrink-0">
            {/* Filters + Search */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search albums or artists..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="pl-10 bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(0);
                    }}
                    className="bg-background border border-border rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </div>

              {/* Filters & Sort */}
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lọc:</span>

                <Select
                  value={filterArtist}
                  onValueChange={(v) => {
                    setFilterArtist(v);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-background/50">
                    <SelectValue placeholder="Nghệ sĩ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All artists</SelectItem>
                    {artists.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterYear}
                  onValueChange={(v) => {
                    setFilterYear(v);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger className="w-[150px] bg-background/50">
                    <SelectValue placeholder="Năm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y?.toString() || ""}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-background/50">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="date-newest">Release date (Newest)</SelectItem>
                    <SelectItem value="date-oldest">Release date (Oldest)</SelectItem>
                  </SelectContent>
                </Select>

                {(filterArtist !== "all" || filterYear !== "all" || searchQuery || sortBy !== "name-asc") && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : albums.length === 0 ? (
              <div className="text-center py-8">Không có album nào</div>
            ) : (
              <>
                {/* Fixed Header */}
                <div className="flex-shrink-0 border-b-2 border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr>
                        <th className="w-16 text-center text-sm font-medium text-muted-foreground p-3">STT</th>
                        <th className="w-80 text-left text-sm font-medium text-muted-foreground p-3">Album</th>
                        <th className="w-48 text-left text-sm font-medium text-muted-foreground p-3">Nghệ sĩ</th>
                        <th className="w-32 text-left text-sm font-medium text-muted-foreground p-3">Số bài hát</th>
                        <th className="w-40 text-left text-sm font-medium text-muted-foreground p-3">Ngày phát hành</th>
                        <th className="w-32 text-right text-sm font-medium text-muted-foreground p-3">Hành động</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
                  <table className="w-full table-fixed">
                    <tbody>
                      {albums.map((album, i) => (
                        <tr key={album.id} className="border-b border-border hover:bg-muted/50">
                          <td className="w-16 p-3">{currentPage * pageSize + i + 1}</td>
                          <td className="w-80 p-3">
                            <div className="flex items-center gap-3">
                              <img
                                key={album.coverUrl}
                                src={getAlbumCover(album)}
                                alt={album.name}
                                onError={(e) => (e.currentTarget.src = DEFAULT_IMAGE_URL)}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <span className="font-medium truncate">{album.name}</span>
                            </div>
                          </td>
                          <td className="w-48 p-3 truncate">{album.artist?.name || "—"}</td>
                          <td className="w-32 p-3">{album.songs?.length || 0}</td>
                          <td className="w-40 p-3">
                            {album.releaseDate
                              ? new Date(album.releaseDate).toLocaleDateString("vi-VN")
                              : "—"}
                          </td>
                          <td className="w-32 text-right p-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(album)} className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(album)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Showing {albums.length} of {totalElements} albums
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToPrev} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(p)}
                  className={`h-8 w-8 border-[hsl(var(--admin-border))] ${currentPage === p
                    ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]"
                    : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                    }`}
                >
                  {p + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
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

        <AlbumFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleFormSubmit}
          defaultValues={
            formMode === "edit" && selectedAlbum
              ? {
                name: selectedAlbum.name,
                artistId: selectedAlbum.artistId || selectedAlbum.artist?.id || 0,
                songIds:
                  selectedAlbum.songIds?.length
                    ? selectedAlbum.songIds
                    : selectedAlbum.songs?.map((s) => s.id) || [],
                releaseDate: selectedAlbum.releaseDate
                  ? new Date(selectedAlbum.releaseDate).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0],
                coverUrl: selectedAlbum.coverUrl || ""
              }
              : undefined
          }
          isLoading={isSubmitting}
          mode={formMode}
          artists={artists}
          existingSongs={selectedAlbum?.songs || []}
        />

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          title="Xóa album?"
          description={`Bạn có chắc muốn xóa album "${selectedAlbum?.name}"? Hành động này không thể hoàn tác.`}
          isLoading={isSubmitting}
        />

        {/* Import dialog removed to match Songs UX; using hidden file input instead */}
      </div>
    </div>
  );
};

export default AdminAlbums;
