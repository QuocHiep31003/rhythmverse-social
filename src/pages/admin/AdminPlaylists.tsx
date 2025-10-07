import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  Music, 
  Upload, 
  Download, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { PlaylistFormDialog } from "@/components/admin/PlaylistFormDialog";
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

interface Playlist {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  songLimit: number;
  dateUpdate: string | null;
  songIds: number[];
  songs: any[];
  coverImage?: string;
}

interface PlaylistResponse {
  content: Playlist[];
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

const AdminPlaylists = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadPlaylists();
  }, [currentPage, pageSize, searchQuery]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(
        `${API_BASE_URL}/playlists?page=${currentPage}&size=${pageSize}&sort=name,asc${searchParam}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }
      
      const data: PlaylistResponse = await response.json();
      setPlaylists(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách playlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedPlaylist(null);
    setFormOpen(true);
  };

  const handleEdit = (playlist: Playlist) => {
    setFormMode("edit");
    setSelectedPlaylist(playlist);
    setFormOpen(true);
  };

  const handleDeleteClick = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const today = new Date().toISOString().split("T")[0];
      const playlistData = {
        ...data,
        isPublic: data.isPublic ?? true,
        songLimit: data.songLimit ?? 500,
        dateUpdate: today,
        songIds: selectedPlaylist?.songIds || [],
        coverImage: data.coverImage || null
      };

      if (formMode === "create") {
        const response = await fetch(`${API_BASE_URL}/playlists`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(playlistData),
        });

        if (!response.ok) {
          throw new Error("Failed to create playlist");
        }

        toast({
          title: "Thành công",
          description: "Đã tạo playlist mới",
        });
      } else {
        const response = await fetch(`${API_BASE_URL}/playlists/${selectedPlaylist?.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(playlistData),
        });

        if (!response.ok) {
          throw new Error("Failed to update playlist");
        }

        toast({
          title: "Thành công",
          description: "Đã cập nhật playlist",
        });
      }
      
      setFormOpen(false);
      loadPlaylists();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlaylist) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/playlists/${selectedPlaylist.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete playlist");
      }

      toast({
        title: "Thành công",
        description: "Đã xóa playlist",
      });
      setDeleteOpen(false);
      loadPlaylists();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists/export`);
      
      if (!response.ok) {
        throw new Error("Failed to export playlists");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "playlists_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Thành công",
        description: "Đã xuất danh sách playlist ra file Excel",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xuất playlist",
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

    // Kiểm tra định dạng file
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

      const response = await fetch(`${API_BASE_URL}/playlists/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to import playlists");
      }

      const result = await response.text();
      
      toast({
        title: "Thành công",
        description: result || "Đã import playlist thành công",
      });
      
      setImportOpen(false);
      setImportFile(null);
      loadPlaylists();
    } catch (error: any) {
      toast({
        title: "Lỗi import",
        description: error.message || "Không thể import playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaylistCover = (playlist: Playlist) => {
    if (playlist.coverImage) {
      return playlist.coverImage;
    }
    return `https://via.placeholder.com/300/1e40af/ffffff?text=${encodeURIComponent(playlist.name.charAt(0).toUpperCase())}`;
  };

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
    setCurrentPage(0); // Reset về trang đầu khi thay đổi kích thước trang
  };

  // Generate page numbers for pagination
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

  return (
    <div className="h-screen overflow-hidden bg-gradient-dark text-white p-6 flex flex-col">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden">
        {/* Navigation */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Quản lý Playlists</h1>
              <p className="text-muted-foreground">
                Tổng số: {totalElements} playlists • Trang {currentPage + 1} / {totalPages}
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
                Tạo playlist
              </Button>
            </div>
          </div>

          <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm playlist..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0); // Reset về trang đầu khi tìm kiếm
                    }}
                    className="pl-10 bg-background/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Hiển thị:</span>
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
                  <span className="text-sm text-muted-foreground">mỗi trang</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {loading ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-8">
                  {searchQuery ? "Không tìm thấy playlist phù hợp" : "Chưa có playlist nào"}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {playlists.map((playlist) => (
                    <Card key={playlist.id} className="overflow-hidden bg-card/30 border-border/30 hover:border-primary/50 transition-all duration-300">
...
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination outside of scrollable area */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị {playlists.length} trên tổng số {totalElements} playlists
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

          <PlaylistFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            onSubmit={handleFormSubmit}
            defaultValues={selectedPlaylist}
            isLoading={isSubmitting}
            mode={formMode}
          />

          <DeleteConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDelete}
            title="Xóa playlist?"
            description={`Bạn có chắc muốn xóa playlist "${selectedPlaylist?.name}"? Hành động này không thể hoàn tác.`}
            isLoading={isSubmitting}
          />

          {/* Import Dialog */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white">Import Playlists từ Excel</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Chọn file Excel (.xlsx, .xls) để import playlists. File phải đúng định dạng export từ hệ thống.
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

export default AdminPlaylists;