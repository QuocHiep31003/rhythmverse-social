import { useState, useEffect } from "react";
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
  Filter
} from "lucide-react";
import { AlbumFormDialog } from "@/components/admin/AlbumFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";
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
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadAlbums();
    loadArtists();
  }, [currentPage, pageSize, searchQuery, filterArtist, filterYear]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: String(currentPage),
        size: String(pageSize),
        sort: "name,asc"
      });

      if (searchQuery) {
        query.append("search", searchQuery);
        // compatibility: some backends use "name" as search key
        query.append("name", searchQuery);
      }
      if (filterArtist !== "all") {
        query.append("artistId", filterArtist);
        // compatibility: some backends expect "artist" string filter
        const artistName = artists.find(a => a.id.toString() === filterArtist)?.name;
        if (artistName) query.append("artist", artistName);
      }
      if (filterYear !== "all") {
        // backend may expect releaseYear instead of year
        query.append("releaseYear", filterYear);
      }

      const url = `${API_BASE_URL}/albums?${query.toString()}`;
      try { console.debug("Fetching albums:", url); } catch {}
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch albums");

      const data: AlbumResponse = await res.json();
      setAlbums(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (e) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách albums",
        variant: "destructive"
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

  // Import albums from Excel
  const handleImport = async () => {
    if (!importFile) {
      toast({ title: "Lỗi", description: "Vui lòng chọn file Excel để import", variant: "destructive" });
      return;
    }
    const validExt = [".xlsx", ".xls"];
    const ext = importFile.name.toLowerCase().slice(importFile.name.lastIndexOf("."));
    if (!validExt.includes(ext)) {
      toast({ title: "Lỗi", description: "Chỉ hỗ trợ file .xlsx hoặc .xls", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch(`${API_BASE_URL}/albums/import`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Import failed");
      }
      const msg = await res.text();
      toast({ title: "Đã import", description: msg || "Import albums thành công" });
      setImportOpen(false);
      setImportFile(null);
      loadAlbums();
    } catch (e: any) {
      toast({ title: "Lỗi import", description: e?.message || "Không thể import albums", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
    setCurrentPage(0);
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-dark text-white p-6 flex flex-col">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 self-start">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
      </Button>

      <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý Albums</h1>
            <p className="text-muted-foreground">
              Tổng số: {totalElements} albums • Trang {currentPage + 1} / {totalPages}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" /> Tạo album
            </Button>
          </div>
        </div>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-white">Import Albums từ Excel</DialogTitle>
              <DialogDescription className="text-gray-400">
                Chọn file Excel (.xlsx, .xls) đúng định dạng export để import albums.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-400 mb-2">
                  {importFile ? importFile.name : "Kéo thả hoặc chọn file Excel"}
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="bg-background/50"
                />
                <p className="text-xs text-gray-500 mt-2">Hỗ trợ: .xlsx, .xls</p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportOpen(false);
                    setImportFile(null);
                  }}
                  disabled={isSubmitting}
                  className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
                >
                  Hủy
                </Button>
                <Button onClick={handleImport} disabled={isSubmitting || !importFile} className="bg-primary hover:bg-primary/90">
                  {isSubmitting ? "Đang import..." : "Import Excel"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content */}
        <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            {/* Filters + Search */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm album..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="pl-10 bg-background/50"
                  />
                </div>
              </div>

              {/* Filters */}
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
                    <SelectItem value="all">Tất cả nghệ sĩ</SelectItem>
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
                    <SelectItem value="all">Tất cả năm</SelectItem>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y?.toString() || ""}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filterArtist !== "all" || filterYear !== "all" || searchQuery) && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Table */}
          <CardContent className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : albums.length === 0 ? (
              <div className="text-center py-8">Không có album nào</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Album</TableHead>
                    <TableHead>Nghệ sĩ</TableHead>
                    <TableHead>Số bài hát</TableHead>
                    <TableHead>Ngày phát hành</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {albums.map((album, i) => (
                    <TableRow key={album.id}>
                      <TableCell>{currentPage * pageSize + i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            key={album.coverUrl}
                            src={getAlbumCover(album)}
                            alt={album.name}
                            onError={(e) => (e.currentTarget.src = DEFAULT_IMAGE_URL)}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <span className="font-medium">{album.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{album.artist?.name || "—"}</TableCell>
                      <TableCell>{album.songs?.length || 0}</TableCell>
                      <TableCell>
                        {album.releaseDate
                          ? new Date(album.releaseDate).toLocaleDateString("vi-VN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(album)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(album)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Hiển thị {albums.length} trên tổng {totalElements}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToPrev} disabled={currentPage === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {[...Array(totalPages).keys()].slice(
                Math.max(0, currentPage - 2),
                Math.min(totalPages, currentPage + 3)
              ).map((p) => (
                <Button
                  key={p}
                  variant={currentPage === p ? "default" : "outline"}
                  size="icon"
                  onClick={() => goToPage(p)}
                >
                  {p + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToLastPage}
                disabled={currentPage >= totalPages - 1}
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
                  coverUrl: selectedAlbum.coverUrl || "",
                  description: selectedAlbum.description || ""
                }
              : undefined
          }
          isLoading={isSubmitting}
          mode={formMode}
          artists={artists}
        />

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          title="Xóa album?"
          description={`Bạn có chắc muốn xóa album "${selectedAlbum?.name}"? Hành động này không thể hoàn tác.`}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
};

export default AdminAlbums;
