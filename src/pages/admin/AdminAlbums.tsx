import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Download, Upload, ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AlbumFormDialog } from "@/components/admin/AlbumFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  coverImage?: string;
  artistName?: string;
}

interface AlbumResponse {
  content: Album[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
}

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_IMAGE_URL = "https://tse4.mm.bing.net/th/id/OIP.5Xw-6Hc_loqdGyqQG6G2IgHaEr?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";

const AdminAlbums = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadAlbums();
    loadArtists();
  }, [currentPage, pageSize, searchQuery]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(
        `${API_BASE_URL}/albums?page=${currentPage}&size=${pageSize}&sort=name,asc${searchParam}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }
      
      const data: AlbumResponse = await response.json();
      setAlbums(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (error) {
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
      const response = await fetch(`${API_BASE_URL}/artists?page=0&size=1000`);
      if (response.ok) {
        const data = await response.json();
        setArtists(data.content || []);
      }
    } catch (error) {
      console.error("Failed to load artists:", error);
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

      // Chỉ gửi các trường cơ bản theo API spec
      const albumData = {
        name: data.name,
        artistId: data.artistId,
        releaseDate: data.releaseDate
        // Không gửi songIds vì API chưa hỗ trợ
      };

      if (formMode === "create") {
        const response = await fetch(`${API_BASE_URL}/albums`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(albumData),
        });

        if (!response.ok) {
          throw new Error("Failed to create album");
        }

        toast({
          title: "Thành công",
          description: "Đã tạo album mới",
        });
      } else {
        const response = await fetch(`${API_BASE_URL}/albums/${selectedAlbum?.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(albumData),
        });

        if (!response.ok) {
          throw new Error("Failed to update album");
        }

        toast({
          title: "Thành công",
          description: "Đã cập nhật album",
        });
      }
      
      setFormOpen(false);
      loadAlbums();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu album",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAlbum) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/albums/${selectedAlbum.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete album");
      }

      toast({
        title: "Thành công",
        description: "Đã xóa album",
      });
      setDeleteOpen(false);
      loadAlbums();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa album",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/albums/export`);
      
      if (!response.ok) {
        throw new Error("Failed to export albums");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "albums_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Thành công",
        description: "Đã xuất danh sách albums ra file Excel",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xuất albums",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file Excel để import",
        variant: "destructive",
      });
      return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = importFile.name.toLowerCase().substring(importFile.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file Excel (.xlsx hoặc .xls)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch(`${API_BASE_URL}/albums/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to import albums");
      }

      const result = await response.text();
      
      toast({
        title: "Thành công",
        description: result || "Đã import albums thành công",
      });
      
      setImportOpen(false);
      setImportFile(null);
      loadAlbums();
    } catch (error: any) {
      toast({
        title: "Lỗi import",
        description: error.message || "Không thể import albums",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAlbumCover = (album: Album) => album.coverImage || DEFAULT_IMAGE_URL;

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToFirstPage = () => {
    setCurrentPage(0);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages - 1);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const [yearFilter, setYearFilter] = useState<string>("all");

  const getAvailableYears = () => {
    const years = albums
      .filter(album => album.releaseDate)
      .map(album => new Date(album.releaseDate).getFullYear())
      .filter((year, index, self) => self.indexOf(year) === index)
      .sort((a, b) => b - a);
    return years;
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-dark text-white p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Album Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage music albums and collections
          </p>
        </div>
        
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Total: {totalElements} albums • Page {currentPage + 1} / {totalPages}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo album
              </Button>
            </div>
          </div>

          <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search albums..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="pl-10 bg-background/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Year:</span>
                  <select 
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="bg-background border border-border rounded px-3 py-2 text-sm min-w-[120px]"
                  >
                    <option value="all">All Years</option>
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="bg-background/50 border border-border rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto min-h-0 scrollbar-custom">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : albums.filter(album => yearFilter === "all" || new Date(album.releaseDate).getFullYear().toString() === yearFilter).length === 0 ? (
                <div className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                      <Search className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Empty Placeholder</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery || yearFilter !== "all" ? 'No albums match your filters' : 'No albums found. Create your first album.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">STT</TableHead>
                      <TableHead>Album</TableHead>
                      <TableHead>Nghệ sĩ</TableHead>
                      <TableHead>Số bài hát</TableHead>
                      <TableHead>Ngày phát hành</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {albums.filter(album => yearFilter === "all" || new Date(album.releaseDate).getFullYear().toString() === yearFilter).map((album, index) => (
                      <TableRow key={album.id}>
                        <TableCell className="text-center">{currentPage * pageSize + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img 
                              src={getAlbumCover(album)} 
                              alt={album.name}
                              onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE_URL; }}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <span className="font-medium">{album.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{album.artist?.name || '—'}</TableCell>
                        <TableCell>{album.songs?.length || 0}</TableCell>
                        <TableCell>
                          {album.releaseDate ? new Date(album.releaseDate).toLocaleDateString('vi-VN') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(album)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(album)}>
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
          
          {/* Pagination outside of scrollable area */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                Hiển thị {albums.length} trên tổng số {totalElements} albums
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToFirstPage}
                  disabled={currentPage === 0}
                  className="h-8 w-8"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 0}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {getPageNumbers().map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => goToPage(page)}
                    className="h-8 w-8"
                  >
                    {page + 1}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages - 1}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToLastPage}
                  disabled={currentPage >= totalPages - 1}
                  className="h-8 w-8"
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
            defaultValues={selectedAlbum}
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

          {/* Import Dialog */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white">Import Albums từ Excel</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Chọn file Excel (.xlsx, .xls) để import albums. File phải đúng định dạng export từ hệ thống.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-2">
                    {importFile ? importFile.name : "Kéo thả file Excel hoặc click để chọn"}
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Chỉ hỗ trợ: Excel (.xlsx, .xls)
                  </p>
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
                  <Button 
                    onClick={handleImport} 
                    disabled={isSubmitting || !importFile}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isSubmitting ? "Đang import..." : "Import Excel"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminAlbums;