/* ======================
 *  AdminSystemPlaylists.tsx
 *  Quản lý System Playlists (Editorial, Global, Personalized)
 *  EchoVerse – Music Universe Platform
 * ====================== */

import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getAuthToken } from "@/services/api/config";
import {
  Sparkles, Music, RefreshCw, Plus, Edit, Trash2, Play, 
  Globe, Users, FileText, Calendar, Clock, Eye, X, Search, 
  Wand2, Filter, CheckCircle2, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight
} from "lucide-react";
import { playlistsApi, PlaylistDTO } from "@/services/api/playlistApi";
import { songsApi, Song } from "@/services/api/songApi";
import { genresApi } from "@/services/api";
import { moodsApi } from "@/services/api/moodApi";
import { uploadImage } from "@/config/cloudinary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toSeconds } from "@/utils/playlistUtils";

const API_BASE_URL = "http://localhost:8080/api";

type PlaylistType = "USER_CREATED" | "EDITORIAL" | "SYSTEM_GLOBAL" | "SYSTEM_PERSONALIZED";

interface SystemPlaylist extends PlaylistDTO {
  type?: PlaylistType;
  isSystemGenerated?: boolean;
  editorialTeam?: string | null;
  autoUpdateSchedule?: string | null;
  lastAutoUpdate?: string | null;
}

