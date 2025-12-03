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
  ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Eye, Music, Ban, AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getAuthToken } from "@/services/api/config";

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
  isBanned?: boolean;
  flaggedForReview?: boolean;
  banReason?: string | null;
  flagReason?: string | null;
  bannedAt?: string | null;
  bannedBy?: { id?: number; name?: string } | null;
  isWarned?: boolean;
  warningCount?: number;
  warningReason?: string | null;
  warnedAt?: string | null;
  warnedBy?: { id?: number; name?: string } | null;
}

const API_BASE_URL = "http://localhost:8080/api";

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
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [totalBanned, setTotalBanned] = useState(0);
  const [totalFlagged, setTotalFlagged] = useState(0);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [isUnbanning, setIsUnbanning] = useState(false);
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [isWarning, setIsWarning] = useState(false);
  const [unwarnDialogOpen, setUnwarnDialogOpen] = useState(false);
  const [isUnwarning, setIsUnwarning] = useState(false);

  // Danh sách lý do ban/warn có sẵn
  const banReasons = [
    "Chứa nội dung khiêu dâm hoặc tình dục",
    "Chứa nội dung bạo lực hoặc thù hận",
    "Vi phạm bản quyền hoặc đánh cắp nội dung",
    "Chứa từ ngữ tục tĩu hoặc chửi thề",
    "Spam hoặc lạm dụng hệ thống",
    "Nội dung lừa đảo hoặc gian lận",
    "Khác"
  ];

  const warnReasons = [
    "Tên hoặc mô tả chứa từ ngữ không phù hợp",
    "Nội dung có thể gây hiểu lầm",
    "Vi phạm quy tắc cộng đồng nhẹ",
    "Spam hoặc quảng cáo không phù hợp",
    "Khác"
  ];

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

  // Tab view
  const [activeTab, setActiveTab] = useState("all"); // "all", "flagged", "banned"

  /* ===== LOAD DATA ===== */
  const loadPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      let url = '';
      
      // Load theo tab
      if (activeTab === "flagged") {
        url = `${API_BASE_URL}/playlists/admin/flagged`;
      } else if (activeTab === "banned") {
        url = `${API_BASE_URL}/playlists/admin/banned`;
      } else {
        // Tab "all" - load tất cả với pagination
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
      // Chỉ hiển thị USER_CREATED playlists
      const typeParam = `&type=USER_CREATED`;

        url = `${API_BASE_URL}/playlists?page=${currentPage}&size=${pageSize}&sort=${sortParam}${searchParam}${publicParam}${visibilityParam}${dateParam}${typeParam}`;
      }

      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(url, {
        credentials: 'include',
        headers
      });
      if (!res.ok) {
        if (res.status === 403) {
          console.error("[AdminPlaylists] 403 Forbidden - User does not have ADMIN role");
          toast({
            title: "Không có quyền truy cập",
            description: "Bạn cần đăng nhập với tài khoản ADMIN để truy cập trang này.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        if (res.status === 400) {
          // Try to get error message from response
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || errorData || "Bạn không có quyền truy cập tính năng này");
          } catch (e) {
            throw new Error("Bạn không có quyền truy cập tính năng này");
          }
        }
        throw new Error("Không thể tải danh sách playlist");
      }

      const data = await res.json();
      // Handle different response formats
      const playlistsData = Array.isArray(data) ? data : (data.content || []);
      const mapped = playlistsData.map((p: {
        id: number;
        name: string;
        description?: string | null;
        coverUrl?: string | null;
        visibility?: string;
        songLimit?: number | null;
        updatedAt?: string | null;
        createdAt?: string | null;
        createdDate?: string | null;
        dateUpdate?: string | null;
        songIds?: number[];
        songs?: unknown[];
        owner?: { id?: number; name?: string } | null;
        ownerId?: number;
        collaborators?: Array<{ userId?: number; id?: number }> | null;
        collaboratorList?: Array<{ userId?: number; id?: number }> | null;
        songCount?: number;
        totalSongs?: number;
        isBanned?: boolean;
        flaggedForReview?: boolean;
        banReason?: string | null;
        flagReason?: string | null;
        bannedAt?: string | null;
        bannedBy?: { id?: number; name?: string } | null;
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
          isBanned: p.isBanned || false,
          flaggedForReview: p.flaggedForReview || false,
          banReason: p.banReason || null,
          flagReason: p.flagReason || null,
          bannedAt: p.bannedAt || null,
          bannedBy: p.bannedBy || null,
          isWarned: (p as Playlist & { isWarned?: boolean }).isWarned ?? false,
          warningCount: (p as Playlist & { warningCount?: number }).warningCount ?? 0,
          warningReason: (p as Playlist & { warningReason?: string | null }).warningReason ?? null,
          warnedAt: (p as Playlist & { warnedAt?: string | null }).warnedAt || null,
          warnedBy: (p as Playlist & { warnedBy?: { id?: number; name?: string } | null }).warnedBy || null,
        };
      });
      setPlaylists(mapped);
      // Only set pagination for "all" tab
      if (activeTab === "all" && !Array.isArray(data)) {
        setTotalElements(data.totalElements || 0);
        setTotalPages(data.totalPages || 0);
      } else {
        setTotalElements(mapped.length);
        setTotalPages(1);
      }
    } catch (e) {
      toast({ title: "Lỗi", description: "Không thể tải danh sách playlist", variant: "destructive" });
    } finally { setLoading(false); }
  }, [currentPage, pageSize, searchQuery, filterPublic, filterVisibility, filterDate, sortBy, activeTab, navigate]);

  useEffect(() => {
    loadPlaylists(); 
    if (activeTab === "all") {
      setCurrentPage(0);
    }
  }, [loadPlaylists, activeTab]);

  // Reload playlists when window regains focus (e.g., after updating playlist name in another tab)
  useEffect(() => {
    const handleFocus = () => {
      loadPlaylists();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadPlaylists]);

  // Load total banned and flagged counts
  const loadCounts = useCallback(async () => {
      try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const [bannedRes, flaggedRes] = await Promise.all([
        fetch(`${API_BASE_URL}/playlists/admin/banned`, {
          credentials: 'include',
          headers
        }),
        fetch(`${API_BASE_URL}/playlists/admin/flagged`, {
          credentials: 'include',
          headers
        })
      ]);
      
      // Handle 403 errors silently for non-admin users
      if (bannedRes.status === 403 || flaggedRes.status === 403) {
        console.warn("[AdminPlaylists] 403 Forbidden - User does not have ADMIN role");
        setTotalBanned(0);
        setTotalFlagged(0);
        return;
      }
        
        if (bannedRes.ok) {
          try {
            const bannedData = await bannedRes.json();
            setTotalBanned(Array.isArray(bannedData) ? bannedData.length : 0);
      } catch (e) {
            setTotalBanned(0);
          }
        } else {
          // Silently handle errors (403, 400, etc.) - user might not have admin permissions
          setTotalBanned(0);
        }
        
        if (flaggedRes.ok) {
          try {
            const flaggedData = await flaggedRes.json();
            setTotalFlagged(Array.isArray(flaggedData) ? flaggedData.length : 0);
          } catch (e) {
            setTotalFlagged(0);
          }
        } else {
          // Silently handle errors (403, 400, etc.) - user might not have admin permissions
          setTotalFlagged(0);
      }
    } catch (e) {
      // Silently handle errors - user might not have admin permissions
      setTotalBanned(0);
      setTotalFlagged(0);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Hàm mở view dialog
  const handleViewPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setViewDialogOpen(true);
  };

  // Hàm mở ban dialog
  const handleBanPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setBanReason("");
    setBanDialogOpen(true);
  };

  // Hàm xử lý ban
  const handleConfirmBan = async () => {
    if (!selectedPlaylist || !banReason.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập lý do ban", variant: "destructive" });
      return;
    }

    setIsBanning(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/playlists/admin/${selectedPlaylist.id}/ban`, {
        method: "POST",
        headers,
        credentials: 'include',
        body: JSON.stringify({ reason: banReason })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Lỗi khi ban playlist");
      }

      toast({ 
        title: "Thành công", 
        description: `Playlist "${selectedPlaylist.name}" đã bị ban. Chủ sở hữu sẽ nhận được thông báo.` 
      });
      setBanDialogOpen(false);
      setBanReason("");
      // Tải lại danh sách và counts
      loadPlaylists();
      // Reload counts
      try {
        const token = getAuthToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const [bannedRes, flaggedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/playlists/admin/banned`, { 
            credentials: 'include',
            headers
          }),
          fetch(`${API_BASE_URL}/playlists/admin/flagged`, { 
            credentials: 'include',
            headers
          })
        ]);
        if (bannedRes.ok) {
          const bannedData = await bannedRes.json();
          setTotalBanned(Array.isArray(bannedData) ? bannedData.length : 0);
        }
        if (flaggedRes.ok) {
          const flaggedData = await flaggedRes.json();
          setTotalFlagged(Array.isArray(flaggedData) ? flaggedData.length : 0);
        }
      } catch (e) {
        // Silently handle errors
      }
    } catch (error) {
      toast({ 
        title: "Lỗi", 
        description: error instanceof Error ? error.message : "Không thể ban playlist", 
        variant: "destructive" 
      });
    } finally {
      setIsBanning(false);
    }
  };

  // Hàm mở warn dialog
  const handleWarnPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setWarnReason("");
    setWarnDialogOpen(true);
  };

  // Hàm xử lý warn
  const handleConfirmWarn = async () => {
    if (!selectedPlaylist || !warnReason.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập lý do cảnh báo", variant: "destructive" });
      return;
    }

    setIsWarning(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/playlists/admin/${selectedPlaylist.id}/warn`, {
        method: "POST",
        headers,
        credentials: 'include',
        body: JSON.stringify({ reason: warnReason })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Lỗi khi cảnh báo playlist");
      }

      toast({ 
        title: "Thành công", 
        description: `Playlist "${selectedPlaylist.name}" đã nhận cảnh báo. Chủ sở hữu sẽ nhận được thông báo.` 
      });
      setWarnDialogOpen(false);
      setWarnReason("");
      loadPlaylists();
      loadCounts();
    } catch (error) {
      toast({ 
        title: "Lỗi", 
        description: error instanceof Error ? error.message : "Không thể cảnh báo playlist", 
        variant: "destructive" 
      });
    } finally {
      setIsWarning(false);
    }
  };

  // Hàm xử lý unban
  const handleUnbanPlaylist = async () => {
    if (!selectedPlaylist) return;

    setIsUnbanning(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/playlists/admin/${selectedPlaylist.id}/unban`, {
        method: "POST",
        headers,
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Lỗi khi unban playlist");
      }

      toast({ 
        title: "Thành công", 
        description: `Playlist "${selectedPlaylist.name}" đã được unban.` 
      });
      setUnbanDialogOpen(false);
      loadPlaylists();
      loadCounts();
    } catch (error) {
      toast({ 
        title: "Lỗi", 
        description: error instanceof Error ? error.message : "Không thể unban playlist", 
        variant: "destructive" 
      });
    } finally {
      setIsUnbanning(false);
    }
  };

  // Hàm xử lý unwarn
  const handleConfirmUnwarn = async () => {
    if (!selectedPlaylist) return;

    setIsUnwarning(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/playlists/admin/${selectedPlaylist.id}/unwarn`, {
        method: "POST",
        headers,
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Lỗi khi gỡ cảnh báo playlist");
      }

      toast({ 
        title: "Thành công", 
        description: `Đã gỡ cảnh báo cho playlist "${selectedPlaylist.name}".` 
      });
      setUnwarnDialogOpen(false);
      loadPlaylists();
      loadCounts();
    } catch (error) {
      toast({ 
        title: "Lỗi", 
        description: error instanceof Error ? error.message : "Không thể gỡ cảnh báo playlist", 
        variant: "destructive" 
      });
    } finally {
      setIsUnwarning(false);
    }
  };

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
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section (match Albums page style) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Quản lý Playlists</h1>
              <div className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">{totalElements} playlists</Badge>
                {loading && <span className="text-xs">Đang tải...</span>}
            </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={loadPlaylists} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors">
              <Download className="w-4 h-4" /> Export
              </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)} disabled={isSubmitting} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors">
              <Upload className="w-4 h-4" /> Import
              </Button>
            </div>
          </div>

        <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-border mb-4">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(0);
              }}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
            >
              Tất cả Playlist
            </Button>
            <Button
              variant={activeTab === "flagged" ? "default" : "ghost"}
              onClick={() => {
                setActiveTab("flagged");
                setCurrentPage(0);
              }}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500"
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
              Cần Kiểm Duyệt ({totalFlagged})
            </Button>
            <Button
              variant={activeTab === "banned" ? "default" : "ghost"}
              onClick={() => {
                setActiveTab("banned");
                setCurrentPage(0);
              }}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500"
            >
              <Ban className="w-4 h-4 mr-2 text-red-500" />
              Bị Ban ({totalBanned})
            </Button>
          </div>

          <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search playlists..."
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
                      <SelectItem value="all">All visibility</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="FRIENDS_ONLY">Friends only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[180px] bg-background/50">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="date-newest">Date modified (Newest)</SelectItem>
                      <SelectItem value="date-oldest">Date modified (Oldest)</SelectItem>
                      <SelectItem value="songs-desc">Song count (Most)</SelectItem>
                      <SelectItem value="songs-asc">Song count (Least)</SelectItem>
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
                      <th className="p-2 text-left text-sm font-semibold">Visibility</th>
                      <th className="p-2 text-left text-sm font-semibold">Collab IDs</th>
                      <th className="p-2 text-left text-sm font-semibold">Cập nhật</th>
                      <th className="p-2 text-left text-sm font-semibold">Thao tác</th>
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
                            {p.coverUrl ? (
                              <img 
                                src={p.coverUrl || "/placeholder.svg"} 
                                alt="" 
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                                <Music className="w-5 h-5 text-purple-400" />
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-sm font-medium max-w-[150px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={p.name}>{p.name}</span>
                              {p.isBanned && (
                                <Badge variant="destructive" className="text-xs">Banned</Badge>
                              )}
                              {p.isWarned === true && !p.isBanned && (p.warningCount ?? 0) > 0 && (
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                                  ⚠️ Warned ({p.warningCount}/3)
                                </Badge>
                              )}
                              {p.flaggedForReview && !p.isBanned && !p.isWarned && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                                  Flagged
                                </Badge>
                              )}
                            </div>
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
                          <td className="p-2 text-sm">
                            <div className="flex items-center justify-start gap-2 min-w-[80px]">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewPlaylist(p)}
                                className="p-1 h-8 w-8 hover:bg-blue-600/30 flex-shrink-0"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4 text-blue-400" />
                              </Button>
                              {/* Logic hiển thị nút theo tab:
                                  - Tab "All": chỉ hiện View
                                  - Tab "Flagged" (Cần kiểm duyệt): hiện View + Warn + Ban
                                  - Tab "Banned" hoặc playlist bị banned: hiện View + Unban */}
                              {p.isBanned || activeTab === "banned" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPlaylist(p);
                                    setUnbanDialogOpen(true);
                                  }}
                                  className="p-1 h-8 w-8 hover:bg-green-600/30 flex-shrink-0"
                                  title="Unban playlist"
                                >
                                  <Ban className="w-4 h-4 text-green-400" />
                                </Button>
                              ) : activeTab === "flagged" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleWarnPlaylist(p)}
                                    className="p-1 h-8 w-8 hover:bg-yellow-600/30 flex-shrink-0"
                                    title="Cảnh báo playlist"
                                  >
                                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleBanPlaylist(p)}
                                className="p-1 h-8 w-8 hover:bg-red-600/30 flex-shrink-0"
                                title="Ban playlist"
                              >
                                <Ban className="w-4 h-4 text-red-400" />
                              </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              
              {/* Pagination */}
              {activeTab === "all" && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {playlists.length} / {totalElements} playlists
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(0)} disabled={currentPage === 0} className="h-8 w-8">
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="h-8 w-8">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {(() => {
                      const pages: number[] = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
                      const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
                      if (endPage - startPage + 1 < maxVisiblePages)
                        startPage = Math.max(0, endPage - maxVisiblePages + 1);
                      for (let i = startPage; i <= endPage; i++) pages.push(i);
                      return pages.map((p) => (
                        <Button
                          key={p}
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(p)}
                          className={`h-8 w-8 ${currentPage === p ? "bg-primary text-primary-foreground" : ""}`}
                        >
                          {p + 1}
                        </Button>
                      ));
                    })()}
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="h-8 w-8">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1} className="h-8 w-8">
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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

          {/* View Playlist Details Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Chi tiết Playlist</DialogTitle>
              </DialogHeader>
              {selectedPlaylist && (
                <div className="space-y-4">
                  {/* Ảnh và thông tin cơ bản */}
                  <div className="flex gap-6 items-start">
                    <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                      {selectedPlaylist.coverUrl ? (
                        <img 
                          src={selectedPlaylist.coverUrl} 
                          alt={selectedPlaylist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-20 h-20 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-4 pt-2">
                      <div>
                        <p className="text-2xl font-bold text-white">{selectedPlaylist.name}</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-background/50 rounded-lg p-3 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Owner</p>
                          <p className="text-sm font-mono text-green-400">{selectedPlaylist.ownerId || "—"}</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-3 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Visibility</p>
                          <p className={`text-sm font-medium ${
                            selectedPlaylist.visibility === 'PUBLIC' ? "text-green-400" :
                            selectedPlaylist.visibility === 'PRIVATE' ? "text-red-400" :
                            selectedPlaylist.visibility === 'FRIENDS_ONLY' ? "text-yellow-400" :
                            "text-gray-400"
                          }`}>
                            {selectedPlaylist.visibility === 'PUBLIC' ? "Public" :
                             selectedPlaylist.visibility === 'PRIVATE' ? "Private" :
                             selectedPlaylist.visibility === 'FRIENDS_ONLY' ? "Friends" :
                             "—"}
                          </p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-3 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Bài hát</p>
                          <p className="text-sm font-medium text-white">
                            {selectedPlaylist.songCount || selectedPlaylist.totalSongs || (Array.isArray(selectedPlaylist.songs) ? selectedPlaylist.songs.length : 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mô tả */}
                  {selectedPlaylist.description && (
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Mô tả</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{selectedPlaylist.description}</p>
                    </div>
                  )}

                  {/* Cập nhật */}
                  <div className="bg-background/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground">Cập nhật lần cuối: <span className="text-white font-normal">{selectedPlaylist.dateUpdate ? new Date(selectedPlaylist.dateUpdate).toLocaleDateString('vi-VN') : "—"}</span></p>
                  </div>

                  {/* Collaborators */}
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-3">Cộng tác viên</p>
                    {loadingCollaborators.has(selectedPlaylist.id) ? (
                      <p className="text-sm text-muted-foreground">Đang tải...</p>
                    ) : (
                      <div>
                        {collaboratorsMap[selectedPlaylist.id] && collaboratorsMap[selectedPlaylist.id].length > 0 ? (
                          <div className="space-y-2">
                            {collaboratorsMap[selectedPlaylist.id].map((collab, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-background/50 rounded-lg border border-border">
                                <div>
                                  <p className="font-medium text-white">{collab.name}</p>
                                  <p className="text-xs text-gray-400">{collab.email}</p>
                                </div>
                                <span className="text-xs font-mono bg-blue-600/30 px-2 py-1 rounded text-blue-300">
                                  {collab.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Không có cộng tác viên</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bài hát */}
                  {Array.isArray(selectedPlaylist.songs) && selectedPlaylist.songs.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Danh sách bài hát ({selectedPlaylist.songs.length})</p>
                      <div className="space-y-2 bg-background/50 rounded-lg p-4 max-h-[300px] overflow-y-auto border border-border">
                        {selectedPlaylist.songs.map((song: { id?: number; name?: string; title?: string }, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded hover:bg-muted/50 text-sm">
                            <span className="text-gray-300">{idx + 1}. {song.name || song.title || `Song`}</span>
                            <span className="text-xs text-gray-500">ID: {song.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Ban Playlist Dialog */}
          <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Ban Playlist: {selectedPlaylist?.name}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Bạn sắp ban playlist này vì vi phạm quy tắc cộng đồng
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400">
                    ⚠️ Hành động này sẽ:
                  </p>
                  <ul className="text-xs text-red-400 mt-2 space-y-1 ml-2">
                    <li>• Ẩn playlist khỏi tất cả mọi người</li>
                    <li>• Ngăn chủ sở hữu tiếp cận nó</li>
                    <li>• Ghi lại lý do vi phạm</li>
                  </ul>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    Lý do vi phạm quy tắc
                  </label>
                  <Select value={banReason} onValueChange={setBanReason}>
                    <SelectTrigger className="w-full bg-background/50 border border-border text-white">
                      <SelectValue placeholder="Chọn lý do ban..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {banReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="text-white focus:bg-primary/20">
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-background/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-gray-400">
                    <strong>Playlist:</strong> {selectedPlaylist?.name} (ID: {selectedPlaylist?.id})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    <strong>Owner:</strong> {selectedPlaylist?.ownerId || "Unknown"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBanDialogOpen(false)}
                  disabled={isBanning}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmBan}
                  disabled={isBanning || !banReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isBanning ? "Đang ban..." : "Ban Playlist"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Warn Playlist Dialog */}
          <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Cảnh báo Playlist
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Cảnh báo playlist này về vi phạm quy tắc. Sau 3 lần cảnh báo, playlist sẽ tự động bị ban.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-400">
                    ⚠️ Cảnh báo này sẽ:
                  </p>
                  <ul className="text-xs text-yellow-400 mt-2 space-y-1 ml-2">
                    <li>• Gửi thông báo cho chủ sở hữu</li>
                    <li>• Đánh dấu playlist là "Warned"</li>
                    <li>• Tự động ban sau {(selectedPlaylist?.warningCount || 0) + 1}/3 lần cảnh báo</li>
                  </ul>
        </div>
                
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    Lý do cảnh báo
                  </label>
                  <Select value={warnReason} onValueChange={setWarnReason}>
                    <SelectTrigger className="w-full bg-background/50 border border-border text-white">
                      <SelectValue placeholder="Chọn lý do cảnh báo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {warnReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="text-white focus:bg-primary/20">
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-background/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-gray-400">
                    <strong>Playlist:</strong> {selectedPlaylist?.name} (ID: {selectedPlaylist?.id})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    <strong>Owner:</strong> {selectedPlaylist?.ownerId || "Unknown"}
                  </p>
                  {selectedPlaylist?.warningCount && selectedPlaylist.warningCount > 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      <strong>Số lần cảnh báo hiện tại:</strong> {selectedPlaylist.warningCount}/3
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setWarnDialogOpen(false)}
                  disabled={isWarning}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmWarn}
                  disabled={isWarning || !warnReason.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isWarning ? "Đang cảnh báo..." : "Cảnh báo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Unwarn Playlist Dialog */}
          <Dialog open={unwarnDialogOpen} onOpenChange={setUnwarnDialogOpen}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-green-500" />
                  Gỡ Cảnh báo Playlist
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Bạn có chắc muốn gỡ cảnh báo cho playlist này?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-400">
                    ✅ Hành động này sẽ:
                  </p>
                  <ul className="text-xs text-green-400 mt-2 space-y-1 ml-2">
                    <li>• Gỡ trạng thái "Warned" khỏi playlist</li>
                    <li>• Giữ nguyên số lần cảnh báo (để theo dõi lịch sử)</li>
                    <li>• Playlist sẽ không còn hiển thị badge cảnh báo</li>
                  </ul>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-gray-400">
                    <strong>Playlist:</strong> {selectedPlaylist?.name} (ID: {selectedPlaylist?.id})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    <strong>Owner:</strong> {selectedPlaylist?.ownerId || "Unknown"}
                  </p>
                  {selectedPlaylist?.warningCount && selectedPlaylist.warningCount > 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      <strong>Số lần cảnh báo:</strong> {selectedPlaylist.warningCount}/3
                    </p>
                  )}
                  {selectedPlaylist?.warningReason && (
                    <p className="text-xs text-gray-400 mt-1">
                      <strong>Lý do cảnh báo:</strong> {selectedPlaylist.warningReason}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUnwarnDialogOpen(false)}
                  disabled={isUnwarning}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmUnwarn}
                  disabled={isUnwarning}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUnwarning ? "Đang xử lý..." : "Gỡ cảnh báo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Unban Playlist Dialog */}
          <Dialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Ban className="w-5 h-5 text-green-500" />
                  Unban Playlist
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Bạn có chắc muốn unban playlist này?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-400">
                    ✅ Hành động này sẽ:
                  </p>
                  <ul className="text-xs text-green-400 mt-2 space-y-1 ml-2">
                    <li>• Phục hồi playlist và hiển thị lại cho mọi người</li>
                    <li>• Chủ sở hữu sẽ nhận được thông báo phục hồi</li>
                    <li>• Reset cảnh báo về 0</li>
                  </ul>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-gray-400">
                    <strong>Playlist:</strong> {selectedPlaylist?.name} (ID: {selectedPlaylist?.id})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    <strong>Owner:</strong> {selectedPlaylist?.ownerId || "Unknown"}
                  </p>
                  {selectedPlaylist?.banReason && (
                    <p className="text-xs text-red-400 mt-1">
                      <strong>Lý do ban:</strong> {selectedPlaylist.banReason}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUnbanDialogOpen(false)}
                  disabled={isUnbanning}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleUnbanPlaylist}
                  disabled={isUnbanning}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUnbanning ? "Đang unban..." : "Unban Playlist"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminPlaylists;
