/* ======================
 *  AdminPlaylists.tsx
 *  Quản lý Playlists (Admin)
 *  EchoVerse – Music Universe Platform
 * ====================== */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Pencil, Trash2, Plus, Search, Upload, Download,
  ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Filter, MoreHorizontal, UserPlus
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { PlaylistFormDialog } from "@/components/admin/PlaylistFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { friendsApi } from "@/services/api/friendsApi";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";

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
  owner?: { name?: string };
}

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_IMAGE_URL = "https://tse4.mm.bing.net/th/id/OIP.5Xw-6Hc_loqdGyqQG6G2IgHaEr?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";

const AdminPlaylists = () => {
  const navigate = useNavigate();

  /* ===== STATES ===== */
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Cộng tác playlist
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabPlaylistId, setCollabPlaylistId] = useState<number | null>(null);
  const [friends, setFriends] = useState<Array<{ id: number; name: string; avatar?: string | null }>>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Bộ lọc & sắp xếp
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublic, setFilterPublic] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /* ===== LOAD DATA ===== */
  useEffect(() => { loadPlaylists(); }, [currentPage, pageSize, searchQuery, filterPublic, filterDate, sortBy]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      let sortParam = "name,asc";
      if (sortBy === "name-desc") sortParam = "name,desc";
      if (sortBy === "date-newest") sortParam = "dateUpdate,desc";
      if (sortBy === "date-oldest") sortParam = "dateUpdate,asc";

      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const publicParam = filterPublic !== "all" ? `&isPublic=${filterPublic}` : '';
      const dateParam = filterDate !== "all" ? `&date=${filterDate}` : '';

      const res = await fetch(`${API_BASE_URL}/playlists?page=${currentPage}&size=${pageSize}&sort=${sortParam}${searchParam}${publicParam}${dateParam}`);
      if (!res.ok) throw new Error("Không thể tải danh sách playlist");

      const data = await res.json();
      const mapped = (data.content || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        isPublic: (p.visibility || 'PUBLIC') === 'PUBLIC',
        songLimit: p.songLimit ?? 0,
        dateUpdate: p.dateUpdate ?? null,
        songIds: p.songIds || [],
        songs: p.songs || [],
        coverImage: p.coverUrl || "",
        owner: p.owner || null,
      }));
      setPlaylists(mapped);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (e) {
      toast({ title: "Lỗi", description: "Không thể tải danh sách playlist", variant: "destructive" });
    } finally { setLoading(false); }
  };

  /* ===== CRUD ===== */
  const handleCreate = () => { setFormMode("create"); setSelectedPlaylist(null); setFormOpen(true); };
  const handleEdit = (p: Playlist) => { setFormMode("edit"); setSelectedPlaylist(p); setFormOpen(true); };
  const handleDeleteClick = (p: Playlist) => { setSelectedPlaylist(p); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!selectedPlaylist) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/playlists/${selectedPlaylist.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      toast({ title: "Thành công", description: "Đã xóa playlist" });
      setDeleteOpen(false);
      loadPlaylists();
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa playlist", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  /* ===== GIAO DIỆN ===== */
  return (
<<<<<<< HEAD
    <div className="h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex flex-col">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 self-start">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
      </Button>

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Playlists</h1>
          <p className="text-muted-foreground">
            Tổng số: {totalElements} playlists • Trang {currentPage + 1}/{totalPages}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button variant="outline" onClick={loadPlaylists}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />Tạo Playlist</Button>
=======
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Quản lý Playlists</h1>
              <p className="text-muted-foreground">
                Tổng số: {totalElements} playlists • Trang {currentPage + 1} / {totalPages}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button onClick={handleCreate} className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity">
                <Plus className="w-4 h-4 mr-2" />
                Tạo playlist
              </Button>
            </div>
          </div>

          <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm playlist..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(0);
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
                
                {/* Filters & Sort */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Lọc:</span>
                  </div>
                  
                  <Select value={filterPublic} onValueChange={(value) => { setFilterPublic(value); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[150px] bg-background/50">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="true">Công khai</SelectItem>
                      <SelectItem value="false">Riêng tư</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterDate} onValueChange={(value) => { setFilterDate(value); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[150px] bg-background/50">
                      <SelectValue placeholder="Năm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả năm</SelectItem>
                      {availableDates.map(year => (
                        <SelectItem key={year} value={year?.toString() || ""}>
                          {year}
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
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Tên A-Z</SelectItem>
                      <SelectItem value="name-desc">Tên Z-A</SelectItem>
                      <SelectItem value="date-newest">Mới nhất</SelectItem>
                      <SelectItem value="date-oldest">Cũ nhất</SelectItem>
                    </SelectContent>
                  </Select>

                  {(filterPublic !== "all" || filterDate !== "all" || searchQuery || sortBy !== "name-asc") && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-8">
                  {searchQuery ? "Không tìm thấy playlist phù hợp" : "Chưa có playlist nào"}
                </div>
              ) : (
                <>
                  {/* Fixed Header */}
                  <div className="flex-shrink-0 border-b-2 border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr>
                          <th className="w-16 text-center text-sm font-medium text-muted-foreground p-3">STT</th>
                          <th className="w-80 text-left text-sm font-medium text-muted-foreground p-3">Playlist</th>
                          <th className="w-96 text-left text-sm font-medium text-muted-foreground p-3">Mô tả</th>
                          <th className="w-32 text-left text-sm font-medium text-muted-foreground p-3">Số bài hát</th>
                          <th className="w-32 text-left text-sm font-medium text-muted-foreground p-3">Trạng thái</th>
                          <th className="w-32 text-right text-sm font-medium text-muted-foreground p-3">Hành động</th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                  
                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
                    <table className="w-full table-fixed">
                      <tbody>
                        {playlists.map((playlist, index) => (
                          <tr key={playlist.id} className="border-b border-border hover:bg-muted/50">
                            <td className="w-16 p-3 text-center">{currentPage * pageSize + index + 1}</td>
                            <td className="w-80 p-3">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={getPlaylistCover(playlist)} 
                                  alt={playlist.name}
                                  onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE_URL; }}
                                  className="w-10 h-10 rounded object-cover"
                                />
                                <span className="font-medium truncate">{playlist.name}</span>
                              </div>
                            </td>
                            <td className="w-96 p-3 truncate">
                              {playlist.description || '—'}
                            </td>
                            <td className="w-32 p-3">{playlist.songs?.length || 0}</td>
                            <td className="w-32 p-3">
                              <span className={playlist.isPublic ? "text-green-400" : "text-yellow-400"}>
                                {playlist.isPublic ? "Công khai" : "Riêng tư"}
                              </span>
                            </td>
                            <td className="w-32 text-right p-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(playlist)} className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(playlist)} className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors">
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
                Hiển thị {playlists.length} trên tổng số {totalElements} playlists
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
                
                {getPageNumbers().map(page => (
                  <Button
                    key={page}
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(page)}
                    className={`h-8 w-8 border-[hsl(var(--admin-border))] ${
                      currentPage === page 
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
>>>>>>> d3ca79b09b40f6cbdffd24c2a741399444806ff6
        </div>
      </div>

      <Card className="bg-card/50 border-border/50 flex-1 overflow-hidden">
        <CardHeader>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm playlist..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-auto">
          {loading ? (
            <p className="text-center py-8">Đang tải...</p>
          ) : playlists.length === 0 ? (
            <p className="text-center py-8">Không có playlist nào</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Ảnh bìa</TableHead>
                  <TableHead>Tên Playlist</TableHead>
                  <TableHead>Chủ sở hữu</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Số bài hát</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playlists.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell>{currentPage * pageSize + i + 1}</TableCell>
                    <TableCell>
                      <img src={p.coverImage || DEFAULT_IMAGE_URL} alt="" className="w-10 h-10 rounded object-cover" />
                    </TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.owner?.name || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.description || "—"}</TableCell>
                    <TableCell>{p.songs?.length || 0}</TableCell>
                    <TableCell>
                      <span className={p.isPublic ? "text-green-400" : "text-yellow-400"}>
                        {p.isPublic ? "Công khai" : "Riêng tư"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleEdit(p)}>
                            <Pencil className="w-4 h-4 mr-2" />Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCollabPlaylistId(p.id); setCollabOpen(true); }}>
                            <UserPlus className="w-4 h-4 mr-2" />Cộng tác
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(p)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlaylistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={() => loadPlaylists()}
        defaultValues={selectedPlaylist}
        mode={formMode}
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Xóa playlist?"
        description={`Bạn có chắc muốn xóa playlist "${selectedPlaylist?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AdminPlaylists;