const AdminSystemPlaylists = () => {
  const [editorialPlaylists, setEditorialPlaylists] = useState<SystemPlaylist[]>([]);
  const [globalPlaylists, setGlobalPlaylists] = useState<SystemPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  // Chỉ dùng tab "global" – đã bỏ UI quản lý Editorial playlists
  const [activeTab, setActiveTab] = useState<"editorial" | "global">("global");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addSongsDialogOpen, setAddSongsDialogOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SystemPlaylist | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coverUrl: "",
    songIds: [] as number[],
  });
  
  // Image upload states
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Create dialog tabs
  const [createDialogTab, setCreateDialogTab] = useState<"info" | "songs">("info");

  // Add songs dialog states
  const [addSongsMode, setAddSongsMode] = useState<"recommend" | "search" | "manual">("recommend");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [moods, setMoods] = useState<{ id: number; name: string }[]>([]);
  const [playlistDetail, setPlaylistDetail] = useState<SystemPlaylist | null>(null);

  /* ===== LOAD DATA ===== */
  const loadEditorialPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Load all editorial playlists from dedicated endpoint
      const res = await fetch(`${API_BASE_URL}/playlists/editorial`, {
        credentials: 'include',
        headers
      });

      if (!res.ok) {
        if (res.status === 400) {
          console.warn("No editorial playlists found or database schema issue");
          setEditorialPlaylists([]);
          setTotalElements(0);
          setTotalPages(0);
          return;
        }
        throw new Error("Failed to load editorial playlists");
      }

      let allPlaylists: SystemPlaylist[] = [];
      const data = await res.json();
      allPlaylists = Array.isArray(data) ? data : [];

      // Apply search filter
      if (searchQuery.trim()) {
        allPlaylists = allPlaylists.filter((p: SystemPlaylist) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply sort
      allPlaylists.sort((a, b) => {
        switch (sortBy) {
          case "name-desc":
            return (b.name || "").localeCompare(a.name || "");
          case "name-asc":
            return (a.name || "").localeCompare(b.name || "");
          case "date-newest":
            return new Date(b.dateUpdate || 0).getTime() - new Date(a.dateUpdate || 0).getTime();
          case "date-oldest":
            return new Date(a.dateUpdate || 0).getTime() - new Date(b.dateUpdate || 0).getTime();
          case "songs-desc":
            return (b.songs?.length || 0) - (a.songs?.length || 0);
          case "songs-asc":
            return (a.songs?.length || 0) - (b.songs?.length || 0);
          default:
            return (a.name || "").localeCompare(b.name || "");
        }
      });

      // Calculate pagination
      const total = allPlaylists.length;
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize));

      // Apply pagination
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const paginated = allPlaylists.slice(start, end);
      setEditorialPlaylists(paginated);
    } catch (error) {
      console.error("Error loading editorial playlists:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách editorial playlists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, sortBy]);

  const loadGlobalPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Load all global playlists from dedicated endpoint
      const res = await fetch(`${API_BASE_URL}/playlists/system/global`, {
        credentials: 'include',
        headers
      });

      if (!res.ok) {
        if (res.status === 400) {
          console.warn("No global playlists found or database schema issue");
          setGlobalPlaylists([]);
          setTotalElements(0);
          setTotalPages(0);
          return;
        }
        throw new Error("Failed to load global playlists");
      }

      let allPlaylists: SystemPlaylist[] = [];
      const data = await res.json();
      allPlaylists = Array.isArray(data) ? data : [];

      // Apply search filter
      if (searchQuery.trim()) {
        allPlaylists = allPlaylists.filter((p: SystemPlaylist) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply sort
      allPlaylists.sort((a, b) => {
        switch (sortBy) {
          case "name-desc":
            return (b.name || "").localeCompare(a.name || "");
          case "name-asc":
            return (a.name || "").localeCompare(b.name || "");
          case "date-newest":
            return new Date(b.dateUpdate || b.lastAutoUpdate || 0).getTime() - new Date(a.dateUpdate || a.lastAutoUpdate || 0).getTime();
          case "date-oldest":
            return new Date(a.dateUpdate || a.lastAutoUpdate || 0).getTime() - new Date(b.dateUpdate || b.lastAutoUpdate || 0).getTime();
          case "songs-desc":
            return (b.songs?.length || 0) - (a.songs?.length || 0);
          case "songs-asc":
            return (a.songs?.length || 0) - (b.songs?.length || 0);
          default:
            return (a.name || "").localeCompare(b.name || "");
        }
      });

      // Calculate pagination
      const total = allPlaylists.length;
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize));

      // Apply pagination
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const paginated = allPlaylists.slice(start, end);
      setGlobalPlaylists(paginated);
    } catch (error) {
      console.error("Error loading global playlists:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách global playlists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, sortBy]);

  useEffect(() => {
    setLoading(true);
    if (activeTab === "editorial") {
      loadEditorialPlaylists().finally(() => setLoading(false));
    } else {
      loadGlobalPlaylists().finally(() => setLoading(false));
    }
  }, [activeTab, loadEditorialPlaylists, loadGlobalPlaylists]);

  // Load genres and moods
  useEffect(() => {
    const loadGenresAndMoods = async () => {
      try {
        const [genresRes, moodsRes] = await Promise.all([
          genresApi.getAll({ page: 0, size: 100 }),
          moodsApi.getAll({ page: 0, size: 100 })
        ]);
        setGenres(genresRes.content || []);
        setMoods(moodsRes.content || []);
      } catch (error) {
        console.error("Error loading genres/moods:", error);
      }
    };
    loadGenresAndMoods();
  }, []);

  /* ===== LOAD PLAYLIST DETAIL ===== */
  const loadPlaylistDetail = async (playlistId: number) => {
    try {
      const detail = await playlistsApi.getById(playlistId);
      setPlaylistDetail(detail);
    } catch (error) {
      console.error("Error loading playlist detail:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết playlist",
        variant: "destructive",
      });
    }
  };

  /* ===== OPEN VIEW DIALOG ===== */
  const openViewDialog = async (playlist: SystemPlaylist) => {
    setSelectedPlaylist(playlist);
    await loadPlaylistDetail(playlist.id);
    setViewDialogOpen(true);
  };

  /* ===== OPEN ADD SONGS DIALOG ===== */
  const openAddSongsDialog = (playlist: SystemPlaylist) => {
    setSelectedPlaylist(playlist);
    setAddSongsDialogOpen(true);
    setAddSongsMode("recommend");
    setSelectedGenre(null);
    setSelectedMood(null);
    setSelectedSongs(new Set());
    setRecommendedSongs([]);
    setSearchResults([]);
  };

  /* ===== LOAD RECOMMENDED SONGS ===== */
  const loadRecommendedSongs = async () => {
    try {
      let songs: Song[] = [];
      if (selectedGenre) {
        songs = await songsApi.recommendByGenre(selectedGenre, 30);
      } else if (selectedMood) {
        songs = await songsApi.recommendByMood(selectedMood, 30);
      }
      setRecommendedSongs(songs);
    } catch (error) {
      console.error("Error loading recommended songs:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải đề xuất",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (addSongsDialogOpen && addSongsMode === "recommend" && (selectedGenre || selectedMood)) {
      loadRecommendedSongs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre, selectedMood, addSongsDialogOpen, addSongsMode]);

  // Load recommended songs in create dialog
  useEffect(() => {
    if (createDialogOpen && createDialogTab === "songs" && addSongsMode === "recommend" && (selectedGenre || selectedMood)) {
      loadRecommendedSongs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre, selectedMood, createDialogOpen, createDialogTab, addSongsMode]);

  /* ===== SEARCH SONGS ===== */
  const handleSearchSongs = async () => {
    if (!songSearchQuery.trim()) return;
    try {
      const results = await songsApi.searchPublic({ query: songSearchQuery, size: 20, page: 0 });
      setSearchResults(results.content || []);
    } catch (error) {
      console.error("Error searching songs:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tìm kiếm",
        variant: "destructive",
      });
    }
  };
  
  /* ===== PAGINATION HELPERS ===== */
  const goToPage = (page: number) => setCurrentPage(page);
  const goToFirstPage = () => setCurrentPage(0);
  const goToLastPage = () => setCurrentPage(totalPages - 1);
  const goToPrev = () => setCurrentPage(p => Math.max(0, p - 1));
  const goToNext = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));
  
  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  /* ===== ADD SONGS TO PLAYLIST ===== */
  const handleAddSongsToPlaylist = async () => {
    if (!selectedPlaylist || selectedSongs.size === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một bài hát",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const songIds = Array.from(selectedSongs);
      await playlistsApi.addSongs(selectedPlaylist.id, songIds);

      toast({
        title: "Thành công",
        description: `Đã thêm ${songIds.length} bài hát vào playlist`,
      });

      setAddSongsDialogOpen(false);
      setSelectedSongs(new Set());
      if (activeTab === "editorial") {
        loadEditorialPlaylists();
      } else {
        loadGlobalPlaylists();
      }
      if (viewDialogOpen) {
        await loadPlaylistDetail(selectedPlaylist.id);
      }
    } catch (error) {
      console.error("Error adding songs:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể thêm songs",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== REMOVE SONG FROM PLAYLIST ===== */
  const handleRemoveSong = async (songId: number) => {
    if (!selectedPlaylist) return;

    setIsSubmitting(true);
    try {
      await playlistsApi.removeSong(selectedPlaylist.id, songId);
      toast({
        title: "Thành công",
        description: "Đã xóa bài hát khỏi playlist",
      });
      await loadPlaylistDetail(selectedPlaylist.id);
      if (activeTab === "editorial") {
        loadEditorialPlaylists();
      } else {
        loadGlobalPlaylists();
      }
    } catch (error) {
      console.error("Error removing song:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa bài hát",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== HANDLE COVER IMAGE UPLOAD ===== */
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file ảnh",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "Kích thước file không được vượt quá 5MB",
        variant: "destructive",
      });
      return;
    }

    setCoverFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /* ===== CREATE EDITORIAL PLAYLIST ===== */
  const handleCreateEditorial = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên playlist không được để trống",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let coverUrl = formData.coverUrl;
      
      // Upload image if file is selected
      if (coverFile) {
        setUploadingImage(true);
        try {
          const uploadResult = await uploadImage(coverFile);
          coverUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast({
            title: "Lỗi",
            description: "Không thể upload ảnh. Vui lòng thử lại.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Set default cover if no cover provided
      if (!coverUrl) {
        // Try to get cover from first song's album if songs are selected
        if (formData.songIds.length > 0) {
          try {
            const firstSong = await songsApi.getById(formData.songIds[0].toString());
            if (firstSong?.urlImageAlbum) {
              coverUrl = firstSong.urlImageAlbum;
            }
          } catch (e) {
            // Ignore error, use default
          }
        }
        // If still no cover, don't set coverUrl - frontend will use /placeholder.svg (music note icon)
        // Không set coverUrl nếu không có - frontend sẽ tự động dùng /placeholder.svg
      }

      const res = await fetch(`${API_BASE_URL}/playlists/editorial`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          coverUrl: coverUrl || null, // Không set URL Cloudinary - frontend sẽ dùng /placeholder.svg
          visibility: "PUBLIC",
          songIds: formData.songIds.length > 0 ? formData.songIds : null,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to create editorial playlist");
      }

      const createdPlaylist = await res.json();
      
      // Ensure we have a valid playlist ID
      if (!createdPlaylist || !createdPlaylist.id) {
        throw new Error("Invalid response from server: playlist ID not found");
      }

      // If songs were selected, add them
      if (formData.songIds.length > 0 && createdPlaylist.id) {
        try {
          await playlistsApi.addSongs(createdPlaylist.id, formData.songIds);
        } catch (addSongsError) {
          console.error("Error adding songs:", addSongsError);
          // Don't fail the whole operation, just warn
          toast({
            title: "Cảnh báo",
            description: "Playlist đã được tạo nhưng có lỗi khi thêm songs. Bạn có thể thêm sau.",
            variant: "default",
          });
        }
      }

      toast({
        title: "Thành công",
        description: "Đã tạo editorial playlist thành công",
      });

      setCreateDialogOpen(false);
      setFormData({ name: "", description: "", coverUrl: "", songIds: [] });
      setCoverFile(null);
      setCoverPreview(null);
      setSelectedSongs(new Set());
      setCreateDialogTab("info");
      loadEditorialPlaylists();
    } catch (error) {
      console.error("Error creating editorial playlist:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể tạo editorial playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== UPDATE EDITORIAL PLAYLIST ===== */
  const handleUpdateEditorial = async () => {
    if (!selectedPlaylist || !formData.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên playlist không được để trống",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await playlistsApi.update(selectedPlaylist.id, {
        name: formData.name,
        description: formData.description || null,
        coverUrl: formData.coverUrl || null,
      });

      toast({
        title: "Thành công",
        description: "Đã cập nhật editorial playlist thành công",
      });

      setEditDialogOpen(false);
      setSelectedPlaylist(null);
      setFormData({ name: "", description: "", coverUrl: "", songIds: [] });
      loadEditorialPlaylists();
    } catch (error) {
      console.error("Error updating editorial playlist:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể cập nhật editorial playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== INITIALIZE GLOBAL PLAYLISTS ===== */
  const handleInitializeGlobal = async () => {
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/playlists/system/global/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to initialize global playlists");
      }

      toast({
        title: "Thành công",
        description: "Đã khởi tạo global playlists thành công",
      });

      loadGlobalPlaylists();
    } catch (error) {
      console.error("Error initializing global playlists:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể khởi tạo global playlists",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== UPDATE GLOBAL PLAYLISTS ===== */
  const handleUpdateGlobal = async () => {
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/playlists/system/global/update`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update global playlists");
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật global playlists thành công",
      });

      loadGlobalPlaylists();
    } catch (error) {
      console.error("Error updating global playlists:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể cập nhật global playlists",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== INITIALIZE GENRE/MOOD PLAYLISTS ===== */
  const handleInitializeGenreMood = async () => {
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/playlists/system/genre-mood/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to initialize genre/mood playlists");
      }

      toast({
        title: "Thành công",
        description: "Đã khởi tạo genre/mood playlists thành công",
      });

      loadGlobalPlaylists();
    } catch (error) {
      console.error("Error initializing genre/mood playlists:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể khởi tạo genre/mood playlists",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== OPEN EDIT DIALOG ===== */
  const openEditDialog = (playlist: SystemPlaylist) => {
    setSelectedPlaylist(playlist);
    setFormData({
      name: playlist.name,
      description: playlist.description || "",
      coverUrl: playlist.coverUrl || "",
      songIds: [],
    });
    setEditDialogOpen(true);
  };

  const getTypeBadge = (type?: PlaylistType) => {
    switch (type) {
      case "EDITORIAL":
        return <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">By EchoVerse</Badge>;
      case "SYSTEM_GLOBAL":
        return <Badge className="bg-green-500/20 text-green-200 border-green-400/30">Auto-Generated</Badge>;
      case "SYSTEM_PERSONALIZED":
        return <Badge className="bg-pink-500/20 text-pink-200 border-pink-400/30">For You</Badge>;
      default:
        return null;
    }
  };

  // Helper function to get playlist cover image
  const getPlaylistCoverImage = (playlist: SystemPlaylist): string => {
    // 1. Use coverUrl if available
    if (playlist.coverUrl) {
      return playlist.coverUrl;
    }
    
    // 2. Use first song's album image if available
    if (playlist.songs && playlist.songs.length > 0) {
      const firstSong = playlist.songs[0];
      if (firstSong?.urlImageAlbum) {
        return firstSong.urlImageAlbum;
      }
    }
    
    // 3. Try to get image from genre/mood based on playlist name
    // Check if playlist name contains genre or mood keywords
    const playlistName = playlist.name?.toLowerCase() || "";
    
    // Find matching genre
    const matchingGenre = genres.find(g => 
      playlistName.includes(g.name.toLowerCase())
    );
    if (matchingGenre && (matchingGenre as any).iconUrl) {
      return (matchingGenre as any).iconUrl;
    }
    
    // Find matching mood
    const matchingMood = moods.find(m => 
      playlistName.includes(m.name.toLowerCase())
    );
    if (matchingMood && (matchingMood as any).iconUrl) {
      return (matchingMood as any).iconUrl;
    }
    
    // 4. Return placeholder.svg (music note icon) - giống như bài hát không có ảnh
    return "/placeholder.svg";
  };

  // Default placeholder image
  const DEFAULT_PLAYLIST_COVER = "/placeholder.svg";

  // Helper function để tính tổng duration từ danh sách songs
  const calculateTotalDuration = (songs: any[] | undefined): number => {
    if (!Array.isArray(songs) || songs.length === 0) return 0;
    return songs.reduce((total, song) => {
      const raw = (song as any)?.duration ?? (song as any)?.durationMs ?? 0;
      const seconds = toSeconds(raw);
      return total + (Number.isFinite(seconds) ? seconds : 0);
    }, 0);
  };

  // Helper function để format duration
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Global Playlists</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý các playlist hệ thống (Top 50, Top 100, Trending, Genre/Mood)
          </p>
        </div>
      </div>

      {/* Tabs – chỉ giữ lại tab Global */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "global" ? "default" : "ghost"}
          onClick={() => setActiveTab("global")}
          className="rounded-b-none"
        >
          <Globe className="w-4 h-4 mr-2" />
          System Global Playlists
        </Button>
      </div>

      {/* Editorial Playlists Tab */}
      {activeTab === "editorial" && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
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
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[180px] bg-background/50">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Tên (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Tên (Z-A)</SelectItem>
                  <SelectItem value="date-newest">Ngày cập nhật (Mới nhất)</SelectItem>
                  <SelectItem value="date-oldest">Ngày cập nhật (Cũ nhất)</SelectItem>
                  <SelectItem value="songs-desc">Số bài hát (Nhiều nhất)</SelectItem>
                  <SelectItem value="songs-asc">Số bài hát (Ít nhất)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                  title="Số lượng playlist hiển thị mỗi trang"
                  aria-label="Số lượng playlist hiển thị mỗi trang"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : editorialPlaylists.length === 0 ? (
              <div className="text-center py-8">Không có playlist nào</div>
            ) : (
              <>
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2 text-left text-sm font-semibold">STT</th>
                      <th className="p-2 text-left text-sm font-semibold">Ảnh</th>
                      <th className="p-2 text-left text-sm font-semibold">Tên</th>
                      <th className="p-2 text-left text-sm font-semibold">Mô tả</th>
                      <th className="p-2 text-left text-sm font-semibold">Số bài</th>
                      <th className="p-2 text-left text-sm font-semibold">Thời lượng</th>
                      <th className="p-2 text-left text-sm font-semibold">Cập nhật</th>
                      <th className="p-2 text-left text-sm font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editorialPlaylists.map((p, i) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-2 text-sm">{currentPage * pageSize + i + 1}</td>
                        <td className="p-2">
                          {(() => {
                            const coverImage = getPlaylistCoverImage(p);
                            // Nếu là placeholder.svg hoặc không có ảnh hợp lệ, hiển thị icon nốt nhạc
                            if (!coverImage || coverImage === "/placeholder.svg" || coverImage === DEFAULT_PLAYLIST_COVER) {
                              return (
                            <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                              <Music className="w-5 h-5 text-purple-400" />
                            </div>
                              );
                            }
                            return (
                              <img 
                                src={coverImage} 
                                alt="" 
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => {
                                  // Nếu ảnh load lỗi, hiển thị icon nốt nhạc thay vì broken image
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent && !parent.querySelector('.music-placeholder')) {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center music-placeholder';
                                    placeholder.innerHTML = '<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>';
                                    parent.appendChild(placeholder);
                                  }
                                }}
                              />
                            );
                          })()}
                        </td>
                        <td className="p-2 text-sm font-medium max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="truncate" title={p.name}>{p.name}</span>
                            {getTypeBadge(p.type)}
                          </div>
                        </td>
                        <td className="p-2 text-sm max-w-[200px]">
                          <span className="truncate block">{p.description || "—"}</span>
                        </td>
                        <td className="p-2 text-sm">{p.songs?.length || 0} bài</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {formatDuration(calculateTotalDuration(p.songs))}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {p.dateUpdate ? new Date(p.dateUpdate).toLocaleDateString('vi-VN') : "—"}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openViewDialog(p)}
                              className="p-1 h-8 w-8 hover:bg-blue-600/30"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(p)}
                              className="p-1 h-8 w-8 hover:bg-green-600/30"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4 text-green-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {editorialPlaylists.length} / {totalElements} playlists
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0} className="h-8 w-8">
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={goToPrev} disabled={currentPage === 0} className="h-8 w-8">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {getPageNumbers().map((p) => (
                        <Button
                          key={p}
                          variant="outline"
                          size="icon"
                          onClick={() => goToPage(p)}
                          className={`h-8 w-8 ${currentPage === p ? "bg-primary text-primary-foreground" : ""}`}
                        >
                          {p + 1}
                        </Button>
                      ))}
                      <Button variant="outline" size="icon" onClick={goToNext} disabled={currentPage >= totalPages - 1} className="h-8 w-8">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={goToLastPage} disabled={currentPage >= totalPages - 1} className="h-8 w-8">
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global Playlists Tab */}
      {activeTab === "global" && (
        <div className="space-y-4">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>System Global Playlists Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleInitializeGlobal}
                disabled={isSubmitting}
                variant="outline"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Khởi tạo Global Playlists
              </Button>
              <Button
                onClick={handleUpdateGlobal}
                disabled={isSubmitting}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
                Cập nhật Global Playlists
              </Button>
              <Button
                onClick={handleInitializeGenreMood}
                disabled={isSubmitting}
                variant="outline"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Khởi tạo Genre/Mood Playlists
              </Button>
              </div>
            </CardContent>
          </Card>

          {/* Global Playlists Table */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
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
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(0); }}>
                  <SelectTrigger className="w-[180px] bg-background/50">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Tên (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Tên (Z-A)</SelectItem>
                    <SelectItem value="date-newest">Ngày cập nhật (Mới nhất)</SelectItem>
                    <SelectItem value="date-oldest">Ngày cập nhật (Cũ nhất)</SelectItem>
                    <SelectItem value="songs-desc">Số bài hát (Nhiều nhất)</SelectItem>
                    <SelectItem value="songs-asc">Số bài hát (Ít nhất)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Hiển thị:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(0);
                    }}
                    className="bg-background border border-border rounded px-2 py-1 text-sm"
                    title="Số lượng playlist hiển thị mỗi trang"
                    aria-label="Số lượng playlist hiển thị mỗi trang"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : globalPlaylists.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Chưa có global playlist nào</p>
                  <Button onClick={handleInitializeGlobal} variant="outline">
                    Khởi tạo Global Playlists
                  </Button>
                </div>
              ) : (
                <>
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-2 text-left text-sm font-semibold">STT</th>
                        <th className="p-2 text-left text-sm font-semibold">Ảnh</th>
                        <th className="p-2 text-left text-sm font-semibold">Tên</th>
                        <th className="p-2 text-left text-sm font-semibold">Mô tả</th>
                        <th className="p-2 text-left text-sm font-semibold">Số bài</th>
                        <th className="p-2 text-left text-sm font-semibold">Thời lượng</th>
                        <th className="p-2 text-left text-sm font-semibold">Lịch cập nhật</th>
                        <th className="p-2 text-left text-sm font-semibold">Cập nhật lần cuối</th>
                        <th className="p-2 text-left text-sm font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalPlaylists.map((p, i) => (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-2 text-sm">{currentPage * pageSize + i + 1}</td>
                          <td className="p-2">
                            {(() => {
                              const coverImage = getPlaylistCoverImage(p);
                              // Nếu là placeholder.svg hoặc không có ảnh hợp lệ, hiển thị icon nốt nhạc
                              if (!coverImage || coverImage === "/placeholder.svg" || coverImage === DEFAULT_PLAYLIST_COVER) {
                                return (
                                  <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                                    <Music className="w-5 h-5 text-purple-400" />
                              </div>
                                );
                              }
                              return (
                                <img 
                                  src={coverImage} 
                                  alt="" 
                                  className="w-10 h-10 rounded object-cover"
                                  onError={(e) => {
                                    // Nếu ảnh load lỗi, hiển thị icon nốt nhạc thay vì broken image
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent && !parent.querySelector('.music-placeholder')) {
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center music-placeholder';
                                      placeholder.innerHTML = '<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>';
                                      parent.appendChild(placeholder);
                                    }
                                  }}
                                />
                              );
                            })()}
                          </td>
                          <td className="p-2 text-sm font-medium max-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={p.name}>{p.name}</span>
                              {getTypeBadge(p.type)}
                            </div>
                          </td>
                          <td className="p-2 text-sm max-w-[200px]">
                            <span className="truncate block">{p.description || "—"}</span>
                          </td>
                          <td className="p-2 text-sm">{p.songs?.length || 0} bài</td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {formatDuration(calculateTotalDuration(p.songs))}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {p.autoUpdateSchedule || "—"}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {p.lastAutoUpdate ? new Date(p.lastAutoUpdate).toLocaleString('vi-VN') : "—"}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openViewDialog(p)}
                              className="p-1 h-8 w-8 hover:bg-blue-600/30"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Hiển thị {globalPlaylists.length} / {totalElements} playlists
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0} className="h-8 w-8">
                          <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={goToPrev} disabled={currentPage === 0} className="h-8 w-8">
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        {getPageNumbers().map((p) => (
                          <Button
                            key={p}
                            variant="outline"
                            size="icon"
                            onClick={() => goToPage(p)}
                            className={`h-8 w-8 ${currentPage === p ? "bg-primary text-primary-foreground" : ""}`}
                          >
                            {p + 1}
                          </Button>
                        ))}
                        <Button variant="outline" size="icon" onClick={goToNext} disabled={currentPage >= totalPages - 1} className="h-8 w-8">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={goToLastPage} disabled={currentPage >= totalPages - 1} className="h-8 w-8">
                          <ChevronsRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Editorial Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          // Reset form when closing
          setFormData({ name: "", description: "", coverUrl: "", songIds: [] });
          setCoverFile(null);
          setCoverPreview(null);
          setSelectedSongs(new Set());
          setCreateDialogTab("info");
          setSelectedGenre(null);
          setSelectedMood(null);
          setRecommendedSongs([]);
          setSearchResults([]);
          setSongSearchQuery("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Tạo Editorial Playlist</DialogTitle>
            <DialogDescription>
              Tạo playlist mới do đội biên tập EchoVerse quản lý
            </DialogDescription>
          </DialogHeader>
          
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <Button
              variant={createDialogTab === "info" ? "default" : "ghost"}
              onClick={() => setCreateDialogTab("info")}
              className="rounded-b-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              Thông tin
            </Button>
            <Button
              variant={createDialogTab === "songs" ? "default" : "ghost"}
              onClick={() => setCreateDialogTab("songs")}
              className="rounded-b-none"
            >
              <Music className="w-4 h-4 mr-2" />
              Bài hát ({selectedSongs.size})
            </Button>
          </div>

          <ScrollArea className="max-h-[50vh]">
            {/* Info Tab */}
            {createDialogTab === "info" && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Tên playlist *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Today's Top Hits"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mô tả</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả playlist..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Cover Image</label>
                  <div className="space-y-2">
                    {coverPreview ? (
                      <div className="relative">
                        <img
                          src={coverPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setCoverFile(null);
                            setCoverPreview(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverFileChange}
                          className="hidden"
                          id="cover-upload"
                        />
                        <label
                          htmlFor="cover-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <Music className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click để upload ảnh hoặc kéo thả vào đây
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PNG, JPG, GIF tối đa 5MB
                          </span>
                        </label>
                      </div>
                    )}
                    {!coverPreview && (
                      <div className="text-sm text-muted-foreground">
                        Hoặc nhập URL:
                        <Input
                          value={formData.coverUrl}
                          onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                  <p className="text-sm text-indigo-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Playlist này sẽ được đánh dấu là "By EchoVerse" và do đội biên tập quản lý
                  </p>
                </div>
              </div>
            )}

            {/* Songs Tab */}
            {createDialogTab === "songs" && (
              <div className="space-y-4 py-4">
                {/* Mode Tabs */}
                <div className="flex gap-2 border-b">
                  <Button
                    variant={addSongsMode === "recommend" ? "default" : "ghost"}
                    onClick={() => setAddSongsMode("recommend")}
                    className="rounded-b-none"
                    size="sm"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Đề xuất
                  </Button>
                  <Button
                    variant={addSongsMode === "search" ? "default" : "ghost"}
                    onClick={() => setAddSongsMode("search")}
                    className="rounded-b-none"
                    size="sm"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Tìm kiếm
                  </Button>
                </div>

                {/* Recommend Mode */}
                {addSongsMode === "recommend" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Genre</label>
                        <Select
                          value={selectedGenre?.toString() || undefined}
                          onValueChange={(value) => {
                            if (value && value !== "undefined") {
                              setSelectedGenre(Number(value));
                              setSelectedMood(null);
                            } else {
                              setSelectedGenre(null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn genre" />
                          </SelectTrigger>
                          <SelectContent>
                            {genres.map((genre) => (
                              <SelectItem key={genre.id} value={genre.id.toString()}>
                                {genre.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Mood</label>
                        <Select
                          value={selectedMood?.toString() || undefined}
                          onValueChange={(value) => {
                            if (value && value !== "undefined") {
                              setSelectedMood(Number(value));
                              setSelectedGenre(null);
                            } else {
                              setSelectedMood(null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn mood" />
                          </SelectTrigger>
                          <SelectContent>
                            {moods.map((mood) => (
                              <SelectItem key={mood.id} value={mood.id.toString()}>
                                {mood.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {recommendedSongs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Đề xuất ({recommendedSongs.length})</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {recommendedSongs.map((song) => (
                            <div
                              key={song.id}
                              className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
                              onClick={() => {
                                const newSelected = new Set(selectedSongs);
                                if (newSelected.has(Number(song.id))) {
                                  newSelected.delete(Number(song.id));
                                } else {
                                  newSelected.add(Number(song.id));
                                }
                                setSelectedSongs(newSelected);
                                setFormData({ ...formData, songIds: Array.from(newSelected) });
                              }}
                            >
                              <Checkbox
                                checked={selectedSongs.has(Number(song.id))}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedSongs);
                                  if (checked) {
                                    newSelected.add(Number(song.id));
                                  } else {
                                    newSelected.delete(Number(song.id));
                                  }
                                  setSelectedSongs(newSelected);
                                  setFormData({ ...formData, songIds: Array.from(newSelected) });
                                }}
                              />
                              {song.urlImageAlbum && (
                                <img
                                  src={song.urlImageAlbum}
                                  alt={song.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{song.name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {typeof song.artists === 'string' ? song.artists : 
                                   Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : 
                                   'Unknown Artist'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selectedGenre && !selectedMood && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Chọn Genre hoặc Mood để xem đề xuất</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Search Mode */}
                {addSongsMode === "search" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={songSearchQuery}
                        onChange={(e) => setSongSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm bài hát..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSearchSongs();
                          }
                        }}
                      />
                      <Button onClick={handleSearchSongs}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Kết quả ({searchResults.length})</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {searchResults.map((song) => (
                            <div
                              key={song.id}
                              className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
                              onClick={() => {
                                const newSelected = new Set(selectedSongs);
                                if (newSelected.has(Number(song.id))) {
                                  newSelected.delete(Number(song.id));
                                } else {
                                  newSelected.add(Number(song.id));
                                }
                                setSelectedSongs(newSelected);
                                setFormData({ ...formData, songIds: Array.from(newSelected) });
                              }}
                            >
                              <Checkbox
                                checked={selectedSongs.has(Number(song.id))}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedSongs);
                                  if (checked) {
                                    newSelected.add(Number(song.id));
                                  } else {
                                    newSelected.delete(Number(song.id));
                                  }
                                  setSelectedSongs(newSelected);
                                  setFormData({ ...formData, songIds: Array.from(newSelected) });
                                }}
                              />
                              {song.urlImageAlbum && (
                                <img
                                  src={song.urlImageAlbum}
                                  alt={song.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{song.name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {typeof song.artists === 'string' ? song.artists : 
                                   Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : 
                                   'Unknown Artist'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {createDialogTab === "songs" && (
                <span className="text-sm text-muted-foreground">
                  Đã chọn: {selectedSongs.size} bài hát
                </span>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Hủy
                </Button>
                {createDialogTab === "info" && (
                  <Button onClick={() => setCreateDialogTab("songs")} variant="outline">
                    Tiếp theo: Chọn Songs
                  </Button>
                )}
                {createDialogTab === "songs" && (
                  <Button onClick={() => setCreateDialogTab("info")} variant="outline">
                    Quay lại
                  </Button>
                )}
                <Button 
                  onClick={handleCreateEditorial} 
                  disabled={isSubmitting || uploadingImage || !formData.name.trim()}
                >
                  {uploadingImage ? "Đang upload ảnh..." : 
                   isSubmitting ? "Đang tạo..." : 
                   "Tạo Playlist"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Editorial Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Editorial Playlist</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin playlist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tên playlist *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Today's Top Hits"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả playlist..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cover URL</label>
              <Input
                value={formData.coverUrl}
                onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateEditorial} disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Playlist Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {playlistDetail?.name || selectedPlaylist?.name}
              {getTypeBadge(playlistDetail?.type || selectedPlaylist?.type)}
            </DialogTitle>
            <DialogDescription>
              {playlistDetail?.description || selectedPlaylist?.description}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {playlistDetail?.songs && playlistDetail.songs.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Danh sách bài hát ({playlistDetail.songs.length})</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedPlaylist) {
                          openAddSongsDialog(selectedPlaylist);
                          setViewDialogOpen(false);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm Songs
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {playlistDetail.songs.map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-muted-foreground w-8">{index + 1}</span>
                          {song.urlImageAlbum && (
                            <img
                              src={song.urlImageAlbum}
                              alt={song.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{song.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {typeof song.artists === 'string' ? song.artists : 
                               Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : 
                               'Unknown Artist'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSong(Number(song.id))}
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có bài hát nào trong playlist</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      if (selectedPlaylist) {
                        openAddSongsDialog(selectedPlaylist);
                        setViewDialogOpen(false);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm Songs
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Songs Dialog */}
      <Dialog open={addSongsDialogOpen} onOpenChange={setAddSongsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Thêm Songs vào Playlist</DialogTitle>
            <DialogDescription>
              Thêm bài hát vào {selectedPlaylist?.name}
            </DialogDescription>
          </DialogHeader>
          
          {/* Mode Tabs */}
          <div className="flex gap-2 border-b">
            <Button
              variant={addSongsMode === "recommend" ? "default" : "ghost"}
              onClick={() => setAddSongsMode("recommend")}
              className="rounded-b-none"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Đề xuất
            </Button>
            <Button
              variant={addSongsMode === "search" ? "default" : "ghost"}
              onClick={() => setAddSongsMode("search")}
              className="rounded-b-none"
            >
              <Search className="w-4 h-4 mr-2" />
              Tìm kiếm
            </Button>
          </div>

          <ScrollArea className="max-h-[50vh]">
            {/* Recommend Mode */}
            {addSongsMode === "recommend" && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Genre</label>
                    <Select
                      value={selectedGenre?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedGenre(value ? Number(value) : null);
                        setSelectedMood(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {genres.map((genre) => (
                          <SelectItem key={genre.id} value={genre.id.toString()}>
                            {genre.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Mood</label>
                    <Select
                      value={selectedMood?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedMood(value ? Number(value) : null);
                        setSelectedGenre(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mood" />
                      </SelectTrigger>
                      <SelectContent>
                        {moods.map((mood) => (
                          <SelectItem key={mood.id} value={mood.id.toString()}>
                            {mood.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {recommendedSongs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Đề xuất ({recommendedSongs.length})</h4>
                    <div className="space-y-2">
                      {recommendedSongs.map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => {
                            const newSelected = new Set(selectedSongs);
                            if (newSelected.has(Number(song.id))) {
                              newSelected.delete(Number(song.id));
                            } else {
                              newSelected.add(Number(song.id));
                            }
                            setSelectedSongs(newSelected);
                          }}
                        >
                          <Checkbox
                            checked={selectedSongs.has(Number(song.id))}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedSongs);
                              if (checked) {
                                newSelected.add(Number(song.id));
                              } else {
                                newSelected.delete(Number(song.id));
                              }
                              setSelectedSongs(newSelected);
                            }}
                          />
                          {song.urlImageAlbum && (
                            <img
                              src={song.urlImageAlbum}
                              alt={song.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{song.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {typeof song.artists === 'string' ? song.artists : 
                               Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : 
                               'Unknown Artist'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedGenre && !selectedMood && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chọn Genre hoặc Mood để xem đề xuất</p>
                  </div>
                )}
              </div>
            )}

            {/* Search Mode */}
            {addSongsMode === "search" && (
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Input
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bài hát..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSongs();
                      }
                    }}
                  />
                  <Button onClick={handleSearchSongs}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Kết quả ({searchResults.length})</h4>
                    <div className="space-y-2">
                      {searchResults.map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => {
                            const newSelected = new Set(selectedSongs);
                            if (newSelected.has(Number(song.id))) {
                              newSelected.delete(Number(song.id));
                            } else {
                              newSelected.add(Number(song.id));
                            }
                            setSelectedSongs(newSelected);
                          }}
                        >
                          <Checkbox
                            checked={selectedSongs.has(Number(song.id))}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedSongs);
                              if (checked) {
                                newSelected.add(Number(song.id));
                              } else {
                                newSelected.delete(Number(song.id));
                              }
                              setSelectedSongs(newSelected);
                            }}
                          />
                          {song.urlImageAlbum && (
                            <img
                              src={song.urlImageAlbum}
                              alt={song.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{song.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {typeof song.artists === 'string' ? song.artists : 
                               Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : 
                               'Unknown Artist'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                Đã chọn: {selectedSongs.size} bài hát
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAddSongsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleAddSongsToPlaylist}
                  disabled={isSubmitting || selectedSongs.size === 0}
                >
                  {isSubmitting ? "Đang thêm..." : `Thêm ${selectedSongs.size} bài hát`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSystemPlaylists;

