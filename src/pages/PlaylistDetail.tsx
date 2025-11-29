import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Heart, MoreHorizontal, Users, Plus, Search, Edit, LogOut, User as UserIcon, Music, Shuffle, Share2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMusic, Song } from "@/contexts/MusicContext";
import { playlistsApi, PlaylistDTO, playlistCollabInvitesApi, playlistCollaboratorsApi, PlaylistPermissionError } from "@/services/api/playlistApi";
import { songsApi } from "@/services/api/songApi";
import { songMoodApi } from "@/services/api/songMoodApi";
import { buildJsonHeaders, API_BASE_URL } from "@/services/api";
import { mapToPlayerSong } from "@/lib/utils";
import { friendsApi } from "@/services/api/friendsApi";
import { userApi } from "@/services/api/userApi";
import { uploadImage } from "@/config/cloudinary";
import { PlaylistVisibility, CollaboratorRole } from "@/types/playlist";
import { getPlaylistPermissions, checkIfFriends } from "@/utils/playlistPermissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SearchSongResult, ExtendedPlaylistDTO, PendingInvite, PlaylistState } from "@/types/playlistDetail";
import { toSeconds, msToMMSS, isValidImageValue, resolveSongCover, mapSongsFromResponse, formatDateDisplay, parseSlug, createSlug } from "@/utils/playlistUtils";
import { parseCollaboratorRole, normalizeCollaborators } from "@/utils/collaboratorUtils";
import { PlaylistSongItem } from "@/components/playlist/PlaylistSongItem";
import { useFavoritePlaylist } from "@/hooks/useFavorites";
import { favoritesApi } from "@/services/api/favoritesApi";
import { CollaboratorDialog } from "@/components/playlist/CollaboratorDialog";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import "./PlaylistDetail.css";

const getTitleFontClass = (length: number) => {
  // Responsive font-size theo d? d�i t�n playlist
  if (length > 80) return "text-2xl md:text-3xl";
  if (length > 50) return "text-3xl md:text-4xl";
  if (length > 30) return "text-4xl md:text-5xl";
  return "text-5xl md:text-6xl";
};

/* ========== Helper: L?y m�u v� d?nh d?ng th?i gian ========== */
async function getDominantColor(url: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ r: 36, g: 36, b: 44 });
      const w = 32, h = 32;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (!count) return resolve({ r: 36, g: 36, b: 44 });
      resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
    };
    img.onerror = () => resolve({ r: 36, g: 36, b: 44 });
  });
}
function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n));
}
function mix(a: number, b: number, t: number) {
  return Math.round(a * (1 - t) + b * t);
}
function makePalette(rgb: { r: number; g: number; b: number }) {
  const base = { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
  return {
    primary: `rgb(${mix(base.r, 255, 0.25)}, ${mix(base.g, 255, 0.25)}, ${mix(base.b, 255, 0.25)})`,
    surfaceTop: `rgb(${mix(base.r, 30, 0.55)}, ${mix(base.g, 30, 0.55)}, ${mix(base.b, 30, 0.55)})`,
    surfaceBottom: `rgb(${mix(base.r, 10, 0.75)}, ${mix(base.g, 10, 0.75)}, ${mix(base.b, 10, 0.75)})`,
  };
}

const useDebounceValue = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
};


const PlaylistDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { playSong, setQueue, isPlaying, currentSong, togglePlay } = useMusic();

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<PlaylistState | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteSongId, setPendingDeleteSongId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<SearchSongResult[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addSearchError, setAddSearchError] = useState<string | null>(null);
  const [addingSongIds, setAddingSongIds] = useState<number[]>([]);
  const [collabOpen, setCollabOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: number; name: string; avatar?: string | null }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [collabSearch, setCollabSearch] = useState("");
  const [collaborators, setCollaborators] = useState<Array<{ userId: number; name: string; email?: string; role?: CollaboratorRole | string }>>([]);
  const [collaboratorAvatars, setCollaboratorAvatars] = useState<Record<number, string | null>>({});
  const [hiddenSongIds, setHiddenSongIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedCoverUrl, setEditedCoverUrl] = useState("");
  const [editedVisibility, setEditedVisibility] = useState<PlaylistVisibility>(PlaylistVisibility.PUBLIC);
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>(CollaboratorRole.EDITOR);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<number | null>(null);
  const [removeCollabDialogOpen, setRemoveCollabDialogOpen] = useState(false);
  const [pendingRemoveCollab, setPendingRemoveCollab] = useState<{ id: number; name?: string } | null>(null);
  const [leaveCollabDialogOpen, setLeaveCollabDialogOpen] = useState(false);
  const [recommendedSongs, setRecommendedSongs] = useState<SearchSongResult[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<{ id: number; name: string; urlImageAlbum?: string } | null>(null);
  const [permissions, setPermissions] = useState<{
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageCollaborators: boolean;
    isOwner: boolean;
    userRole?: CollaboratorRole;
  }>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageCollaborators: false,
    isOwner: false,
    userRole: undefined,
  });
  const [palette, setPalette] = useState<{
    primary: string;
    surfaceTop: string;
    surfaceBottom: string;
  } | null>(null);
  const [playlistLikeCount, setPlaylistLikeCount] = useState<number | null>(null);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const defaultTop = "rgb(43, 17, 96)";
  const defaultBottom = "rgb(5, 1, 15)";
  const defaultPrimary = "rgb(167, 139, 250)";
  const debouncedAddSearch = useDebounceValue(addSearch, 350);

  const heroGradient = useMemo(() => {
    const top = palette?.surfaceTop ?? defaultTop;
    const bottom = palette?.surfaceBottom ?? defaultBottom;
    const glow = "rgba(167, 139, 250, 0.55)";
    const accent = "rgba(59, 130, 246, 0.4)";
    return `
      radial-gradient(circle at 20% 20%, ${glow}, transparent 55%),
      radial-gradient(circle at 80% 15%, ${accent}, transparent 45%),
      linear-gradient(180deg, ${top} 0%, ${bottom} 70%, rgba(3,7,18,0.95) 100%)
    `;
  }, [palette, defaultTop, defaultBottom]);

  const pageGradient = useMemo(() => {
    const primary = palette?.primary ?? defaultPrimary;
    const match = primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    const [r, g, b] = match ? match.slice(1).map(Number) : [168, 85, 247];
    return `linear-gradient(180deg, rgba(${r},${g},${b},0.25) 0%, rgba(14,8,40,0.95) 55%, #030712 100%)`;
  }, [palette?.primary, defaultPrimary]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collabsLoadAttemptedRef = useRef(false);
  const collaboratorsFetchIdRef = useRef<number | null>(null);
  const fetchedSongCoverIdsRef = useRef<Set<string>>(new Set());
  const friendsLoadedRef = useRef(false);
  const lastCollaboratorsRef = useRef<string>("");
  const lastPendingInvitesRef = useRef<string>("");

  const displayTitle = playlist?.title || "Playlist";
  const displayTitleFontClass = useMemo(
    () => getTitleFontClass(displayTitle.length),
    [displayTitle.length]
  );
  const editTitleFontClass = useMemo(
    () => getTitleFontClass(editedTitle.length),
    [editedTitle.length]
  );
  const existingSongIds = useMemo(() => {
    return new Set(
      (playlist?.songs ?? [])
        .map((song) => Number(song.id))
        .filter((id) => Number.isFinite(id))
    );
  }, [playlist?.songs]);
  const playlistNumericId = useMemo(() => {
    if (playlist?.id != null) {
      const numeric = Number(playlist.id);
      if (Number.isFinite(numeric)) return numeric;
    }
    if (slug) {
      const parsed = parseSlug(slug);
      if (parsed.id && Number.isFinite(parsed.id)) {
        return Number(parsed.id);
      }
    }
    return undefined;
  }, [playlist?.id, slug]);
  const {
    isFavorite: isPlaylistSaved,
    pending: playlistFavoritePending,
    loading: playlistFavoriteLoading,
    toggleFavorite: togglePlaylistFavorite,
  } = useFavoritePlaylist(playlistNumericId);
  // Normalize relative URLs from API to absolute
  const toAbsoluteUrl = useCallback((u?: string | null): string | null => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const base = API_BASE_URL.replace(/\/?$/, '');
    if (u.startsWith('/api/')) {
      if (base.endsWith('/api')) {
        return `${base.slice(0, -4)}${u}`;
      }
    }
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u}`;
  }, []);

  const ownerDisplayName = useMemo(() => {
    const raw = playlist?.ownerName;
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    if (playlist?.ownerId) return `Owner #${playlist.ownerId}`;
    return "Owner";
  }, [playlist?.ownerName, playlist?.ownerId]);

  const userIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('userId') : undefined;
  const meId = useMemo(() => {
    try {
      const raw = userIdFromStorage;
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }, [userIdFromStorage]);
  const isCurrentCollaborator = useMemo(
    () => typeof meId === "number" && Number.isFinite(meId) && collaborators.some((c) => c.userId === meId),
    [collaborators, meId]
  );

  const updateCollaboratorsFromRaw = useCallback(
    (raw: unknown, fallbackRole?: CollaboratorRole, forceSelf = false) => {
      const normalized = normalizeCollaborators(raw);
      let next = normalized;

      const resolvedSelfRole =
        fallbackRole ?? (forceSelf ? CollaboratorRole.EDITOR : undefined);

      if (typeof meId === "number" && Number.isFinite(meId) && resolvedSelfRole) {
        const existingIndex = next.findIndex((c) => c.userId === meId);
        if (existingIndex >= 0) {
          if (next[existingIndex].role !== resolvedSelfRole) {
            next = next.map((c, idx) => (idx === existingIndex ? { ...c, role: resolvedSelfRole } : c));
          }
        } else {
          next = [
            ...next,
            {
              userId: meId,
              name: "You",
              role: resolvedSelfRole,
            },
          ];
        }
      }

      setCollaborators(next);
      return next;
    },
    [meId]
  );

  const collaboratorEntries = useMemo(() => {
    if (!playlist) return [];
    const entries: Array<{
      userId: number;
      name: string;
      avatar?: string | null;
      role?: CollaboratorRole | "OWNER";
      roleLabel: string;
      isOwner: boolean;
    }> = [];
    const seen = new Set<number>();

    if (playlist.ownerId) {
      // L?y avatar v� name c?a owner: th? t? playlist, n?u kh�ng c� th� l?y t? friends list, cu?i c�ng l� t? cache
      let ownerAvatar = playlist.ownerAvatar;
      let ownerName = playlist.ownerName;
      
      if ((!ownerAvatar || !ownerName) && friends.length > 0) {
        const ownerFriend = friends.find(f => f.id === playlist.ownerId);
        if (ownerFriend) {
          ownerAvatar = ownerAvatar || ownerFriend.avatar || null;
          ownerName = ownerName || ownerFriend.name || "Owner";
        }
      }
      
      // N?u v?n kh�ng c� avatar, th? l?y t? cache
      if (!ownerAvatar && collaboratorAvatars[playlist.ownerId] !== undefined) {
        ownerAvatar = collaboratorAvatars[playlist.ownerId];
      }
      
      entries.push({
        userId: playlist.ownerId,
        name: ownerName || "Owner",
        avatar: toAbsoluteUrl(ownerAvatar) || null,
        role: "OWNER",
        roleLabel: "Owner",
        isOwner: true,
      });
      seen.add(playlist.ownerId);
    }
    
    // N?u meId l� collaborator nhung kh�ng c� trong collaborators list, th�m v�o
    if (meId && typeof meId === "number" && !seen.has(meId) && playlist.ownerId !== meId) {
      const meCollaborator = collaborators.find(c => c.userId === meId);
      if (meCollaborator) {
        let meAvatar = (meCollaborator as { avatar?: string | null }).avatar ?? null;
        if (!meAvatar && friends.length > 0) {
          const meFriend = friends.find(f => f.id === meId);
          if (meFriend?.avatar) {
            meAvatar = meFriend.avatar;
          }
        }
        if (!meAvatar && collaboratorAvatars[meId] !== undefined) {
          meAvatar = collaboratorAvatars[meId];
        }
        
        const normalizedRole = typeof meCollaborator.role === "string" ? parseCollaboratorRole(meCollaborator.role) : meCollaborator.role;
        const roleLabel =
          normalizedRole === CollaboratorRole.EDITOR
            ? "Editor"
            : normalizedRole === CollaboratorRole.VIEWER
              ? "Viewer"
              : "Collaborator";
        
        entries.push({
          userId: meId,
          name: meCollaborator.name || meCollaborator.email || `User ${meId}`,
          avatar: toAbsoluteUrl(meAvatar) || null,
          role: normalizedRole,
          roleLabel,
          isOwner: false,
        });
        seen.add(meId);
      }
    }

    collaborators.forEach((c) => {
      const idNum = c.userId;
      if (typeof idNum !== "number" || !Number.isFinite(idNum) || seen.has(idNum)) return;
      const normalizedRole = typeof c.role === "string" ? parseCollaboratorRole(c.role) : c.role;
      const roleLabel =
        normalizedRole === CollaboratorRole.EDITOR
          ? "Editor"
          : normalizedRole === CollaboratorRole.VIEWER
            ? "Viewer"
            : "Collaborator";
      
      // L?y avatar: th? t? collaborator object, n?u kh�ng c� th� l?y t? friends list, cu?i c�ng l� t? collaboratorAvatars cache
      let collaboratorAvatar = (c as { avatar?: string | null }).avatar ?? null;
      if (!collaboratorAvatar && friends.length > 0) {
        const friend = friends.find(f => f.id === idNum);
        if (friend?.avatar) {
          collaboratorAvatar = friend.avatar;
        }
      }
      // N?u v?n kh�ng c�, th? l?y t? cache
      if (!collaboratorAvatar && collaboratorAvatars[idNum] !== undefined) {
        collaboratorAvatar = collaboratorAvatars[idNum];
      }
      
      entries.push({
        userId: idNum,
        name: c.name || c.email || `User ${idNum}`,
        avatar: toAbsoluteUrl(collaboratorAvatar) || null,
        role: normalizedRole,
        roleLabel,
        isOwner: false,
      });
      seen.add(idNum);
    });

    return entries;
  }, [playlist, collaborators, friends, collaboratorAvatars, toAbsoluteUrl, meId]);

  // Load recommended songs based on playlist content
  // Uu ti�n: Mood > Genre > Artist
  // T?i uu: Gi?m s? lu?ng API calls v� cCancel song song
  // Lu�n hi?n recommend (kh�ng ch? khi playlist thay d?i)
  const loadRecommended = useCallback(async () => {
    if (!playlist) {
        setRecommendedSongs([]);
      setLoadingRecommended(false);
      return;
    }
    
    // N?u playlist kh�ng c� b�i h�t, v?n load recommend t? popular songs
    if (playlist.songs.length === 0) {
      setLoadingRecommended(true);
      try {
        const data = await songsApi.getAll({ size: 4, page: 0 });
        setRecommendedSongs((data.content || []).slice(0, 4));
      } catch (error) {
        console.error("Failed to load recommended songs:", error);
        setRecommendedSongs([]);
      } finally {
        setLoadingRecommended(false);
      }
        return;
      }
      
      setLoadingRecommended(true);
      try {
        const playlistSongIds = new Set(playlist.songs.map(s => String(s.id)));
        const recommended: SearchSongResult[] = [];
        
        // Thu th?p genres, moods, v� artists t? c�c b�i h�t trong playlist
        // Ch? l?y t? 2-3 b�i h�t d?u ti�n d? gi?m API calls
        const songsToCheck = playlist.songs.slice(0, 3);
        const songDetailPromises = songsToCheck.map(async (song) => {
          try {
            const songId = Number(song.id);
            if (isNaN(songId)) return null;
            
            // Ch? l?y songDetail, b? qua moods d? gi?m API calls
            const songDetail = await songsApi.getById(String(songId)).catch(() => null);
            return songDetail;
          } catch (error) {
            return null;
          }
        });
        
        const songDetails = (await Promise.all(songDetailPromises)).filter(Boolean);
        
        const genreIds = new Set<number>();
        const moodIds = new Set<number>();
        const artistIds = new Set<number>();
        
        // Thu th?p moodIds t? songMoodApi
        const moodPromises = songsToCheck.map(async (song) => {
          try {
            const songId = Number(song.id);
            if (isNaN(songId)) return null;
            const moods = await songMoodApi.getBySongId(songId).catch(() => null);
            return moods;
          } catch {
            return null;
          }
        });
        const moodResults = (await Promise.all(moodPromises)).filter(Boolean);
        
        songDetails.forEach((songDetail: any) => {
          if (!songDetail) return;
          
          // Thu th?p genreIds
          if (songDetail.genreIds && Array.isArray(songDetail.genreIds)) {
            songDetail.genreIds.slice(0, 2).forEach((id: number) => genreIds.add(id));
          }
          if (songDetail.genres && Array.isArray(songDetail.genres)) {
            songDetail.genres.slice(0, 2).forEach((g: { id?: number }) => {
              if (g.id) genreIds.add(g.id);
            });
          }
          
          // Thu th?p artistIds
          if (songDetail.artistIds && Array.isArray(songDetail.artistIds)) {
            songDetail.artistIds.slice(0, 2).forEach((id: number) => artistIds.add(id));
          }
        });
        
        // Thu th?p moodIds t? moodResults
        moodResults.forEach((moods: any) => {
          if (!moods || !Array.isArray(moods)) return;
          moods.slice(0, 2).forEach((m: { id?: number; moodId?: number }) => {
            const moodId = m.id ?? m.moodId;
            if (moodId && typeof moodId === 'number') moodIds.add(moodId);
          });
        });
        
        // CCancel song song c�c API calls d? tang t?c
        const recommendationPromises: Promise<SearchSongResult[]>[] = [];
        
        // Uu ti�n 1: T�m b�i h�t theo Mood
        if (moodIds.size > 0) {
          const moodIdArray = Array.from(moodIds).slice(0, 2);
          moodIdArray.forEach((moodId) => {
            recommendationPromises.push(
              songsApi.getWithoutAlbum({ moodId, size: 8 })
                .then(res => {
                  const content = res.content || [];
                  return content.filter(
                    (s: SearchSongResult) => !playlistSongIds.has(String(s.id))
                  ) as SearchSongResult[];
                })
                .catch(() => [] as SearchSongResult[])
            );
          });
        }
        
        // Uu ti�n 2: T�m b�i h�t theo Genre
        if (genreIds.size > 0) {
          const genreIdArray = Array.from(genreIds).slice(0, 2);
          genreIdArray.forEach((genreId) => {
          recommendationPromises.push(
              songsApi.getWithoutAlbum({ genreId, size: 8 })
              .then(res => {
                const content = res.content || [];
                return content.filter(
                  (s: SearchSongResult) => !playlistSongIds.has(String(s.id))
                ) as SearchSongResult[];
              })
              .catch(() => [] as SearchSongResult[])
          );
          });
        }
        
        // Uu ti�n 3: T�m b�i h�t theo Artist
        if (artistIds.size > 0) {
          const artistIdArray = Array.from(artistIds).slice(0, 2);
          artistIdArray.forEach((artistId) => {
          recommendationPromises.push(
            songsApi.getAll({ artistId, size: 8, page: 0 })
              .then(res => {
                const content = res.content || [];
                return content.filter(
                  (s: SearchSongResult) => !playlistSongIds.has(String(s.id))
                ) as SearchSongResult[];
              })
              .catch(() => [] as SearchSongResult[])
          );
          });
        }
        
        // Fallback: B�i h�t ph? bi?n
        recommendationPromises.push(
          songsApi.getAll({ size: 8, page: 0 })
            .then(res => {
              const content = res.content || [];
              return content.filter(
                (s: SearchSongResult) => !playlistSongIds.has(String(s.id))
              ) as SearchSongResult[];
            })
            .catch(() => [] as SearchSongResult[])
        );
        
        // CCancel t?t c? song song
        const results = await Promise.all(recommendationPromises);
        
        // G?p k?t qu? v� lo?i b? tr�ng l?p
        const allSongs: SearchSongResult[] = [];
        for (const result of results) {
          for (const song of result) {
            if (!allSongs.some(s => String(s.id) === String(song.id))) {
              allSongs.push(song);
              if (allSongs.length >= 8) break; // L?y nhi?u hon d? c� d? sau khi filter
            }
          }
          if (allSongs.length >= 8) break;
        }
        
        // Filter l?i d? lo?i b? nh?ng b�i d� c� trong playlist (c?p nh?t l?i)
        // �?m b?o kh�ng recommend b�i h�t d� c� trong playlist
        const finalSongs = allSongs.filter(
          (s: SearchSongResult) => !playlistSongIds.has(String(s.id))
        );
        
        // N?u kh�ng d? 4 b�i, l?y th�m t? fallback (v?n filter b�i d� c�)
        if (finalSongs.length < 4) {
          try {
            const fallbackData = await songsApi.getAll({ size: 50, page: 0 });
            const fallbackSongs = (fallbackData.content || []).filter(
              (s: SearchSongResult) => 
                !playlistSongIds.has(String(s.id)) && 
                !finalSongs.some(existing => String(existing.id) === String(s.id))
            );
            finalSongs.push(...fallbackSongs.slice(0, 4 - finalSongs.length));
          } catch (e) {
            console.warn('Failed to load fallback recommendations:', e);
          }
        }
        
        // Ch? set recommend n?u c� b�i h�t (kh�ng set empty array)
        if (finalSongs.length > 0) {
          setRecommendedSongs(finalSongs.slice(0, 4));
        } else {
          setRecommendedSongs([]);
        }
      } catch (error) {
        console.error("Failed to load recommended songs:", error);
        setRecommendedSongs([]);
      } finally {
        setLoadingRecommended(false);
      }
  }, [playlist]);
    
  // Load recommend khi playlist thay d?i (ch? cho owner/editor)
  useEffect(() => {
    if (playlist && (permissions.canEdit || permissions.isOwner)) {
      loadRecommended();
    } else {
      // N?u kh�ng c� quy?n edit, clear recommendations
      setRecommendedSongs([]);
    }
  }, [playlist, permissions.canEdit, permissions.isOwner, loadRecommended]);

  const isCreateMode = slug === "create";
  
  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      
      // Create mode: kh�ng load playlist, ch? set editing mode
      if (isCreateMode) {
        setLoading(false);
        setIsEditing(true);
        setEditedTitle("");
        setEditedDescription("");
        setEditedCoverUrl("");
        setEditedVisibility(PlaylistVisibility.PUBLIC);
        setPermissions({
          canView: true,
          canEdit: true,
          canDelete: false,
          canManageCollaborators: true,
          isOwner: true,
          userRole: undefined,
        });
        return;
      }
      
      setLoading(true);
      try {
        // Parse slug t? URL - n?u c� ID th� d�ng, n?u kh�ng th� c?n t�m b?ng slug
        const parsed = parseSlug(slug);
        const playlistId = parsed.id;

        if (!playlistId || isNaN(playlistId)) {
          toast({ title: 'Invalid playlist', description: 'Playlist not found', variant: 'destructive' });
          navigate('/playlists');
          return;
        }

        const data: PlaylistDTO = await playlistsApi.getById(playlistId);
        const extendedData = data as ExtendedPlaylistDTO;

        // const mappedSongs: (Song & { addedBy?: string; addedAt?: string })[] = Array.isArray(data.songs)
        //   ? data.songs.map((s: SearchSongResult) => ({
        //       id: String(s.id),
        //       name: s.name,
        //       songName: s.name,
        //       artist: Array.isArray(s.artists) && s.artists.length ? (s.artists.map((a) => a.name).join(', ')) : 'Unknown',
        //       album: s.album?.name || '',
        //       cover: s.urlImageAlbum || '',
        //       audioUrl: s.audioUrl || '',
        //       duration: toSeconds(s.duration),
        //     }))
        //   : [];
        const mappedSongs = mapSongsFromResponse(data.songs);


        const ownerId = data.ownerId ?? data.owner?.id;
        const normalizeVisibility = (v: unknown): PlaylistVisibility => {
          const raw = typeof v === 'string' ? v.toUpperCase() : '';
          if (raw === 'FRIENDS_ONLY') return PlaylistVisibility.FRIENDS_ONLY;
          if (raw === 'PRIVATE') return PlaylistVisibility.PRIVATE;
          if (raw === 'PUBLIC') return PlaylistVisibility.PUBLIC;
          return PlaylistVisibility.PUBLIC;
        };
        const visibility = normalizeVisibility((data as PlaylistDTO).visibility);

        // L?y owner name v� avatar
        const ownerName = extendedData?.owner?.name 
          ?? (data.owner as { name?: string } | undefined)?.name 
          ?? (data as { ownerName?: string }).ownerName
          ?? undefined;
        const ownerAvatar = extendedData?.owner?.avatar 
          ?? (data.owner as { avatar?: string | null } | undefined)?.avatar 
          ?? (data as { ownerAvatar?: string | null }).ownerAvatar
          ?? null;

        const playlistCover = data.coverUrl || extendedData.urlImagePlaylist || null;
        setPlaylist({
          id: data.id,
          title: data.name,
          description: data.description || '',
          cover: playlistCover,
          ownerName,
          ownerAvatar,
          ownerId,
          visibility,
          totalSongs: Array.isArray(data.songs) ? data.songs.length : (Array.isArray(data.songIds) ? data.songIds.length : mappedSongs.length || null),
          updatedAt: extendedData?.dateUpdate || null,
          songs: mappedSongs,
        });
        setEditedTitle(data.name || '');
        setEditedDescription(data.description || '');
        setEditedCoverUrl(data.coverUrl || extendedData.urlImagePlaylist || '');
        setEditedVisibility(visibility);
        
        // L?y m�u t? ?nh cover
        if (playlistCover) {
          try {
            const dom = await getDominantColor(playlistCover);
            setPalette(makePalette(dom));
          } catch (e) {
            console.warn('Failed to extract color from cover:', e);
            setPalette(null);
          }
        } else {
          setPalette(null);
        }
        
        // L?y s? lu?t th�ch
        try {
          const likeCountRes = await favoritesApi.getPlaylistLikeCount(playlistId);
          setPlaylistLikeCount(likeCountRes.count);
        } catch (e) {
          console.warn('Failed to load playlist like count:', e);
          setPlaylistLikeCount(null);
        }

        const rawRoleCandidate =
          (extendedData as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown } | undefined)?.role ??
          (extendedData as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown } | undefined)?.collaboratorRole ??
          (extendedData as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown } | undefined)?.userRole ??
          (data as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown; currentUserRole?: unknown }).role ??
          (data as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown; currentUserRole?: unknown }).collaboratorRole ??
          (data as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown; currentUserRole?: unknown }).userRole ??
          (data as { role?: unknown; collaboratorRole?: unknown; userRole?: unknown; currentUserRole?: unknown }).currentUserRole;
        let fallbackRole = parseCollaboratorRole(rawRoleCandidate);
        const isCollaboratorFlag =
          Boolean((data as { isCollaborator?: boolean }).isCollaborator) ||
          Boolean((extendedData as { isCollaborator?: boolean } | undefined)?.isCollaborator);
        if (!fallbackRole && isCollaboratorFlag) {
          fallbackRole = CollaboratorRole.EDITOR;
        }

        const shouldForceSelf = Boolean(fallbackRole) || isCollaboratorFlag;

        updateCollaboratorsFromRaw(
          (extendedData as { collaborators?: unknown[] } | undefined)?.collaborators ??
          (data as { collaborators?: unknown[] }).collaborators ??
          [],
          fallbackRole,
          shouldForceSelf
        );

        if (meId && ownerId && visibility === PlaylistVisibility.FRIENDS_ONLY) {
          const friendCheck = await checkIfFriends(meId, ownerId);
          setIsFriend(friendCheck);
        } else {
          setIsFriend(false);
        }
      } catch (e) {
        if (e instanceof PlaylistPermissionError) {
          toast({
            title: 'Access Denied',
            description: e.message,
            variant: 'destructive'
          });
          navigate('/playlist');
          return;
        }
        const msg = e instanceof Error ? e.message : 'Failed to load playlist';
        toast({ title: 'Failed to load playlist', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, meId, navigate, updateCollaboratorsFromRaw, isCreateMode]);

  useEffect(() => {
    const songs = playlist?.songs ?? [];
    if (!songs.length) return;
    const missing = songs.filter(
      (song) => !isValidImageValue(song.cover) && !fetchedSongCoverIdsRef.current.has(song.id),
    );
    if (!missing.length) return;

    missing.forEach((song) => fetchedSongCoverIdsRef.current.add(song.id));

    let cancelled = false;
    const run = async () => {
      try {
        const results = await Promise.all(
          missing.map(async (song) => {
            try {
              const detail = await songsApi.getById(String(song.id));
              if (!detail) return null;
              const detailCover = resolveSongCover(detail as unknown as SearchSongResult & { songId?: number });
              const detailAddedAt =
                (detail as { addedAt?: string; createdAt?: string; updatedAt?: string }).addedAt ??
                (detail as { createdAt?: string; updatedAt?: string }).createdAt ??
                (detail as { updatedAt?: string }).updatedAt ??
                song.addedAt;
              return {
                id: song.id,
                cover: detailCover,
                addedAt: detailAddedAt,
              };
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const validResults = results.filter(
          (item): item is { id: string; cover?: string; addedAt?: string } => Boolean(item),
        );
        if (!validResults.length) return;
        setPlaylist((prev) => {
          if (!prev) return prev;
          const updates = new Map(validResults.map((item) => [item.id, item]));
          const nextSongs = prev.songs.map((song) => {
            const update = updates.get(song.id);
            if (!update) return song;
            const nextCover = isValidImageValue(update.cover) ? update.cover : song.cover;
            const nextAddedAt = update.addedAt ?? song.addedAt;
            if (nextCover === song.cover && nextAddedAt === song.addedAt) return song;
            return {
              ...song,
              cover: nextCover,
              addedAt: nextAddedAt,
            };
          });
          return { ...prev, songs: nextSongs };
        });
      } catch {
        /* ignore */
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [playlist?.songs, playlist?.cover]);

  useEffect(() => {
    if (!playlist || !meId) {
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageCollaborators: false,
        isOwner: false,
        userRole: undefined,
      });
      return;
    }

    const visibility = playlist.visibility || PlaylistVisibility.PUBLIC;

    const playlistData = {
      ownerId: playlist.ownerId,
      visibility,
      collaborators: collaborators
        .map((c) => {
          const normalizedRole =
            typeof c.role === "string" ? parseCollaboratorRole(c.role) : c.role;
          if (!normalizedRole) return undefined;
          return {
            userId: c.userId,
            name: c.name || "",
            email: c.email,
            role: normalizedRole,
          };
        })
        .filter(Boolean) as Array<{ userId: number; name: string; email?: string; role: CollaboratorRole }>,
    };

    const perms = getPlaylistPermissions({
      playlist: playlistData,
      currentUser: { id: meId },
      isFriend,
    });

    setPermissions(perms);
  }, [playlist, collaborators, meId, isFriend]);

  // Listen for collab invite accepted event to refresh collaborators
  useEffect(() => {
    const handleCollabAccepted = async (event: CustomEvent) => {
      const eventPlaylistId = event.detail?.playlistId;
      const currentPlaylistId = playlist?.id;
      
      // Ch? reload n?u event playlistId kh?p v?i playlist hi?n t?i, ho?c kh�ng c� playlistId trong event
      if (eventPlaylistId && currentPlaylistId && Number(eventPlaylistId) !== Number(currentPlaylistId)) {
        return; // Kh�ng ph?i playlist n�y
      }
      
      // Reset fetch ID d? force reload
      collaboratorsFetchIdRef.current = null;
      
      // Force reload collaborators ngay l?p t?c
      if (currentPlaylistId) {
        try {
          const list = await playlistCollaboratorsApi.list(Number(currentPlaylistId));
          updateCollaboratorsFromRaw(list);
          collaboratorsFetchIdRef.current = Number(currentPlaylistId);
          
          // Fetch avatars cho t?t c? collaborators kh�ng c� avatar (bao g?m c? meId n?u l� collaborator)
          const missingAvatars = list.filter((c: any) => {
            const idNum = c.userId;
            if (!idNum || typeof idNum !== "number") return false;
            const hasAvatar = (c as { avatar?: string | null }).avatar ?? null;
            const hasInFriends = friends.find(f => f.id === idNum)?.avatar;
            const hasInCache = collaboratorAvatars[idNum] !== undefined;
            return !hasAvatar && !hasInFriends && !hasInCache;
          });
          
          // Fetch avatars t? user API cho nh?ng collaborators kh�ng c� avatar
          missingAvatars.forEach(async (c: any) => {
            const idNum = c.userId;
            if (!idNum || typeof idNum !== "number") return;
            try {
              const user = await userApi.getById(idNum);
              if (user?.avatar) {
                setCollaboratorAvatars(prev => ({ ...prev, [idNum]: user.avatar || null }));
              } else {
                setCollaboratorAvatars(prev => ({ ...prev, [idNum]: null }));
              }
            } catch (e) {
              // N?u kh�ng fetch du?c, d�nh d?u l� null d? kh�ng fetch l?i
              setCollaboratorAvatars(prev => ({ ...prev, [idNum]: null }));
            }
          });
        } catch (e) {
          console.warn('[PlaylistDetail] Failed to reload collaborators after accept:', e);
        }
      }
    };
    
    window.addEventListener('app:collab-invite-accepted', handleCollabAccepted as EventListener);
    return () => {
      window.removeEventListener('app:collab-invite-accepted', handleCollabAccepted as EventListener);
    };
  }, [playlist?.id, updateCollaboratorsFromRaw, meId]);

  useEffect(() => {
    if (!playlist?.id) return;
    if (collaboratorsFetchIdRef.current === playlist.id && collaborators.length) return;
    let cancelled = false;
    const loadCollaborators = async () => {
      try {
        const list = await playlistCollaboratorsApi.list(Number(playlist.id));
        if (cancelled) return;
        updateCollaboratorsFromRaw(list);
        collaboratorsFetchIdRef.current = Number(playlist.id);
        
        // Fetch avatars cho collaborators kh�ng c� avatar (bao g?m c? owner v� meId n?u l� collaborator)
        // S? d?ng functional update d? tr�nh dependency loop
        setCollaboratorAvatars(prev => {
          const missingAvatars = list.filter((c: any) => {
            const idNum = c.userId;
            if (!idNum || typeof idNum !== "number") return false;
            const hasAvatar = (c as { avatar?: string | null }).avatar ?? null;
            const hasInFriends = friends.find(f => f.id === idNum)?.avatar;
            const hasInCache = prev[idNum] !== undefined;
            return !hasAvatar && !hasInFriends && !hasInCache;
          });
          
          // N?u meId l� collaborator (c� trong list ho?c v?a accept), c?n fetch avatar
          if (meId && typeof meId === "number") {
            const meInList = list.some((c: any) => c.userId === meId);
            if (meInList) {
              // meId c� trong list, check xem c� avatar chua
              const meCollab = list.find((c: any) => c.userId === meId);
              const meHasAvatar = (meCollab as { avatar?: string | null })?.avatar ?? null;
              const meHasInFriends = friends.find(f => f.id === meId)?.avatar;
              const meHasInCache = prev[meId] !== undefined;
              if (!meHasAvatar && !meHasInFriends && !meHasInCache) {
                missingAvatars.push({ userId: meId });
              }
            }
          }
          
          // Fetch avatars t? user API cho nh?ng collaborators kh�ng c� avatar
          missingAvatars.forEach(async (c: any) => {
            const idNum = c.userId;
            if (!idNum || typeof idNum !== "number") return;
            try {
              const user = await userApi.getById(idNum);
              if (!cancelled && user?.avatar) {
                setCollaboratorAvatars(prevState => ({ ...prevState, [idNum]: user.avatar || null }));
              } else if (!cancelled) {
                setCollaboratorAvatars(prevState => ({ ...prevState, [idNum]: null }));
              }
            } catch (e) {
              // N?u kh�ng fetch du?c, d�nh d?u l� null d? kh�ng fetch l?i
              if (!cancelled) {
                setCollaboratorAvatars(prevState => ({ ...prevState, [idNum]: null }));
              }
            }
          });
          
          return prev; // Return prev d? kh�ng thay d?i state ngay l?p t?c
        });
      } catch (e) {
        if (!cancelled && e instanceof PlaylistPermissionError) {
          collaboratorsFetchIdRef.current = Number(playlist.id);
        }
      }
    };
    loadCollaborators();
    return () => {
      cancelled = true;
    };
  }, [playlist?.id, collaborators.length, updateCollaboratorsFromRaw, friends]);

  useEffect(() => {
    const loadCollabs = async () => {
      try {
        if (!slug) return;
        const parsed = parseSlug(slug);
        const playlistId = parsed.id;
        if (!playlistId) return;
        if (!collabOpen) return;
        collabsLoadAttemptedRef.current = false;
        if (!permissions.isOwner) return;

        const list = await playlistCollaboratorsApi.list(Number(playlistId));
        updateCollaboratorsFromRaw(
          list,
          permissions.userRole,
          !permissions.isOwner && (isCurrentCollaborator || Boolean(permissions.userRole))
        );
        collabsLoadAttemptedRef.current = true;
      } catch (e: unknown) {
        collabsLoadAttemptedRef.current = true;
        if (collabOpen && permissions.isOwner) {
          const msg = e instanceof Error ? e.message : String(e);
          const errorMsg = String(e).includes('500') || String(msg).includes('500')
            ? 'Server error loading collaborators. This feature may not be available yet.'
            : msg;
          toast({
            title: 'Failed to load collaborators',
            description: errorMsg,
            variant: 'destructive',
            duration: 3000,
          });
        }
      }
    };

    if (collabOpen && permissions.isOwner) {
      loadCollabs();
    }
  }, [slug, collabOpen, permissions.isOwner, permissions.userRole, updateCollaboratorsFromRaw, isCurrentCollaborator]);

  useEffect(() => {
    const loadPendingInvites = async () => {
      if (!collabOpen || !playlist) return;
      try {
        const pending = await playlistCollabInvitesApi.pending();
        const playlistPendingInvites = Array.isArray(pending)
          ? pending.filter((inv: PendingInvite) => inv.playlistId === playlist.id)
          : [];
        setPendingInvites(playlistPendingInvites);
      } catch (e) {
        console.warn('Failed to load pending invites:', e);
        setPendingInvites([]);
      }
    };
    if (collabOpen && playlist) {
      loadPendingInvites();
    }
  }, [collabOpen, playlist]);

  // Load friends s?m d? c� avatar cho collaborators
  useEffect(() => {
    const fetchFriends = async () => {
      if (!meId) { setFriends([]); return; }
      try {
        const list = await friendsApi.getFriends(meId);
        interface FriendListItem {
          friendId?: number;
          userId?: number;
          id?: number;
          friendName?: string;
          name?: string;
          username?: string;
          email?: string;
          friendAvatar?: string | null;
          avatar?: string | null;
        }
        const mapped = Array.isArray(list)
          ? list.map((f: FriendListItem) => ({
            id: f.friendId ?? f.userId ?? f.id ?? 0,
            name: f.friendName ?? f.name ?? f.username ?? f.email ?? `User ${f.friendId ?? f.userId ?? f.id ?? ''}`,
            avatar: toAbsoluteUrl(f.friendAvatar ?? f.avatar ?? null) || null,
          }))
          : [];
        setFriends(mapped);
      } catch { setFriends([]); }
    };
    fetchFriends();
  }, [meId, toAbsoluteUrl]);

  useEffect(() => {
    const fetchFriendsForDialog = async () => {
      // Ch? load khi dialog m?
      if (!collabOpen) {
        friendsLoadedRef.current = false;
        return;
      }

      // Ki?m tra xem d� load chua v� collaborators/pendingInvites c� thay d?i kh�ng
      const collaboratorsKey = JSON.stringify(collaborators.map(c => c.userId).sort());
      const pendingInvitesKey = JSON.stringify(pendingInvites.map(inv => inv.receiverId).sort());
      
      // N?u d� load v� kh�ng c� thay d?i v? collaborators/pendingInvites, kh�ng load l?i
      if (friendsLoadedRef.current && 
          lastCollaboratorsRef.current === collaboratorsKey && 
          lastPendingInvitesRef.current === pendingInvitesKey) {
        return;
      }

      try {
        setLoadingFriends(true);
        const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const me = rawUserId ? Number(rawUserId) : undefined;
        if (!me) { 
          setFriends([]); 
          friendsLoadedRef.current = true;
          return; 
        }
        
        const list = await friendsApi.getFriends(me);
        interface FriendListItem {
          friendId?: number;
          userId?: number;
          id?: number;
          friendName?: string;
          name?: string;
          username?: string;
          email?: string;
          friendAvatar?: string | null;
          avatar?: string | null;
        }
        const mapped = Array.isArray(list)
          ? list.map((f: FriendListItem) => ({
            id: f.friendId ?? f.userId ?? f.id ?? 0,
            name: f.friendName ?? f.name ?? f.username ?? f.email ?? `User ${f.friendId ?? f.userId ?? f.id ?? ''}`,
            avatar: toAbsoluteUrl(f.friendAvatar ?? f.avatar ?? null) || null,
          }))
          : [];

        const existingCollaboratorIds = new Set(collaborators.map(c => c.userId));
        const pendingInviteIds = new Set(pendingInvites.map(inv => inv.receiverId));
        const ownerId = playlist?.ownerId;

        const filtered = mapped.filter((x) => {
          if (typeof x.id !== 'number' || x.id <= 0) return false;
          if (ownerId && x.id === ownerId) return false;
          if (existingCollaboratorIds.has(x.id)) return false;
          if (pendingInviteIds.has(x.id)) return false;
          return true;
        });

        setFriends(filtered);
        friendsLoadedRef.current = true;
        lastCollaboratorsRef.current = collaboratorsKey;
        lastPendingInvitesRef.current = pendingInvitesKey;
      } catch { 
        setFriends([]); 
        friendsLoadedRef.current = true;
      } finally { 
        setLoadingFriends(false); 
      }
    };
    fetchFriendsForDialog();
  }, [collabOpen, playlist?.ownerId, collaborators, pendingInvites]);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = debouncedAddSearch.trim();
      if (!addDialogOpen) { setAddResults([]); setAddSearchLoading(false); return; }
      if (!q) { setAddResults([]); setAddSearchError(null); setAddSearchLoading(false); return; }
      setAddSearchLoading(true);
      setAddSearchError(null);
      try {
        const data = await songsApi.searchPublic({ query: q, size: 12, page: 0 });
        if (cancelled) return;
        setAddResults(data.content || []);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "No matching songs found.";
        setAddResults([]);
        setAddSearchError(message);
      } finally {
        if (!cancelled) {
          setAddSearchLoading(false);
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [debouncedAddSearch, addDialogOpen]);


  const addSongToPlaylist = async (song: SearchSongResult) => {
    if (!playlist) return;
    const songId =
      typeof song.id === 'number'
        ? song.id
        : Number((song as { songId?: number }).songId);
    if (!Number.isFinite(songId)) return;
    
    // Ki?m tra xem b�i h�t d� c� trong playlist chua
    if (playlist.songs.some((existing) => existing.id === String(songId))) {
      toast({ 
        title: 'B�i h�t d� c� trong playlist', 
        description: 'B�i h�t n�y d� du?c th�m v�o playlist r?i.',
        variant: 'destructive'
      });
      return;
    }
    const previousSnapshot = playlist ? { ...playlist, songs: [...playlist.songs] } : null;
    const optimisticAddedAt = new Date().toISOString();
    // L?y avatar c?a current user t? friends list ho?c t? localStorage
    let currentUserAvatar: string | null = null;
    if (meId && friends.length > 0) {
      const currentUserFriend = friends.find(f => f.id === meId);
      if (currentUserFriend?.avatar) {
        currentUserAvatar = currentUserFriend.avatar;
      }
    }

    // ��nh d?u dang th�m ngay l?p t?c d? button ph?n h?i click d?u ti�n
    setAddingSongIds((prev) => (prev.includes(songId) ? prev : [...prev, songId]));
    
    // L?y th�ng tin d?y d? t? API d? c� duration ch�nh x�c
    let songDetail: any = null;
    let songDuration = 0;
    try {
      songDetail = await songsApi.getById(String(songId));
      if (songDetail) {
        songDuration = toSeconds(songDetail.duration);
      }
    } catch (error) {
      console.warn("Failed to fetch song detail for duration, using fallback:", error);
      // Fallback: s? d?ng duration t? song n?u c�
      songDuration = toSeconds(song.duration);
    }
    
    // X? l� artist tuong t? nhu trong mapSongsFromResponse
    let artistName = 'Unknown';
    if (songDetail) {
      // Uu ti�n l?y t? songDetail
      if (Array.isArray(songDetail.artists) && songDetail.artists.length > 0) {
        const names = songDetail.artists.map((a: any) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object' && 'name' in a) return a.name;
          return null;
        }).filter((name): name is string => Boolean(name));
        if (names.length > 0) {
          artistName = names.join(', ');
        }
      }
      if (artistName === 'Unknown' && songDetail.artistNames && Array.isArray(songDetail.artistNames)) {
        artistName = songDetail.artistNames.join(', ');
      }
    }
    
    // Fallback v? song n?u chua c�
    if (artistName === 'Unknown') {
      if (Array.isArray(song.artists) && song.artists.length > 0) {
        const names = song.artists.map((a) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object' && 'name' in a) return a.name;
          return null;
        }).filter((name): name is string => Boolean(name));
        if (names.length > 0) {
          artistName = names.join(', ');
        }
      }
      if (artistName === 'Unknown') {
        artistName = (song as { artist?: string }).artist ?? 
                     (song as { artistName?: string }).artistName ??
                     (song as { artistsName?: string }).artistsName ??
                     'Unknown';
      }
    }
    
    // L?y cover gi?ng nhu MusicCard (d�ng mapToPlayerSong logic)
    let coverUrl = '';
    if (songDetail) {
      const mapped = mapToPlayerSong(songDetail as any);
      coverUrl = mapped.cover;
    } else {
      // Fallback: d�ng logic t? mapToPlayerSong
      coverUrl = (song as any).albumCoverImg ?? 
                 (song as any).urlImageAlbum ?? 
                 (song as any).albumImageUrl ?? 
                 resolveSongCover(song as SearchSongResult & { songId?: number }) ?? 
                 '';
    }
    
    const optimisticSong: Song & { addedBy?: string; addedAt?: string; addedById?: number; addedByAvatar?: string | null } = {
      id: String(songId),
      title: songDetail?.name || songDetail?.title || song.name,
      artist: artistName,
      album: songDetail?.album?.name || (typeof songDetail?.album === 'string' ? songDetail.album : '') || song.album?.name || '',
      cover: coverUrl,
      audioUrl: songDetail?.audioUrl || songDetail?.audio || songDetail?.url || song.audioUrl || '',
      duration: songDuration,
      addedAt: optimisticAddedAt,
      addedBy: 'You',
      addedById: meId,
      addedByAvatar: toAbsoluteUrl(currentUserAvatar) || null,
    };
    setPlaylist((prev) => {
      if (!prev) return prev;
      if (prev.songs.some((existing) => existing.id === String(songId))) {
        return { ...prev, updatedAt: optimisticAddedAt };
      }
      const nextSongs = [...prev.songs, optimisticSong];
      const nextTotal = (prev.totalSongs ?? prev.songs.length) + 1;
      return {
        ...prev,
        songs: nextSongs,
        totalSongs: nextTotal,
        updatedAt: optimisticAddedAt,
      };
    });
    try {
      await playlistsApi.addSong(playlist.id, songId);
      toast({ title: 'Added', description: 'Song added to playlist' });
      
      // Kh�ng reload l?i playlist t? API - ch? d�ng optimistic update
      // Ch? reload recommend d? c?p nh?t danh s�ch (lo?i b? b�i v?a add)
      setTimeout(() => {
        loadRecommended();
      }, 500);
    } catch (e) {
      if (previousSnapshot) {
        setPlaylist(previousSnapshot);
      }
      const message =
        e instanceof PlaylistPermissionError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to add song';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setAddingSongIds((prev) => prev.filter((value) => value !== songId));
    }
  };

  const toggleSelectFriend = (fid: number) => setSelectedFriendIds((prev) => prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]);

  const handleRemoveCollaborator = (collaboratorId: number, collaboratorName?: string) => {
    if (!playlist || !permissions.isOwner) return;
    setPendingRemoveCollab({ id: collaboratorId, name: collaboratorName });
    setRemoveCollabDialogOpen(true);
  };

  const confirmRemoveCollaborator = async () => {
    if (!playlist || !pendingRemoveCollab) return;
    const { id: collaboratorId, name: collaboratorName } = pendingRemoveCollab;
    setRemovingCollaboratorId(collaboratorId);
    setRemoveCollabDialogOpen(false);
    try {
      await playlistCollaboratorsApi.remove(playlist.id, collaboratorId);
      toast({
        title: "�� g? c?ng t�c vi�n",
        description: `${collaboratorName || "C?ng t�c vi�n"} s? kh�ng c�n quy?n truy c?p.`,
      });
      setCollaborators((prev) => prev.filter((c) => c.userId !== collaboratorId));
    } catch (e) {
      const message =
        e instanceof PlaylistPermissionError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to remove collaborator";
      toast({
        title: "Kh�ng th? g? c?ng t�c vi�n",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRemovingCollaboratorId(null);
      setPendingRemoveCollab(null);
    }
  };

  const handleLeaveCollaboration = () => {
    if (!playlist || typeof meId !== "number" || !Number.isFinite(meId)) return;
    setLeaveCollabDialogOpen(true);
  };

  const confirmLeaveCollaboration = async () => {
    if (!playlist || typeof meId !== "number" || !Number.isFinite(meId)) return;
    setLeaveCollabDialogOpen(false);
    setLeaveLoading(true);
    try {
      await playlistCollaboratorsApi.leave(playlist.id);
      toast({
        title: "�� Leave playlist",
        description: "B?n kh�ng c�n l� c?ng t�c vi�n c?a playlist n�y.",
      });
      setCollaborators((prev) => prev.filter((c) => c.userId !== meId));
    } catch (e) {
      const message =
        e instanceof PlaylistPermissionError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Kh�ng th? Leave playlist. Vui l�ng th? l?i.";
      toast({
        title: "Leave playlist th?t b?i",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLeaveLoading(false);
    }
  };

  const sendInvites = async () => {
    if (!playlist) return;
    try {
      setSendingInvites(true);
      const successIds: number[] = [];
      const failedIds: number[] = [];

      for (const fid of selectedFriendIds) {
        try {
          await playlistCollabInvitesApi.send(playlist.id, fid, inviteRole);
          successIds.push(fid);
        } catch (e) {
          failedIds.push(fid);
          const friendName = friends.find(f => f.id === fid)?.name || `Friend ${fid}`;
          const errorMessage = e instanceof Error ? e.message : String(e);

          if (e instanceof PlaylistPermissionError) {
            console.error(`Permission denied sending invite to ${friendName}:`, e.message);
          } else {
            const errorStatus = (e as Error & { status?: number })?.status;

            if (errorStatus === 401) {
              console.error(`Unauthorized: ${friendName} - Login required`);
            } else if (errorStatus === 400) {
              let reason = 'Invalid request';
              if (errorMessage.includes('Playlist not found')) {
                reason = `Playlist kh�ng t?n t?i`;
              } else if (errorMessage.includes('Receiver not found')) {
                reason = `${friendName} kh�ng t?n t?i trong h? th?ng`;
              } else if (errorMessage.includes('Sender not found')) {
                reason = 'T�i kho?n c?a b?n kh�ng h?p l?';
              } else if (errorMessage.includes('Only playlist owner can send invites')) {
                reason = 'Ch? ch? s? h?u playlist m?i c� th? m?i';
              } else if (errorMessage.includes('You cannot invite yourself') || errorMessage.includes('invite yourself')) {
                reason = `Kh�ng th? m?i ch�nh m�nh`;
              } else if (errorMessage.includes('Invite already sent')) {
                reason = `�� g?i l?i m?i cho ${friendName} r?i`;
              } else if (errorMessage.includes('already accepted')) {
                reason = `${friendName} d� ch?p nh?n l?i m?i r?i`;
              } else if (errorMessage.includes('already a collaborator')) {
                reason = `${friendName} d� l� collaborator r?i`;
              } else if (errorMessage.includes('already') || errorMessage.includes('exists')) {
                reason = `�� g?i l?i m?i ho?c ${friendName} d� l� collaborator`;
              }
              console.warn(`? Invalid invite request for ${friendName}: ${reason}`, e);
            } else {
              console.error(`? Failed to send invite to ${friendName}:`, e);
            }
          }
        }
      }

      if (successIds.length > 0) {
        const successMsg = failedIds.length > 0
          ? `${successIds.length} friend${successIds.length > 1 ? 's' : ''} invited, ${failedIds.length} failed`
          : `${successIds.length} friend${successIds.length > 1 ? 's' : ''} invited`;
        toast({
          title: '? Invites sent',
          description: successMsg,
          duration: 3000,
        });
        try {
          const pending = await playlistCollabInvitesApi.pending();
          const playlistPendingInvites = Array.isArray(pending)
            ? pending.filter((inv: PendingInvite) => inv.playlistId === playlist.id)
            : [];
          setPendingInvites(playlistPendingInvites);
        } catch (e) {
          console.warn('Failed to refresh pending invites:', e);
        }
        try {
          const list = await playlistCollaboratorsApi.list(playlist.id);
          updateCollaboratorsFromRaw(
            list,
            permissions.userRole,
            !permissions.isOwner && (isCurrentCollaborator || Boolean(permissions.userRole))
          );
        } catch (e) {
          console.warn('Failed to refresh collaborators:', e);
        }
        setCollabOpen(false);
        setSelectedFriendIds([]);
      } else if (failedIds.length > 0) {
        const failedDetails = failedIds.map(id => {
          const friend = friends.find(f => f.id === id);
          return friend?.name || `Friend ${id}`;
        });

        const firstError = failedIds[0];
        const firstFriendName = failedDetails[0];
        let errorMsg = '';

        errorMsg = failedIds.length === 1
          ? `Kh�ng th? g?i l?i m?i cho ${firstFriendName}. C� th? d� du?c m?i, d� l� collaborator, ho?c kh�ng h?p l?.`
          : `Kh�ng th? g?i l?i m?i cho ${failedIds.length} b?n b� (${failedDetails.slice(0, 2).join(', ')}${failedIds.length > 2 ? '...' : ''}).`;

        toast({
          title: '? Error',
          description: errorMsg,
          variant: 'destructive',
          duration: 6000,
        });
        try {
          const pending = await playlistCollabInvitesApi.pending();
          const playlistPendingInvites = Array.isArray(pending)
            ? pending.filter((inv: PendingInvite) => inv.playlistId === playlist.id)
            : [];
          setPendingInvites(playlistPendingInvites);
          const list = await playlistCollaboratorsApi.list(playlist.id);
          updateCollaboratorsFromRaw(
            list,
            permissions.userRole,
            !permissions.isOwner && (isCurrentCollaborator || Boolean(permissions.userRole))
          );
        } catch (e) {
          console.warn('Failed to refresh data after error:', e);
        }
      }
    } catch (e) {
      if (e instanceof PlaylistPermissionError) {
        if (e.status === 401) {
          toast({
            title: '? Unauthorized',
            description: 'Phi�n dang nh?p d� h?t h?n. Vui l�ng dang nh?p l?i.',
            variant: 'destructive',
            duration: 5000,
          });
        } else {
          toast({
            title: '? Permission Denied',
            description: e.message,
            variant: 'destructive',
            duration: 5000,
          });
        }
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to send invites';
        toast({
          title: '? Error',
          description: `C� l?i x?y ra khi g?i l?i m?i: ${msg}`,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } finally {
      setSendingInvites(false);
    }
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const totalDuration = useMemo(() => {
    if (!playlist) return 0;
    return playlist.songs.reduce((acc, song) => acc + toSeconds(song.duration), 0);
  }, [playlist]);

  const playAllSongs = () => {
    if (!playlist || !playlist.songs.length) return;
    if (isPlaying) {
      togglePlay();
    } else {
      // N?u dang c� b�i h�t trong playlist dang ph�t, resume b�i d�
      if (currentSong && playlist.songs.find((s) => s.id === currentSong.id)) {
        playSong(currentSong);
      } else {
        // N?u kh�ng, play b�i d?u ti�n
        setQueue(playlist.songs);
        playSong(playlist.songs[0]);
      }
    }
  };

const shufflePlaylistSongs = () => {
  if (!playlist || !playlist.songs.length) return;
  const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
  setQueue(shuffled);
  playSong(shuffled[0]);
};

const handleDownloadPlaylist = () => {
  toast({
    title: "T?i playlist",
    description: "T�nh nang t?i playlist s? s?m ra m?t.",
  });
};

const handlePlaylistActionComingSoon = () => {
  toast({
    title: "T�nh nang s?p ra m?t",
    description: "Ch�ng t�i dang ho�n thi?n tr?i nghi?m n�y.",
  });
};

const handlePlaySong = (song: Song) => {
  if (!playlist) return;
  setQueue(playlist.songs);
  playSong(song);
};

  const confirmRemoveSong = (songId: string) => {
    setPendingDeleteSongId(songId);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!playlist || !pendingDeleteSongId) return;
    try {
      setDeleting(true);
      const sid = Number(pendingDeleteSongId);
      await playlistsApi.removeSong(playlist.id, sid);
      setPlaylist({ ...playlist, songs: playlist.songs.filter(s => Number(s.id) !== sid) });
      setDeleteOpen(false);
      setPendingDeleteSongId(null);
    } catch (e) {
      if (e instanceof PlaylistPermissionError) {
        toast({ title: 'Access Denied', description: e.message, variant: 'destructive' });
      } else {
        const message = err instanceof Error ? err.message : "No matching songs found.";
        toast({ title: 'L?i', description: message, variant: 'destructive' });
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white playlist-page-background">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 playlist-hero-overlay" />
          <div className="relative container mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-end">
            <Skeleton className="w-52 h-52 md:w-64 md:h-64 rounded-3xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-3 mt-6">
                <Skeleton className="h-11 w-24 rounded-full" />
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6 w-full">
              <Dialog
                open={addDialogOpen}
                onOpenChange={(open) => {
                  if (!permissions.canEdit) {
                    if (open) {
                      toast({
                        title: "Kh�ng th? th�m b�i h�t",
                        description: "B?n kh�ng c� quy?n ch?nh s?a playlist n�y.",
                        variant: "destructive",
                      });
                    }
                    return;
                  }
                  setAddDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                    disabled={!permissions.canEdit}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Th�m b�i h�t
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-h-[85vh] overflow-y-auto scrollbar-custom"
                  aria-describedby="add-song-dialog-description"
                  aria-labelledby="add-song-dialog-title"
                >
                  <DialogHeader>
                    <DialogTitle id="add-song-dialog-title">Add Song to Playlist</DialogTitle>
                    <DialogDescription id="add-song-dialog-description">Choose a song and add it to this playlist.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search for songs..." className="pl-10" value={addSearch} onChange={(e) => setAddSearch(e.target.value)} />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-custom">
                      {addResults.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Type to search songs</p>
                      ) : (
                        addResults.map((s: SearchSongResult) => {
                          const coverUrl = (s as { urlImageAlbum?: string }).urlImageAlbum || "";
                          const artistNames = Array.isArray(s.artists)
                            ? s.artists.map((a: { name?: string }) => a.name || "").filter(Boolean).join(", ")
                            : typeof s.artists === "string"
                              ? s.artists
                              : "";
                          const numericId = typeof s.id === "number" ? s.id : Number((s as { songId?: number }).songId ?? s.id);
                          const alreadyInPlaylist = Number.isFinite(numericId) && existingSongIds.has(Number(numericId));
                          const isAdding = Number.isFinite(numericId) && addingSongIds.includes(Number(numericId));
                          return (
                            <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                              <div className="flex-shrink-0">
                                {coverUrl ? (
                                  <img src={coverUrl} alt={s.name || "Song"} className="w-12 h-12 rounded object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                    <Music className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{s.name || s.songName || "Unknown Song"}</p>
                                {artistNames && <p className="text-xs text-muted-foreground truncate">{artistNames}</p>}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addSongToPlaylist(s)}
                                disabled={alreadyInPlaylist || isAdding || !Number.isFinite(numericId)}
                                variant={alreadyInPlaylist ? "secondary" : undefined}
                              >
                                {alreadyInPlaylist ? "Added" : isAdding ? "Adding..." : "Add"}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                onClick={() => {
                  if (!permissions.isOwner) {
                    toast({
                      title: "Kh�ng th? ch?nh s?a playlist",
                      description: "Ch? ch? s? h?u m?i c� quy?n ch?nh s?a playlist n�y.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsEditing(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit playlist
              </Button>
              {!permissions.isOwner && isCurrentCollaborator && (
                <Button
                  variant="outline"
                  onClick={handleLeaveCollaboration}
                  disabled={leaveLoading}
                  className="border-destructive/40 text-destructive hover:text-destructive hover:border-destructive/60"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {leaveLoading ? "Leaving..." : "Leave playlist"}
                </Button>
              )}
            </div>
            </div>
          </div>
        </section>
        <div className="container mx-auto max-w-6xl px-4 md:px-8 py-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-0">
              <div className="px-6 py-3 border-b border-white/10">
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="space-y-2 px-6 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white playlist-page-background" style={{ background: pageGradient }}>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 playlist-hero-overlay" style={{ backgroundImage: heroGradient }} />
        <div className="relative container mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16 flex flex-col lg:flex-row gap-8 md:gap-10 items-center md:items-end">
          <div className="flex-shrink-0">
            <div
              className={`relative w-64 h-64 lg:w-80 lg:h-80 rounded-lg overflow-hidden bg-gradient-to-br from-primary to-primary-glow shadow-2xl ${isEditing ? 'cursor-pointer hover:opacity-95' : ''}`}
              onClick={() => { if (isEditing) fileInputRef.current?.click(); }}
              title={isEditing ? 'Click to change cover' : undefined}
            >
              {(() => {
                const src = isEditing ? (editedCoverUrl || playlist?.cover || '') : (playlist?.cover || '');
                return src ? (
                  <img src={src} alt={playlist?.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                    <Music className="w-24 h-24 text-white/80" />
                  </div>
                );
              })()}
              {isEditing && (
                <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition flex items-center justify-center text-xs font-medium">
                  Change cover
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              title="Upload playlist cover image"
              aria-label="Upload playlist cover image"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const result = await uploadImage(file);
                  if (result?.secure_url) setEditedCoverUrl(result.secure_url);
                } catch {
                  void 0;
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-2">
              {(() => {
                const currentVisibility = isEditing ? editedVisibility : (playlist?.visibility || PlaylistVisibility.PUBLIC);
                const visibilityConfig = {
                  [PlaylistVisibility.PUBLIC]: {
                    label: "Public Playlist",
                    className: "bg-green-500/10 text-green-400 border-green-500/30",
                  },
                  [PlaylistVisibility.PRIVATE]: {
                    label: "Private Playlist",
                    className: "bg-red-500/10 text-red-400 border-red-500/30",
                  },
                  [PlaylistVisibility.FRIENDS_ONLY]: {
                    label: "Friends Only",
                    className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                  }
                };
                const config = visibilityConfig[currentVisibility] || visibilityConfig[PlaylistVisibility.PUBLIC];
                return (
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${config.className}`}>
                    <Users className="w-3 h-3" />
                    {config.label}
                  </span>
                );
              })()}
            </div>
            {isEditing ? (
              <div className="space-y-3 mb-2 min-w-0 max-w-full">
                <div className="space-y-2 min-w-0">
                  <Input 
                    className="text-base font-medium w-full min-w-0" 
                    value={editedTitle} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 100) {
                        setEditedTitle(value);
                      } else {
                        toast({ 
                          title: "Name too long", 
                          description: "Playlist name must not exceed 100 characters", 
                          variant: "destructive" 
                        });
                      }
                    }} 
                    placeholder="Playlist title"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">{editedTitle.length}/100 characters</p>
                </div>
                <div className="space-y-2 min-w-0">
                  <Textarea 
                    value={editedDescription} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 300) {
                        setEditedDescription(value);
                      } else {
                        toast({ 
                          title: "Description too long", 
                          description: "Description must not exceed 300 characters", 
                          variant: "destructive" 
                        });
                      }
                    }} 
                    placeholder="Description" 
                    rows={3}
                    maxLength={300}
                    className="resize-none w-full min-w-0"
                  />
                  <p className="text-xs text-muted-foreground">{editedDescription.length}/300 characters</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select value={editedVisibility} onValueChange={(v) => setEditedVisibility(v as PlaylistVisibility)}>
                      <SelectTrigger id="visibility" className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PlaylistVisibility.PUBLIC}>Public</SelectItem>
                        <SelectItem value={PlaylistVisibility.FRIENDS_ONLY}>Friends Only</SelectItem>
                        <SelectItem value={PlaylistVisibility.PRIVATE}>Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => {
                    // Validation
                    if (!editedTitle.trim()) {
                      toast({ 
                        title: "Playlist name required", 
                        description: "Please enter a name for your playlist", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    if (editedTitle.length > 100) {
                      toast({ 
                        title: "Name too long", 
                        description: "Playlist name must not exceed 100 characters", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    if (editedDescription.length > 300) {
                      toast({ 
                        title: "Description too long", 
                        description: "Description must not exceed 300 characters", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    try {
                      if (isCreateMode) {
                        // Create new playlist
                        const today = new Date().toISOString().split('T')[0];
                        const body: any = {
                          name: editedTitle.trim(),
                          description: editedDescription,
                          visibility: editedVisibility,
                          songIds: [],
                          dateUpdate: today,
                          coverUrl: editedCoverUrl || undefined,
                        };
                        
                        if (meId) body.ownerId = meId;
                        
                        const headers = buildJsonHeaders();
                        const res = await fetch(`${API_BASE_URL}/playlists`, {
                          method: "POST",
                          headers,
                          body: JSON.stringify(body),
                        });
                        
                        if (!res.ok) {
                          const errorText = await res.text();
                          let errorMessage = "Failed to create playlist";
                          try {
                            const errorJson = JSON.parse(errorText);
                            errorMessage = errorJson.message || errorJson.error || errorMessage;
                          } catch {
                            errorMessage = errorText || errorMessage;
                          }
                          throw new Error(errorMessage);
                        }
                        
                        const data = await res.json();
                        toast({ title: 'Playlist created successfully!' });
                        navigate(`/playlist/${createSlug(data.name || "playlist", data.id)}`);
                      } else {
                        // Update existing playlist
                        if (!playlist) return;
                        await playlistsApi.update(playlist.id, {
                          name: editedTitle.trim() || playlist.title,
                          description: editedDescription,
                          coverUrl: editedCoverUrl || undefined,
                          visibility: editedVisibility,
                          dateUpdate: new Date().toISOString().split('T')[0],
                          songIds: playlist.songs.map(s => Number(s.id)),
                        });
                        setPlaylist({ ...playlist, title: editedTitle.trim() || playlist.title, description: editedDescription, cover: editedCoverUrl || playlist.cover, visibility: editedVisibility });
                        setIsEditing(false);
                        toast({ title: 'Playlist updated' });
                      }
                    } catch (e) {
                      if (e instanceof PlaylistPermissionError) {
                        toast({ title: 'Access Denied', description: e.message, variant: 'destructive' });
                      } else {
                        const message = err instanceof Error ? err.message : "No matching songs found.";
                        toast({ title: 'Error', description: message, variant: 'destructive' });
                      }
                    }
                  }}>{isCreateMode ? 'Create' : 'Save'}</Button>
                  <Button size="sm" variant="outline" onClick={() => { 
                    if (isCreateMode) {
                      navigate('/playlists');
                    } else {
                      setIsEditing(false); 
                      setEditedTitle(playlist?.title || ''); 
                      setEditedDescription(playlist?.description || ''); 
                    }
                  }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className={`${displayTitleFontClass} font-extrabold mb-2 line-clamp-2 break-words overflow-hidden min-w-0`}>
                  {displayTitle}
                </h1>
                {playlist?.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 break-words overflow-hidden min-w-0">{playlist?.description}</p>
                )}
              </>
            )}

            {!isEditing && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4 mt-3">
              {(() => {
                // L?y avatar v� name c?a owner: th? t? playlist, n?u kh�ng c� th� l?y t? friends list
                let ownerAvatar = playlist?.ownerAvatar;
                let ownerName = playlist?.ownerName;
                
                if ((!ownerAvatar || !ownerName) && playlist?.ownerId && friends.length > 0) {
                  const ownerFriend = friends.find(f => f.id === playlist.ownerId);
                  if (ownerFriend) {
                    ownerAvatar = ownerAvatar || ownerFriend.avatar || null;
                    ownerName = ownerName || ownerFriend.name || "Owner";
                  }
                }
                
                return (
                  <>
                    <Avatar className="w-9 h-9 border border-border/50">
                      {ownerAvatar ? (
                        <AvatarImage
                          src={toAbsoluteUrl(ownerAvatar) || undefined}
                          alt={ownerName || "Owner"}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <AvatarFallback delayMs={0} className="bg-gradient-primary text-white">
                        {ownerName 
                          ? ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                          : <UserIcon className="h-5 w-5" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    {ownerName && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-left">
                            <span className="font-medium truncate">{ownerName}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm font-medium">{ownerName}</p>
                            {playlist?.ownerId && <p className="text-xs text-muted-foreground">User ID: {playlist.ownerId}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                );
              })()}
              <span className="text-muted-foreground">�</span>
              <span className="text-muted-foreground">{(playlist?.songs.length || 0) > 0 ? playlist?.songs.length : (playlist?.totalSongs ?? 0)} songs</span>
              {playlist && playlist.songs.length > 0 && (
                <>
                  <span className="text-muted-foreground">�</span>
                  <span className="text-muted-foreground">{formatTotalDuration(totalDuration)}</span>
                </>
              )}
              {playlistLikeCount !== null && (
                <>
                  <span className="text-muted-foreground">�</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {playlistLikeCount.toLocaleString()}
                  </span>
                </>
              )}
              {(() => {
                const d = playlist?.updatedAt;
                const t = d ? new Date(d) : null;
                const valid = t && !isNaN(t.getTime());
                return valid ? (
                  <>
                    <span className="text-muted-foreground">�</span>
                    <span className="text-muted-foreground">Updated {t.toLocaleDateString()}</span>
                  </>
                ) : null;
              })()}
            </div>
            )}

            {!isEditing && collaboratorEntries.length > 0 && (
              <div className="mb-6 flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Collaborators
                </span>
                <div className="flex -space-x-2">
                  {(collaboratorEntries.length > 5 ? collaboratorEntries.slice(0, 5) : collaboratorEntries).map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n) => n.charAt(0))
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const ringClass =
                      member.isOwner
                        ? "ring-2 ring-primary/60"
                        : member.role === CollaboratorRole.EDITOR
                          ? "ring-2 ring-emerald-500/60"
                          : "ring-2 ring-border/60";
                    const isSelf = typeof meId === "number" && member.userId === meId;
                    return (
                      <div key={member.userId} className="relative group">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Avatar className={`h-8 w-8 cursor-pointer border-2 border-background ${ringClass} hover:scale-110 transition-transform`}>
                              {member.avatar ? (
                                <AvatarImage src={member.avatar} alt={member.name} />
                              ) : null}
                              <AvatarFallback className="bg-gradient-primary text-white">{initials}</AvatarFallback>
                            </Avatar>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                {member.avatar ? (
                                  <AvatarImage src={member.avatar} alt={member.name} />
                                ) : null}
                                <AvatarFallback className="bg-gradient-primary text-white">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.roleLabel}</p>
                              </div>
                            </div>
                            {permissions.isOwner && !member.isOwner && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={() => handleRemoveCollaborator(member.userId, member.name)}
                                disabled={removingCollaboratorId === member.userId}
                              >
                                {removingCollaboratorId === member.userId ? "�ang x�a..." : "G? kh?i playlist"}
                              </Button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })}
                  {collaboratorEntries.length > 5 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Avatar className="h-8 w-8 cursor-pointer border-2 border-background ring-2 ring-border/60 hover:scale-110 transition-transform">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                              +{collaboratorEntries.length - 5}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" side="bottom" align="start">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {collaboratorEntries.length - 5} more collaborator{collaboratorEntries.length - 5 > 1 ? 's' : ''}
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {collaboratorEntries.slice(5).map((member) => {
                            const initials = member.name
                              .split(" ")
                              .map((n) => n.charAt(0))
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();
                            const ringClass =
                              member.isOwner
                                ? "ring-2 ring-primary/60"
                                : member.role === CollaboratorRole.EDITOR
                                  ? "ring-2 ring-emerald-500/60"
                                  : "ring-2 ring-border/60";
                            return (
                              <div key={member.userId} className="flex items-center gap-2">
                                <Avatar className={`h-8 w-8 ${ringClass}`}>
                                  {member.avatar ? (
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                  ) : null}
                                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.roleLabel}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )}

            {!isEditing && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6 w-full">
                {permissions.canEdit && (
                  <Button
                    variant="outline"
                    className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Th�m b�i h�t
                  </Button>
                )}
                {(permissions.canManageCollaborators || permissions.isOwner) && (
                  <Button
                    variant="outline"
                    className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                    onClick={() => setCollabOpen(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Collaborators
                  </Button>
                )}
                {!permissions.isOwner && isCurrentCollaborator && (
                  <Button
                    variant="outline"
                    onClick={handleLeaveCollaboration}
                    disabled={leaveLoading}
                    className="border-destructive/40 text-destructive hover:text-destructive hover:border-destructive/60"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {leaveLoading ? "Leaving..." : "Leave playlist"}
                  </Button>
                )}
                {permissions.isOwner && (
                  <Button
                    variant="outline"
                    className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit playlist
                  </Button>
                )}
              </div>
            )}

          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 md:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="icon"
              className={`h-16 w-16 rounded-full text-white shadow-2xl transition duration-200 ${
                isPlaying ? "bg-[#c084fc] hover:bg-[#c084fc]/90" : "bg-[#a855f7] hover:bg-[#9333ea]"
              }`}
              onClick={playAllSongs}
              disabled={!playlist?.songs.length}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={shufflePlaylistSongs}
              disabled={!playlist?.songs.length}
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </Button>
            <Button variant="ghost" className="text-white/80 hover:text-white" onClick={() => navigate("/playlists")}>
              Back to library
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white" onClick={handleDownloadPlaylist} disabled={!playlist?.songs.length}>
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`text-white/80 hover:text-white ${isPlaylistSaved ? "text-red-500" : ""}`}
              onClick={togglePlaylistFavorite}
              disabled={!playlistNumericId || playlistFavoritePending || playlistFavoriteLoading}
              aria-label={isPlaylistSaved ? "�� luu playlist n�y" : "Luu playlist v�o thu vi?n"}
            >
              <Heart className={`w-5 h-5 ${isPlaylistSaved ? "fill-current" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white" onClick={() => setSharePlaylistOpen(true)}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white" onClick={handlePlaylistActionComingSoon}>
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 md:px-8 pb-12 space-y-8">
        <Card className="border-white/10 bg-black/40 backdrop-blur">
          <CardContent className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              {(playlist?.songs || []).filter(s => !hiddenSongIds.includes(s.id)).map((song, index) => {
                // L?y avatar c?a ngu?i th�m b�i h�t t? friends list
                let addedByAvatar: string | null = null;
                if ((song as { addedById?: number }).addedById && friends.length > 0) {
                  const addedByFriend = friends.find(f => f.id === (song as { addedById?: number }).addedById);
                  if (addedByFriend?.avatar) {
                    addedByAvatar = addedByFriend.avatar;
                  }
                }
                // N?u kh�ng c� trong friends, th? l?y t? song object
                if (!addedByAvatar) {
                  addedByAvatar = (song as { addedByAvatar?: string | null }).addedByAvatar ?? null;
                }
                
                return (
                  <PlaylistSongItem
                    key={song.id}
                    song={{
                      ...song,
                      addedByAvatar: toAbsoluteUrl(addedByAvatar) || null,
                    }}
                    index={index}
                    isActive={currentSong?.id === song.id}
                    isPlaying={isPlaying}
                    onPlay={() => handlePlaySong(song)}
                    onRemove={permissions.canEdit ? () => confirmRemoveSong(song.id) : undefined}
                    onHide={meId && isCurrentCollaborator ? () => setHiddenSongIds(prev => prev.includes(song.id) ? prev : [...prev, song.id]) : undefined}
                    canEdit={permissions.canEdit}
                    isCollaborator={isCurrentCollaborator}
                    meId={meId}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recommended Section - shown for owner/editor */}
        {playlist && (permissions.canEdit || permissions.isOwner) && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Recommended</h2>
                  <p className="text-sm text-muted-foreground">
                    AI picks based on genres, moods, and your recent listening.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    loadRecommended();
                  }}
                  disabled={loadingRecommended}
                >
                  {loadingRecommended ? 'Loading...' : 'Find more'}
                </Button>
              </div>
              
              <div className="space-y-2">
                {loadingRecommended ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : recommendedSongs.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p className="text-sm">No suggestions yet. Tap "Find more" to fetch fresh picks.</p>
                  </div>
                ) : (
                  recommendedSongs.map((song) => {
                    // S? d?ng mapToPlayerSong d? l?y artist name ch�nh x�c
                    const mapped = mapToPlayerSong(song);
                    const artistNames = mapped.artist !== "Unknown" ? mapped.artist : "Unknown Artist";
                    const albumName = song.album?.name || (song as { albumName?: string }).albumName || song.name || "";
                    
                    return (
                      <div
                        key={song.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-background/30 transition-colors group cursor-pointer"
                        onClick={async () => {
                          try {
                            const songId = Number(song.id);
                            if (isNaN(songId)) return;
                            const fullSong = await songsApi.getById(String(songId));
                            if (fullSong) {
                              const mapped = mapToPlayerSong(fullSong);
                              setQueue([mapped]);
                              playSong(mapped);
                            }
                          } catch (error) {
                            console.error("Failed to play song:", error);
                            toast({
                              title: "L?i",
                              description: "Kh�ng th? ph�t b�i h�t n�y",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Avatar className="w-12 h-12 rounded-lg flex-shrink-0">
                          <AvatarImage src={song.urlImageAlbum || undefined} alt={song.name} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                            {(song.name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{song.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {artistNames}
                          </p>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground truncate">
                            {albumName || "Unknown Album"}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              addSongToPlaylist(song);
                            }}
                            disabled={addingSongIds.includes(Number(song.id))}
                          >
                            {addingSongIds.includes(Number(song.id)) ? 'Adding...' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); if (!o) setPendingDeleteSongId(null); }}
        onConfirm={handleConfirmDelete}
        isLoading={deleting}
        title="X�a b�i h�t kh?i playlist?"
        description={(() => {
          const t = playlist?.songs.find(s => String(s.id) === String(pendingDeleteSongId))?.title;
          return t ? `B?n c� ch?c mu?n x�a "${t}" kh?i playlist n�y?` : 'B?n c� ch?c mu?n x�a b�i h�t n�y kh?i playlist?';
        })()}
      />

      {/* Dialog x�c nh?n g? collaborator */}
      <AlertDialog open={removeCollabDialogOpen} onOpenChange={setRemoveCollabDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>G? c?ng t�c vi�n</AlertDialogTitle>
            <AlertDialogDescription>
              B?n c� ch?c mu?n g? {pendingRemoveCollab?.name || "c?ng t�c vi�n n�y"} kh?i playlist? H? s? kh�ng c�n quy?n truy c?p v�o playlist n�y.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingCollaboratorId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveCollaborator}
              disabled={removingCollaboratorId !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingCollaboratorId !== null ? "�ang x�a..." : "X�c nh?n"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog x�c nh?n Leave playlist collaboration */}
      <AlertDialog open={leaveCollabDialogOpen} onOpenChange={setLeaveCollabDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave playlist</AlertDialogTitle>
            <AlertDialogDescription>
              B?n c� ch?c mu?n Leave playlist n�y? B?n s? kh�ng c�n l� c?ng t�c vi�n v� kh�ng th? truy c?p playlist n�y n?a.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveCollaboration}
              disabled={leaveLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {leaveLoading ? "Leaving..." : "X�c nh?n"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CollaboratorDialog
        open={collabOpen}
        onOpenChange={(open) => {
          setCollabOpen(open);
          if (!open) {
            setSelectedFriendIds([]);
            setCollabSearch("");
          }
        }}
        canManage={permissions.canManageCollaborators}
        isOwner={permissions.isOwner}
        collaborators={collaboratorEntries}
        friends={friends}
        loadingFriends={loadingFriends}
        selectedFriendIds={selectedFriendIds}
        onToggleFriend={toggleSelectFriend}
        onRemoveCollaborator={handleRemoveCollaborator}
        onSendInvites={sendInvites}
        sendingInvites={sendingInvites}
        removingCollaboratorId={removingCollaboratorId}
        inviteRole={inviteRole}
        onRoleChange={setInviteRole}
        searchQuery={collabSearch}
        onSearchChange={setCollabSearch}
      />

      <Footer />
      
      {selectedSongForPlaylist && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={selectedSongForPlaylist.id}
          songTitle={selectedSongForPlaylist.name}
          songCover={selectedSongForPlaylist.urlImageAlbum}
        />
      )}

      <Dialog open={addDialogOpen} onOpenChange={(open) => setAddDialogOpen(permissions.canEdit ? open : false)}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden border border-white/10 bg-gradient-to-b from-[#0c0b13] via-[#0b0a12] to-[#05040c]"
          aria-describedby="add-song-dialog-description"
          aria-labelledby="add-song-dialog-title"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.2),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.18),transparent_35%)]" />
            <div className="relative p-6 space-y-5">
              <DialogHeader className="space-y-2">
                <DialogTitle id="add-song-dialog-title" className="text-2xl font-bold">
                  Add songs to playlist
                </DialogTitle>
                <DialogDescription id="add-song-dialog-description" className="text-sm text-muted-foreground">
                  Search tracks and drop them straight into this playlist.
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Search song or artist..."
                  className="pl-11 h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-primary/60"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  autoFocus
                />
                <div className="absolute inset-y-1 right-1 flex items-center">
                  <div className="h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 flex items-center gap-2">
                    <span className="hidden sm:inline">Live results</span>
                    {addSearchLoading && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                </div>
              </div>

              {addSearchError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {addSearchError}
                </div>
              )}

              <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1 scrollbar-custom">
                {addSearchLoading && (
                  <>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm animate-pulse"
                      >
                        <div className="w-12 h-12 rounded-lg bg-white/10" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 rounded bg-white/15 w-2/3" />
                          <div className="h-2.5 rounded bg-white/10 w-1/2" />
                        </div>
                        <div className="w-16 h-9 rounded bg-white/10" />
                      </div>
                    ))}
                  </>
                )}

                {!addSearchLoading && addResults.length === 0 && addSearch.trim().length < 2 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Type at least 2 characters to search songs.
                  </p>
                )}

                {!addSearchLoading && addResults.length === 0 && addSearch.trim().length >= 2 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No songs matched your search.
                  </p>
                )}

                {!addSearchLoading &&
                  addResults.map((s: SearchSongResult) => {
                    const coverUrl = (s as { urlImageAlbum?: string }).urlImageAlbum || "";
                    const artistNames = Array.isArray(s.artists)
                      ? s.artists.map((a: { name?: string }) => a.name || "").filter(Boolean).join(", ")
                      : typeof s.artists === "string"
                        ? s.artists
                        : "";
                    const numericId = typeof s.id === "number" ? s.id : Number((s as { songId?: number }).songId ?? s.id);
                    const alreadyInPlaylist = Number.isFinite(numericId) && existingSongIds.has(Number(numericId));
                    const isAdding = Number.isFinite(numericId) && addingSongIds.includes(Number(numericId));
                    return (
                      <div
                        key={s.id}
                        className="group flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                          {coverUrl ? (
                            <img src={coverUrl} alt={s.name || "Song"} className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-white">{s.name || s.songName || "Unknown Song"}</p>
                          {artistNames && <p className="text-xs text-white/70 truncate">{artistNames}</p>}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addSongToPlaylist(s)}
                          disabled={alreadyInPlaylist || isAdding || !Number.isFinite(numericId)}
                          variant={alreadyInPlaylist ? "secondary" : "outline"}
                          className="min-w-[90px]"
                        >
                          {alreadyInPlaylist ? "Added" : isAdding ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareButton
        title={playlist?.title || "Playlist"}
        type="playlist"
        playlistId={playlist ? Number(playlist.id) : undefined}
        url={playlist ? `${window.location.origin}/playlist/${createSlug(playlist.title, playlist.id)}` : undefined}
        isPrivate={playlist?.visibility === PlaylistVisibility.PRIVATE}
        open={sharePlaylistOpen}
        onOpenChange={setSharePlaylistOpen}
      />

      <style>{`
        .bar {
          display:inline-block;
          width:2px;
          height:8px;
          background:${isPlaying ? (palette?.primary ?? "rgb(167, 139, 250)") : "transparent"};
          animation:${isPlaying ? "pl-eq 1s ease-in-out infinite" : "none"};
        }
        .bar.delay-100{animation-delay:.12s}
        .bar.delay-200{animation-delay:.24s}
        @keyframes pl-eq{0%{height:4px}50%{height:14px}100%{height:4px}}
      `}</style>
    </div>
  );
};

export default PlaylistDetail;


















