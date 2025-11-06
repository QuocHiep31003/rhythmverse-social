/* ======================
 *  AdminPlaylists.tsx
 *  Quản lý Playlists (Admin)
 *  EchoVerse – Music Universe Platform
 * ====================== */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Search, Upload, Download,
  ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface Collaborator {
  userId: number;
  name: string;
  email: string;
  role: string;
}

interface Playlist {
  id: number;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "FRIENDS_ONLY" | null;
  songLimit: number | null;
  dateUpdate: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  songIds: number[];
  songs: unknown[];
  owner?: { id?: number; name?: string } | null;
  ownerId?: number;
  collaborators?: Collaborator[] | null;
  songCount?: number;
  totalSongs?: number;
}

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_IMAGE_URL = "https://tse4.mm.bing.net/th/id/OIP.5Xw-6Hc_loqdGyqQG6G2IgHaEr?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";

const AdminPlaylists = () => {
  const navigate = useNavigate();

  /* ===== STATES ===== */
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaboratorsMap, setCollaboratorsMap] = useState<Record<number, Collaborator[]>>({});
  const [loadingCollaborators, setLoadingCollaborators] = useState<Set<number>>(new Set());

  // Bộ lọc & sắp xếp
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublic, setFilterPublic] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /* ===== LOAD DATA ===== */
  const loadPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      let sortParam = "name,asc";
      if (sortBy === "name-desc") sortParam = "name,desc";
      if (sortBy === "date-newest") sortParam = "dateUpdate,desc";
      if (sortBy === "date-oldest") sortParam = "dateUpdate,asc";
      if (sortBy === "songs-desc") sortParam = "songCount,desc";
      if (sortBy === "songs-asc") sortParam = "songCount,asc";

      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const publicParam = filterPublic !== "all" ? `&isPublic=${filterPublic}` : '';
      const visibilityParam = filterVisibility !== "all" ? `&visibility=${filterVisibility}` : '';
      const dateParam = filterDate !== "all" ? `&date=${filterDate}` : '';

      const res = await fetch(`${API_BASE_URL}/playlists?page=${currentPage}&size=${pageSize}&sort=${sortParam}${searchParam}${publicParam}${visibilityParam}${dateParam}`);
      if (!res.ok) throw new Error("Không thể tải danh sách playlist");

      const data = await res.json();
      const mapped = (data.content || []).map((p: {
        id: number;
        name: string;
        description?: string | null;
        coverUrl?: string | null;
        visibility?: string;
        songLimit?: number | null;
        dateUpdate?: string | null;
        updatedAt?: string | null;
        createdAt?: string | null;
        createdDate?: string | null;
        songIds?: number[];
        songs?: unknown[];
        owner?: { id?: number; name?: string } | null;
        ownerId?: number;
        collaborators?: Array<{ userId?: number; id?: number }> | null;
        collaboratorList?: Array<{ userId?: number; id?: number }> | null;
        songCount?: number;
        totalSongs?: number;
      }) => {
        // Xử lý collaborators để đảm bảo có đầy đủ thông tin
        let collaborators = null;
        if (p.collaborators && Array.isArray(p.collaborators)) {
          collaborators = p.collaborators;
        } else if (p.collaboratorList && Array.isArray(p.collaboratorList)) {
          collaborators = p.collaboratorList;
        }

        return {
          id: p.id,
          name: p.name,
          description: p.description || null,
          coverUrl: p.coverUrl || null,
          visibility: p.visibility || 'PUBLIC',
          songLimit: p.songLimit ?? null,
          dateUpdate: p.dateUpdate || p.updatedAt || null,
          createdAt: p.createdAt || p.createdDate || null,
          updatedAt: p.updatedAt || p.dateUpdate || null,
          songIds: p.songIds || [],
          songs: p.songs || [],
          owner: p.owner || null,
          ownerId: p.ownerId || p.owner?.id || null,
          collaborators: collaborators,
          songCount: p.songCount || p.totalSongs || (Array.isArray(p.songs) ? p.songs.length : 0) || 0,
          totalSongs: p.totalSongs || p.songCount || (Array.isArray(p.songs) ? p.songs.length : 0) || 0,
        };
      });
      setPlaylists(mapped);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (e) {
      toast({ title: "Lỗi", description: "Không thể tải danh sách playlist", variant: "destructive" });
    } finally { setLoading(false); }
  }, [currentPage, pageSize, searchQuery, filterPublic, filterVisibility, filterDate, sortBy]);

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  // Load collaborators cho tất cả playlists
  useEffect(() => {
    const loadCollaborators = async () => {
      const newMap: Record<number, Collaborator[]> = {};
      const loadingSet = new Set<number>();
      
      // Chỉ load cho những playlist chưa có trong map
      const playlistsToLoad = playlists.filter(p => p.id && !collaboratorsMap[p.id]);
      
      for (const playlist of playlistsToLoad) {
        if (playlist.id) {
          loadingSet.add(playlist.id);
          try {
            const res = await fetch(`${API_BASE_URL}/playlists/invites/collaborators/${playlist.id}`);
            if (res.ok) {
              const data: Collaborator[] = await res.json();
              newMap[playlist.id] = Array.isArray(data) ? data : [];
            } else {
              newMap[playlist.id] = [];
            }
          } catch {
            newMap[playlist.id] = [];
          } finally {
            loadingSet.delete(playlist.id);
          }
        }
      }
      
      if (Object.keys(newMap).length > 0) {
        setCollaboratorsMap(prev => ({ ...prev, ...newMap }));
      }
      setLoadingCollaborators(prev => {
        const newSet = new Set(prev);
        loadingSet.forEach(id => newSet.delete(id));
        return newSet;
      });
    };

    if (playlists.length > 0) {
      loadCollaborators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists]);

  /* ===== IMPORT ONLY ===== */
  // Admin chỉ import data, không được thao tác trên playlist của người dùng

  /* ===== GIAO DIỆN ===== */
  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 self-start">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
      </Button>

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
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </Button>
              <Button variant="outline" onClick={loadPlaylists}>
                <Download className="w-4 h-4 mr-2" /> Export
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
                  <Select value={filterVisibility} onValueChange={(v) => { setFilterVisibility(v); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[180px] bg-background/50">
                      <SelectValue placeholder="Visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả visibility</SelectItem>
                      <SelectItem value="PUBLIC">Công khai</SelectItem>
                      <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                      <SelectItem value="FRIENDS_ONLY">Bạn bè</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[180px] bg-background/50">
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Tên A-Z</SelectItem>
                      <SelectItem value="name-desc">Tên Z-A</SelectItem>
                      <SelectItem value="date-newest">Mới nhất</SelectItem>
                      <SelectItem value="date-oldest">Cũ nhất</SelectItem>
                      <SelectItem value="songs-desc">Nhiều bài hát nhất</SelectItem>
                      <SelectItem value="songs-asc">Ít bài hát nhất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto min-h-0">
              {loading ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-8">Không có playlist nào</div>
              ) : (
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2 text-left text-sm font-semibold">STT</th>
                      <th className="p-2 text-left text-sm font-semibold">Ảnh</th>
                      <th className="p-2 text-left text-sm font-semibold">Tên</th>
                      <th className="p-2 text-left text-sm font-semibold">Owner ID</th>
                      <th className="p-2 text-left text-sm font-semibold">Mô tả</th>
                      <th className="p-2 text-left text-sm font-semibold">Số bài</th>
                      <th className="p-2 text-left text-sm font-semibold">Limit</th>
                      <th className="p-2 text-left text-sm font-semibold">Visibility</th>
                      <th className="p-2 text-left text-sm font-semibold">Collab IDs</th>
                      <th className="p-2 text-left text-sm font-semibold">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playlists.map((p, i) => {
                      // Lấy danh sách collaborator IDs từ API /api/playlists/invites/collaborators/{playlistId}
                      const collaborators = collaboratorsMap[p.id] || [];
                      const collabIds = collaborators.map(c => c.userId);
                      const collabIdsStr = collabIds.length > 0 ? collabIds.join(', ') : null;
                      
                      // Rút ngắn mô tả để hiển thị (tối đa 50 ký tự)
                      const descriptionShort = p.description && p.description.length > 50 
                        ? p.description.substring(0, 50) + '...' 
                        : p.description;

                      return (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-2 text-sm">{currentPage * pageSize + i + 1}</td>
                          <td className="p-2">
                            <img src={p.coverUrl || DEFAULT_IMAGE_URL} alt="" className="w-10 h-10 rounded object-cover" />
                          </td>
                          <td className="p-2 text-sm font-medium max-w-[150px] truncate" title={p.name}>
                            {p.name}
                          </td>
                          <td className="p-2 text-sm text-blue-400 font-mono">
                            {p.ownerId || "—"}
                          </td>
                          <td className="p-2 text-sm max-w-[150px]">
                            {p.description && p.description.length > 50 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="truncate block cursor-help">{descriptionShort}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[400px]">
                                    <p className="text-sm whitespace-pre-wrap">{p.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span>{p.description || "—"}</span>
                            )}
                          </td>
                          <td className="p-2 text-sm">
                            {p.songCount || p.totalSongs || (Array.isArray(p.songs) ? p.songs.length : 0)}
                          </td>
                          <td className="p-2 text-sm">
                            {p.songLimit ? (
                              <span className="text-blue-400">{p.songLimit}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 text-sm">
                            <span className={
                              p.visibility === 'PUBLIC' ? "text-green-400" :
                              p.visibility === 'PRIVATE' ? "text-red-400" :
                              p.visibility === 'FRIENDS_ONLY' ? "text-yellow-400" :
                              "text-gray-400"
                            }>
                              {p.visibility === 'PUBLIC' ? "Public" :
                               p.visibility === 'PRIVATE' ? "Private" :
                               p.visibility === 'FRIENDS_ONLY' ? "Friends" :
                               "—"}
                            </span>
                          </td>
                          <td className="p-2">
                            {loadingCollaborators.has(p.id) ? (
                              <span className="text-sm text-muted-foreground">Đang tải...</span>
                            ) : collabIdsStr ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-base font-mono text-blue-400 font-bold cursor-help max-w-[250px] inline-block truncate">
                                      {collabIdsStr}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px]">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-sm">Collaborators:</p>
                                      {collaborators.map((c, idx) => (
                                        <p key={idx} className="text-xs font-mono">
                                          ID: {c.userId} - {c.name} ({c.role})
                                        </p>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {p.dateUpdate ? new Date(p.dateUpdate).toLocaleDateString('vi-VN') : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Import Dialog Only - Admin không được thao tác trên playlist của người dùng */}

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white">Import Playlists từ Excel</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Chọn file Excel (.xlsx, .xls) để import playlists.
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
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportOpen(false);
                      setImportFile(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button 
                    onClick={() => toast({ title: "Import thành công!" })} 
                    disabled={isSubmitting || !importFile}
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
