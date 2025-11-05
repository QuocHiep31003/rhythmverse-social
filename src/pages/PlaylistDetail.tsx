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
import { Play, Heart, MoreHorizontal, Users, Plus, Search, Edit, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { useMusic, Song } from "@/contexts/MusicContext";
import { playlistsApi, PlaylistDTO, playlistCollabInvitesApi, playlistCollaboratorsApi, PlaylistPermissionError } from "@/services/api/playlistApi";
import { songsApi } from "@/services/api/songApi";
import { buildJsonHeaders } from "@/services/api";
import { friendsApi } from "@/services/api/friendsApi";
import { uploadImage } from "@/config/cloudinary";
import { PlaylistVisibility, CollaboratorRole } from "@/types/playlist";
import { getPlaylistPermissions, checkIfFriends } from "@/utils/playlistPermissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SearchSongResult, ExtendedPlaylistDTO, PendingInvite, PlaylistState } from "@/types/playlistDetail";
import { toSeconds, msToMMSS, isValidImageValue, resolveSongCover, mapSongsFromResponse, formatDateDisplay } from "@/utils/playlistUtils";
import { parseCollaboratorRole, normalizeCollaborators } from "@/utils/collaboratorUtils";
import { PlaylistSongItem } from "@/components/playlist/PlaylistSongItem";
import { CollaboratorDialog } from "@/components/playlist/CollaboratorDialog";

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, setQueue, isPlaying, currentSong } = useMusic();

  const [isLiked, setIsLiked] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<PlaylistState | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteSongId, setPendingDeleteSongId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<SearchSongResult[]>([]);
  const [addingSongIds, setAddingSongIds] = useState<number[]>([]);
  const [collabOpen, setCollabOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: number; name: string; avatar?: string | null }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [collabSearch, setCollabSearch] = useState("");
  const [collaborators, setCollaborators] = useState<Array<{ userId: number; name: string; email?: string; role?: CollaboratorRole | string }>>([]);
  const [hiddenSongIds, setHiddenSongIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedCoverUrl, setEditedCoverUrl] = useState("");
  const [editedVisibility, setEditedVisibility] = useState<PlaylistVisibility>(PlaylistVisibility.PUBLIC);
  const [editedSongLimit, setEditedSongLimit] = useState<number>(500);
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>(CollaboratorRole.EDITOR);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<number | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collabsLoadAttemptedRef = useRef(false);
  const collaboratorsFetchIdRef = useRef<number | null>(null);
  const fetchedSongCoverIdsRef = useRef<Set<string>>(new Set());
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
      entries.push({
        userId: playlist.ownerId,
        name: playlist.ownerName || "Owner",
        avatar: playlist.ownerAvatar || null,
        role: "OWNER",
        roleLabel: "Owner",
        isOwner: true,
      });
      seen.add(playlist.ownerId);
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
      entries.push({
        userId: idNum,
        name: c.name || c.email || `User ${idNum}`,
        avatar: (c as { avatar?: string | null }).avatar ?? null,
        role: normalizedRole,
        roleLabel,
        isOwner: false,
      });
      seen.add(idNum);
    });

    return entries;
  }, [playlist, collaborators]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data: PlaylistDTO = await playlistsApi.getById(Number(id));
        const extendedData = data as ExtendedPlaylistDTO;
        const playlistFallbackCover = data.coverUrl || extendedData.urlImagePlaylist || null;
        const mappedSongs = mapSongsFromResponse(data.songs, playlistFallbackCover);
        
        const ownerId = data.ownerId ?? data.owner?.id;
        const normalizeVisibility = (v: unknown): PlaylistVisibility => {
          const raw = typeof v === 'string' ? v.toUpperCase() : '';
          if (raw === 'FRIENDS_ONLY') return PlaylistVisibility.FRIENDS_ONLY;
          if (raw === 'PRIVATE') return PlaylistVisibility.PRIVATE;
          if (raw === 'PUBLIC') return PlaylistVisibility.PUBLIC;
          return PlaylistVisibility.PUBLIC;
        };
        const visibility = normalizeVisibility((data as PlaylistDTO).visibility);
        
        setPlaylist({
          id: data.id,
          title: data.name,
          description: data.description || '',
          cover: playlistFallbackCover,
          ownerName: extendedData?.owner?.name,
          ownerAvatar: extendedData?.owner?.avatar ?? null,
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
        setEditedSongLimit(extendedData?.songLimit ?? 500);
        
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
  }, [id, meId, navigate, updateCollaboratorsFromRaw]);

  useEffect(() => {
    const songs = playlist?.songs ?? [];
    if (!songs.length) return;
    const playlistCover = playlist?.cover ?? null;
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
              const detailCover = resolveSongCover(detail as unknown as SearchSongResult & { songId?: number }, playlistCover);
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
  }, [playlist?.id, collaborators.length, updateCollaboratorsFromRaw]);

  useEffect(() => {
    const loadCollabs = async () => {
      try {
        if (!id) return;
        if (!collabOpen) return;
        collabsLoadAttemptedRef.current = false;
        if (!permissions.isOwner) return;
        
        const list = await playlistCollaboratorsApi.list(Number(id));
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
  }, [id, collabOpen, permissions.isOwner, permissions.userRole, updateCollaboratorsFromRaw, isCurrentCollaborator]);

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

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const me = rawUserId ? Number(rawUserId) : undefined;
        if (!me) { setFriends([]); return; }
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
              avatar: f.friendAvatar ?? f.avatar ?? null,
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
      } catch { setFriends([]); }
      finally { setLoadingFriends(false); }
    };
    if (collabOpen) fetchFriends();
  }, [collabOpen, playlist?.ownerId, collaborators, pendingInvites]);

  useEffect(() => {
    const run = async () => {
      const q = addSearch.trim();
      if (!q) { setAddResults([]); return; }
      try {
        const res = await fetch(`http://localhost:8080/api/songs?search=${encodeURIComponent(q)}&size=10`, { headers: buildJsonHeaders() });
        if (!res.ok) return;
        const data = await res.json() as { content?: SearchSongResult[] };
        setAddResults(data.content || []);
      } catch { setAddResults([]); }
    };
    run();
  }, [addSearch]);

  const addSongToPlaylist = async (song: SearchSongResult) => {
    if (!playlist) return;
    const songId =
      typeof song.id === 'number'
        ? song.id
        : Number((song as { songId?: number }).songId);
    if (!Number.isFinite(songId)) return;
    const fallbackCover = playlist.cover ?? null;
    const previousSnapshot = playlist ? { ...playlist, songs: [...playlist.songs] } : null;
    const optimisticAddedAt = new Date().toISOString();
    const optimisticSong: Song & { addedBy?: string; addedAt?: string } = {
      id: String(songId),
      title: song.name,
      artist: Array.isArray(song.artists) && song.artists.length
        ? song.artists.map((a) => a.name).filter(Boolean).join(', ')
        : 'Unknown',
      album: song.album?.name || '',
      cover: resolveSongCover(song as SearchSongResult & { songId?: number }, fallbackCover),
      audioUrl: song.audioUrl || '',
      duration: toSeconds(song.duration),
      addedAt: optimisticAddedAt,
      addedBy: 'You',
    };
    setAddingSongIds((prev) => (prev.includes(songId) ? prev : [...prev, songId]));
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
      const updated = await playlistsApi.getById(playlist.id);
      const extendedUpdated = updated as ExtendedPlaylistDTO;
      const mappedSongs = mapSongsFromResponse(updated.songs, updated.coverUrl || extendedUpdated.urlImagePlaylist || fallbackCover);
      setPlaylist((prev) => prev ? {
        ...prev,
        cover: updated.coverUrl || extendedUpdated.urlImagePlaylist || prev.cover,
        songs: mappedSongs,
        totalSongs: Array.isArray(updated.songs) ? updated.songs.length : Array.isArray(updated.songIds) ? updated.songIds.length : mappedSongs.length,
        updatedAt: extendedUpdated?.dateUpdate ?? extendedUpdated?.updatedAt ?? prev.updatedAt ?? optimisticAddedAt,
      } : prev);
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
  
  const handleRemoveCollaborator = async (collaboratorId: number, collaboratorName?: string) => {
    if (!playlist || !permissions.isOwner) return;
    const confirmed = window.confirm(`Bạn có chắc muốn gỡ ${collaboratorName || "cộng tác viên này"} khỏi playlist?`);
    if (!confirmed) return;
    setRemovingCollaboratorId(collaboratorId);
    try {
      await playlistCollaboratorsApi.remove(playlist.id, collaboratorId);
      toast({
        title: "Đã gỡ cộng tác viên",
        description: `${collaboratorName || "Cộng tác viên"} sẽ không còn quyền truy cập.`,
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
        title: "Không thể gỡ cộng tác viên",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRemovingCollaboratorId(null);
    }
  };

  const handleLeaveCollaboration = async () => {
    if (!playlist || typeof meId !== "number" || !Number.isFinite(meId)) return;
    const confirmed = window.confirm("Bạn có chắc muốn rời khỏi playlist này?");
    if (!confirmed) return;
    setLeaveLoading(true);
    try {
      await playlistCollaboratorsApi.leave(playlist.id);
      toast({
        title: "Đã rời khỏi playlist",
        description: "Bạn không còn là cộng tác viên của playlist này.",
      });
      setCollaborators((prev) => prev.filter((c) => c.userId !== meId));
    } catch (e) {
      const message =
        e instanceof PlaylistPermissionError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Không thể rời khỏi playlist. Vui lòng thử lại.";
      toast({
        title: "Rời khỏi playlist thất bại",
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
                reason = `Playlist không tồn tại`;
              } else if (errorMessage.includes('Receiver not found')) {
                reason = `${friendName} không tồn tại trong hệ thống`;
              } else if (errorMessage.includes('Sender not found')) {
                reason = 'Tài khoản của bạn không hợp lệ';
              } else if (errorMessage.includes('Only playlist owner can send invites')) {
                reason = 'Chỉ chủ sở hữu playlist mới có thể mời';
              } else if (errorMessage.includes('You cannot invite yourself') || errorMessage.includes('invite yourself')) {
                reason = `Không thể mời chính mình`;
              } else if (errorMessage.includes('Invite already sent')) {
                reason = `Đã gửi lời mời cho ${friendName} rồi`;
              } else if (errorMessage.includes('already accepted')) {
                reason = `${friendName} đã chấp nhận lời mời rồi`;
              } else if (errorMessage.includes('already a collaborator')) {
                reason = `${friendName} đã là collaborator rồi`;
              } else if (errorMessage.includes('already') || errorMessage.includes('exists')) {
                reason = `Đã gửi lời mời hoặc ${friendName} đã là collaborator`;
              }
              console.warn(`❌ Invalid invite request for ${friendName}: ${reason}`, e);
            } else {
              console.error(`❌ Failed to send invite to ${friendName}:`, e);
            }
          }
        }
      }
      
      if (successIds.length > 0) {
        const successMsg = failedIds.length > 0
          ? `${successIds.length} friend${successIds.length > 1 ? 's' : ''} invited, ${failedIds.length} failed`
          : `${successIds.length} friend${successIds.length > 1 ? 's' : ''} invited`;
        toast({ 
          title: '✅ Invites sent', 
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
          ? `Không thể gửi lời mời cho ${firstFriendName}. Có thể đã được mời, đã là collaborator, hoặc không hợp lệ.`
          : `Không thể gửi lời mời cho ${failedIds.length} bạn bè (${failedDetails.slice(0, 2).join(', ')}${failedIds.length > 2 ? '...' : ''}).`;
        
        toast({ 
          title: '❌ Error', 
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
            title: '❌ Unauthorized', 
            description: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 
            variant: 'destructive',
            duration: 5000,
          });
        } else {
          toast({ 
            title: '❌ Permission Denied', 
            description: e.message, 
            variant: 'destructive',
            duration: 5000,
          });
        }
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to send invites';
        toast({ 
          title: '❌ Error', 
          description: `Có lỗi xảy ra khi gửi lời mời: ${msg}`, 
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

  const togglePlaylistLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from your playlists" : "Added to your playlists",
      duration: 2000,
    });
  };

  const toggleSongLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const playAllSongs = () => {
    if (!playlist || !playlist.songs.length) return;
    setQueue(playlist.songs);
    playSong(playlist.songs[0]);
    toast({
      title: `Playing ${playlist?.title}`,
      description: `${playlist?.songs.length} songs`,
      duration: 3000,
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
        const message = e instanceof Error ? e.message : 'Xóa thất bại';
        toast({ title: 'Lỗi', description: message, variant: 'destructive' });
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
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
                  <div className="w-full h-full bg-muted" />
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

          <div className="flex-1">
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
              <div className="space-y-3 mb-2">
                <Input className="text-3xl md:text-4xl font-bold" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} placeholder="Playlist title" />
                <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} placeholder="Description" rows={3} />
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="limit">Song limit</Label>
                    <Input id="limit" type="number" min={1} max={1000} value={editedSongLimit} onChange={(e) => setEditedSongLimit(parseInt(e.target.value) || 500)} className="w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => {
                    if (!playlist) return;
                    try {
                      await playlistsApi.update(playlist.id, {
                        name: editedTitle.trim() || playlist.title,
                        description: editedDescription,
                        coverUrl: editedCoverUrl || undefined,
                        visibility: editedVisibility,
                        songLimit: editedSongLimit,
                        dateUpdate: new Date().toISOString().split('T')[0],
                        songIds: playlist.songs.map(s => Number(s.id)),
                      });
                      setPlaylist({ ...playlist, title: editedTitle.trim() || playlist.title, description: editedDescription, cover: editedCoverUrl || playlist.cover, visibility: editedVisibility });
                      setIsEditing(false);
                      toast({ title: 'Playlist updated' });
                    } catch (e) {
                      if (e instanceof PlaylistPermissionError) {
                        toast({ title: 'Access Denied', description: e.message, variant: 'destructive' });
                      } else {
                        const message = e instanceof Error ? e.message : 'Failed to update playlist';
                        toast({ title: 'Error', description: message, variant: 'destructive' });
                      }
                    }
                  }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditedTitle(playlist?.title || ''); setEditedDescription(playlist?.description || ''); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-2">{playlist?.title || 'Playlist'}</h1>
                <p className="text-sm text-muted-foreground">{playlist?.description}</p>
              </>
            )}

            <div className="flex items-center gap-3 mb-6 mt-4">
              <Avatar className="w-9 h-9 border border-border/50 bg-muted">
                {playlist?.ownerAvatar ? (
                  <AvatarImage src={playlist.ownerAvatar} alt={playlist.ownerName || "Owner"} />
                ) : (
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <AvatarFallback className="bg-muted">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              {playlist?.ownerName && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      <span className="font-medium truncate">{playlist.ownerName}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm font-medium">{playlist.ownerName}</p>
                      {playlist?.ownerId && <p className="text-xs text-muted-foreground">User ID: {playlist.ownerId}</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{(playlist?.songs.length || 0) > 0 ? playlist?.songs.length : (playlist?.totalSongs ?? 0)} songs</span>
              {playlist && playlist.songs.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{formatTotalDuration(totalDuration)}</span>
                </>
              )}
              {(() => {
                const d = playlist?.updatedAt;
                const t = d ? new Date(d) : null;
                const valid = t && !isNaN(t.getTime());
                return valid ? (
                <>
                  <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Updated {t.toLocaleDateString()}</span>
                </>
                ) : null;
              })()}
            </div>

            {collaboratorEntries.length > 0 && (
              <div className="mb-6 flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Collaborators
                </span>
                <div className="flex -space-x-2">
                  {collaboratorEntries.map((member) => {
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
                              <AvatarImage src={member.avatar || undefined} alt={member.name} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatar || undefined} alt={member.name} />
                                <AvatarFallback>{initials}</AvatarFallback>
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
                                {removingCollaboratorId === member.userId ? "Đang xóa..." : "Gỡ khỏi playlist"}
                              </Button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button size="lg" onClick={playAllSongs} className="bg-primary hover:bg-primary/90" disabled={!playlist || playlist.songs.length === 0}>
                <Play className="w-5 h-5 mr-2" />
                Play All
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={togglePlaylistLike}
                className={isLiked ? "text-red-500 border-red-500" : ""}
              >
                <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </Button>

              {playlist && (
                <ShareButton title={playlist.title} type="playlist" playlistId={Number(playlist.id)} url={`${window.location.origin}/playlist/${Number(playlist.id)}`} />
              )}

              {!permissions.isOwner && isCurrentCollaborator && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLeaveCollaboration}
                  disabled={leaveLoading}
                  className="border-destructive/40 text-destructive hover:text-destructive hover:border-destructive/60"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {leaveLoading ? "Đang rời..." : "Rời khỏi"}
                </Button>
              )}

              {permissions.canEdit && (
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Song
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-custom">
                    <DialogHeader>
                      <DialogTitle>Add Song to Playlist</DialogTitle>
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
                          addResults.map((s: SearchSongResult) => (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{Array.isArray(s.artists) ? s.artists.map((a) => a.name).join(', ') : ''}</p>
                              </div>
                              <Button size="sm" onClick={() => addSongToPlaylist(s)} disabled={addingSongIds.includes(Number(s.id))}>{addingSongIds.includes(Number(s.id)) ? 'Adding...' : 'Add'}</Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

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

              {permissions.isOwner && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
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
              {(playlist?.songs || []).filter(s => !hiddenSongIds.includes(s.id)).map((song, index) => (
                <PlaylistSongItem
                  key={song.id}
                  song={song}
                  index={index}
                  isActive={currentSong?.id === song.id}
                  isPlaying={isPlaying}
                  isLiked={likedSongs.includes(song.id)}
                  onPlay={() => handlePlaySong(song)}
                  onToggleLike={() => toggleSongLike(song.id)}
                  onRemove={permissions.canEdit ? () => confirmRemoveSong(song.id) : undefined}
                  onHide={meId && isCurrentCollaborator ? () => setHiddenSongIds(prev => prev.includes(song.id) ? prev : [...prev, song.id]) : undefined}
                  onCollab={permissions.isOwner ? () => setCollabOpen(true) : undefined}
                  canEdit={permissions.canEdit}
                  isCollaborator={isCurrentCollaborator}
                  meId={meId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
    <DeleteConfirmDialog
      open={deleteOpen}
      onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); if (!o) setPendingDeleteSongId(null); }}
      onConfirm={handleConfirmDelete}
      isLoading={deleting}
      title="Xóa bài hát khỏi playlist?"
      description={(() => {
        const t = playlist?.songs.find(s => String(s.id) === String(pendingDeleteSongId))?.title;
        return t ? `Bạn có chắc muốn xóa "${t}" khỏi playlist này?` : 'Bạn có chắc muốn xóa bài hát này khỏi playlist?';
      })()}
    />
    <Footer />
    <style>{`
      .bar { display:inline-block; width:2px; height:8px; background:${isPlaying ? 'hsl(var(--primary))' : 'transparent'}; animation:${isPlaying ? 'ev 1s ease-in-out infinite' : 'none'}; }
      .bar.delay-100{animation-delay:.12s}
      .bar.delay-200{animation-delay:.24s}
      @keyframes ev{0%{height:4px}50%{height:14px}100%{height:4px}}
    `}</style>
    </div>
  );
};

export default PlaylistDetail;
