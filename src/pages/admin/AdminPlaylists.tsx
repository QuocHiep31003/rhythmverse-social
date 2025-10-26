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
