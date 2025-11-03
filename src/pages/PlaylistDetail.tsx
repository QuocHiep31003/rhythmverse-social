import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Heart, MoreHorizontal, Users, Plus, Search, Edit, UserPlus, Trash2, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { useMusic, Song } from "@/contexts/MusicContext";
import { playlistsApi, PlaylistDTO, playlistCollabInvitesApi, playlistCollaboratorsApi, PlaylistPermissionError } from "@/services/api/playlistApi";
import { API_BASE_URL, buildJsonHeaders } from "@/services/api";
import { sendMessage } from "@/services/firebase/chat";
import { friendsApi } from "@/services/api/friendsApi";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { uploadImage } from "@/config/cloudinary";
import { PlaylistVisibility, CollaboratorRole } from "@/types/playlist";
import { getPlaylistPermissions, checkIfFriends } from "@/utils/playlistPermissions";

interface SearchSongResult {
  id: number;
  name: string;
  artists?: Array<{ id?: number; name: string }>;
  album?: { id?: number; name: string } | null;
  urlImageAlbum?: string;
  audioUrl?: string;
  duration?: number | string;
}

interface PlaylistOwner {
  id?: number;
  name?: string;
}

interface ExtendedPlaylistDTO extends Omit<PlaylistDTO, 'owner'> {
  urlImagePlaylist?: string;
  ownerId?: number;
  dateUpdate?: string | null;
  songLimit?: number;
  owner?: PlaylistOwner | null;
}

interface FriendResponse {
  id?: number;
  userId?: number;
  friendId?: number;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string | null;
}

interface PendingInvite {
  id?: number;
  playlistId?: number;
  senderId?: number;
  receiverId: number;
  role?: string;
  status?: string;
  inviteCode?: string;
  createdAt?: string;
}

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, setQueue, isPlaying, currentSong } = useMusic();

  const [isLiked, setIsLiked] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<{
    id: number;
    title: string;
    description: string;
    cover: string | null;
    ownerName?: string;
    ownerId?: number;
    visibility: PlaylistVisibility;
    updatedAt?: string | null;
    songs: (Song & { addedBy?: string; addedAt?: string })[];
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteSongId, setPendingDeleteSongId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<SearchSongResult[]>([]);
  const [adding, setAdding] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: number; name: string; avatar?: string | null }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
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
  const [permissions, setPermissions] = useState<{
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageCollaborators: boolean;
    isOwner: boolean;
  }>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageCollaborators: false,
    isOwner: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Permission flags derived from permission system
  // Using permissions state calculated from playlist data

  function toSeconds(input: unknown): number {
    try {
      if (typeof input === 'number' && Number.isFinite(input)) return input > 10000 ? Math.round(input/1000) : Math.round(input);
      if (typeof input === 'string') {
        const t = input.trim(); if (!t) return 0;
        if (t.includes(':')) {
          const parts = t.split(':').map(Number);
          if (parts.every(Number.isFinite)) {
            if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
            if (parts.length === 2) return parts[0]*60 + parts[1];
          }
        }
        const n = Number(t); if (Number.isFinite(n)) return n > 10000 ? Math.round(n/1000) : Math.round(n);
      }
    } catch {
      void 0;
    }
    return 0;
  }

  const msToMMSS = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const mm = Math.floor(s/60).toString().padStart(2,'0');
    const ss = Math.floor(s%60).toString().padStart(2,'0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data: PlaylistDTO = await playlistsApi.getById(Number(id));
        const extendedData = data as ExtendedPlaylistDTO;
        const mappedSongs: (Song & { addedBy?: string; addedAt?: string })[] = Array.isArray(data.songs)
          ? data.songs.map((s: SearchSongResult) => ({
              id: String(s.id),
              title: s.name,
              artist: Array.isArray(s.artists) && s.artists.length ? (s.artists.map((a) => a.name).join(', ')) : 'Unknown',
              album: s.album?.name || '',
              cover: s.urlImageAlbum || '',
              audioUrl: s.audioUrl || '',
              duration: toSeconds(s.duration),
            }))
          : [];
        
        const ownerId = data.ownerId ?? data.owner?.id;
        const visibility = (data.visibility as PlaylistVisibility) || PlaylistVisibility.PUBLIC;
        
        setPlaylist({
          id: data.id,
          title: data.name,
          description: data.description || '',
          cover: data.coverUrl || extendedData.urlImagePlaylist || null,
          ownerName: extendedData?.owner?.name,
          ownerId,
          visibility,
          updatedAt: extendedData?.dateUpdate || null,
          songs: mappedSongs,
        });
        setEditedTitle(data.name || '');
        setEditedDescription(data.description || '');
        setEditedCoverUrl(data.coverUrl || extendedData.urlImagePlaylist || '');
        setEditedVisibility(visibility);
        setEditedSongLimit(extendedData?.songLimit ?? 500);
        
        // Check if user is friend of owner (for FRIENDS_ONLY visibility)
        if (meId && ownerId && visibility === PlaylistVisibility.FRIENDS_ONLY) {
          const friendCheck = await checkIfFriends(meId, ownerId);
          setIsFriend(friendCheck);
        } else {
          setIsFriend(false);
        }
      } catch (e) {
        // Handle permission errors specifically
        if (e instanceof PlaylistPermissionError) {
          toast({ 
            title: 'Access Denied', 
            description: e.message, 
            variant: 'destructive' 
          });
          navigate('/playlist'); // Redirect to playlist list
          return;
        }
        const msg = e instanceof Error ? e.message : 'Failed to load playlist';
        toast({ title: 'Failed to load playlist', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, meId, navigate]);

  // Calculate permissions when playlist, collaborators, or friend status changes
  useEffect(() => {
    if (!playlist || !meId) {
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageCollaborators: false,
        isOwner: false,
      });
      return;
    }
    
    // Get visibility directly from playlist
    const visibility = playlist.visibility || PlaylistVisibility.PUBLIC;
    
    const playlistData = {
      ownerId: playlist.ownerId,
      visibility,
      collaborators: collaborators.map(c => ({
        userId: c.userId,
        name: c.name || '',
        email: c.email,
        role: c.role as CollaboratorRole,
      })),
    };
    
    const perms = getPlaylistPermissions({
      playlist: playlistData,
      currentUser: { id: meId },
      isFriend,
    });
    
    setPermissions(perms);
  }, [playlist, collaborators, meId, isFriend]);
  
  // Track if we've already tried to load collaborators (to avoid repeated 500 errors)
  const collabsLoadAttemptedRef = useRef(false);
  
  useEffect(() => {
    const loadCollabs = async () => {
      try {
        if (!id) return;
        
        // CHỈ load collaborators khi user MỞ dialog Collaborate
        // Tránh load không cần thiết để tránh 500 errors
        if (!collabOpen) {
          return; // Không load nếu dialog chưa mở
        }
        
        // Reset flag khi mở dialog để có thể retry
        collabsLoadAttemptedRef.current = false;
        
        // Only load if user is owner
        if (!permissions.isOwner) {
          setCollaborators([]);
          return;
        }
        
        const list = await playlistCollaboratorsApi.list(Number(id));
        setCollaborators(Array.isArray(list) ? list : []);
        collabsLoadAttemptedRef.current = true; // Mark success
      } catch (e: unknown) {
        // Mark as attempted to prevent infinite retries
        collabsLoadAttemptedRef.current = true;
        
        // Silently fail - collaborators list is optional
        // Only show error if explicitly opening collaborator dialog and user is owner
        if (collabOpen && permissions.isOwner) {
          const msg = e instanceof Error ? e.message : String(e);
          // Check if it's a 500 error (server error) vs permission error
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
        // Set empty array to avoid infinite loops
        setCollaborators([]);
      }
    };
    
    // Chỉ load khi dialog đang mở
    if (collabOpen && permissions.isOwner) {
      loadCollabs();
    }
  }, [id, collabOpen, permissions.isOwner]);

  // Load pending invites to filter out already invited friends
  useEffect(() => {
    const loadPendingInvites = async () => {
      if (!collabOpen || !playlist) return;
      try {
        const pending = await playlistCollabInvitesApi.pending();
        // Extract receiverId from pending invites for this playlist
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
        
        // Filter available friends:
        // 1. Remove owner (can't invite yourself)
        // 2. Remove existing collaborators (already a collaborator)
        // 3. Remove pending invites (already invited, waiting for accept/reject)
        const existingCollaboratorIds = new Set(collaborators.map(c => c.userId));
        const pendingInviteIds = new Set(pendingInvites.map(inv => inv.receiverId));
        const ownerId = playlist?.ownerId;
        
        const filtered = mapped.filter((x) => {
          if (typeof x.id !== 'number' || x.id <= 0) return false;
          if (ownerId && x.id === ownerId) return false; // Can't invite owner
          if (existingCollaboratorIds.has(x.id)) return false; // Already a collaborator
          if (pendingInviteIds.has(x.id)) return false; // Already invited (pending)
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

  const addSongToPlaylist = async (songId: number) => {
    if (!playlist) return;
    try {
      setAdding(true);
      const current = await playlistsApi.getById(playlist.id);
      const nextIds = Array.from(new Set([...(current.songIds || []), songId]));
      await playlistsApi.update(playlist.id, {
        name: current.name,
        description: current.description || "",
        coverUrl: current.coverUrl || null,
        visibility: current.visibility || "PUBLIC",
        songLimit: current.songLimit,
        dateUpdate: current.dateUpdate,
        songIds: nextIds,
      });
      toast({ title: 'Added', description: 'Song added to playlist' });
      // refresh
      const updated = await playlistsApi.getById(playlist.id);
      const mappedSongs: (Song & { addedBy?: string; addedAt?: string })[] = Array.isArray(updated.songs)
        ? updated.songs.map((s: SearchSongResult) => ({
            id: String(s.id),
            title: s.name,
            artist: Array.isArray(s.artists) && s.artists.length ? (s.artists.map((a) => a.name).join(', ')) : 'Unknown',
            album: s.album?.name || '',
            cover: s.urlImageAlbum || '',
            audioUrl: s.audioUrl || '',
            duration: 0,
          }))
        : [];
      setPlaylist((prev) => prev ? { ...prev, songs: mappedSongs } : prev);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add song', variant: 'destructive' });
    } finally { setAdding(false); }
  };

  const toggleSelectFriend = (fid: number) => setSelectedFriendIds((prev) => prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]);
  const sendInvites = async () => {
    if (!playlist) return;
    try {
      setSendingInvites(true);
      const successIds: number[] = [];
      const failedIds: number[] = [];
      
      for (const fid of selectedFriendIds) {
        try {
          await playlistCollabInvitesApi.send(playlist.id, fid, inviteRole);
          // Also share to Social chat for visibility
          try {
            const params = new URLSearchParams({ senderId: String(meId || ''), receiverId: String(fid), playlistId: String(playlist.id) });
            await fetch(`${API_BASE_URL}/chat/share/playlist?${params.toString()}`, { method: 'POST', headers: buildJsonHeaders() });
          } catch { /* ignore share errors */ }
          try {
            if (meId) await sendMessage(meId, fid, `đã mời bạn cộng tác vào playlist "${playlist.title}"`);
          } catch { /* ignore text errors */ }
          successIds.push(fid);
        } catch (e) {
          failedIds.push(fid);
          const friendName = friends.find(f => f.id === fid)?.name || `Friend ${fid}`;
          const errorMessage = e instanceof Error ? e.message : String(e);
          
          // Handle specific error types
          if (e instanceof PlaylistPermissionError) {
            console.error(`Permission denied sending invite to ${friendName}:`, e.message);
          } else {
            const errorStatus = (e as Error & { status?: number })?.status;
            
            if (errorStatus === 401) {
              console.error(`Unauthorized: ${friendName} - Login required`);
              // Will show toast in final error handling
            } else if (errorStatus === 400) {
              // Parse specific error messages from backend
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
        // Refresh pending invites and collaborators
        try {
          const pending = await playlistCollabInvitesApi.pending();
          const playlistPendingInvites = Array.isArray(pending) 
            ? pending.filter((inv: PendingInvite) => inv.playlistId === playlist.id)
            : [];
          setPendingInvites(playlistPendingInvites);
        } catch (e) {
          console.warn('Failed to refresh pending invites:', e);
        }
        // Reload collaborators
        try {
          const list = await playlistCollaboratorsApi.list(playlist.id);
          setCollaborators(Array.isArray(list) ? list : []);
        } catch (e) {
          console.warn('Failed to refresh collaborators:', e);
        }
        setCollabOpen(false);
        setSelectedFriendIds([]);
      } else if (failedIds.length > 0) {
        // Get detailed error messages for each failed friend
        const failedDetails = failedIds.map(id => {
          const friend = friends.find(f => f.id === id);
          return friend?.name || `Friend ${id}`;
        });
        
        // Show specific error based on first failure
        const firstError = failedIds[0];
        const firstFriendName = failedDetails[0];
        let errorMsg = '';
        
        // Try to get error message (will be logged in catch block above)
        errorMsg = failedIds.length === 1 
          ? `Không thể gửi lời mời cho ${firstFriendName}. Có thể đã được mời, đã là collaborator, hoặc không hợp lệ.`
          : `Không thể gửi lời mời cho ${failedIds.length} bạn bè (${failedDetails.slice(0, 2).join(', ')}${failedIds.length > 2 ? '...' : ''}).`;
        
        toast({ 
          title: '❌ Error', 
          description: errorMsg, 
          variant: 'destructive',
          duration: 6000,
        });
        // Refresh to update available friends list
        try {
          const pending = await playlistCollabInvitesApi.pending();
          const playlistPendingInvites = Array.isArray(pending) 
            ? pending.filter((inv: PendingInvite) => inv.playlistId === playlist.id)
            : [];
          setPendingInvites(playlistPendingInvites);
          const list = await playlistCollaboratorsApi.list(playlist.id);
          setCollaborators(Array.isArray(list) ? list : []);
        } catch (e) {
          console.warn('Failed to refresh data after error:', e);
        }
      }
    } catch (e) {
      // Handle top-level errors (401, network errors, etc.)
      if (e instanceof PlaylistPermissionError) {
        if (e.status === 401) {
          toast({ 
            title: '❌ Unauthorized', 
            description: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 
            variant: 'destructive',
            duration: 5000,
          });
          // Could redirect to login here
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
      // no success toast per request
      setDeleteOpen(false);
      setPendingDeleteSongId(null);
    } catch (e) {
      // Handle permission errors specifically
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
        {/* Back button removed to align with Album detail layout */}

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
            {/* hidden file input for cover upload */}
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
                      // Handle permission errors specifically
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

            <div className="flex items-center gap-4 mb-6 mt-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={""} alt={playlist?.ownerName || "Owner"} />
                <AvatarFallback>{(playlist?.ownerName || "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{playlist?.ownerName || 'Unknown'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{playlist?.songs.length || 0} songs</span>
              {playlist && playlist.songs.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{formatTotalDuration(totalDuration)}</span>
                </>
              )}
              {playlist?.updatedAt && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Updated {new Date(playlist.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>

            {collaborators.length > 0 && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Collaborators:</span>
                {collaborators.map((c) => (
                  <span key={c.userId} className="text-sm bg-muted/40 px-2 py-0.5 rounded">
                    {c.name || c.email} {c.role ? `(${c.role})` : ''}
                  </span>
                ))}
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
                              <Button size="sm" onClick={() => addSongToPlaylist(Number(s.id))} disabled={adding}>Add</Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
                {permissions.canManageCollaborators && (
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Collaborate
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Collaborators</DialogTitle>
                    <DialogDescription>
                      Select friends to collaborate on this playlist. Choose their role.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-72 overflow-y-auto">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="collab-role">Default Role:</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CollaboratorRole)}>
                        <SelectTrigger id="collab-role" className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CollaboratorRole.EDITOR}>✏️ EDITOR - Can add/remove songs</SelectItem>
                          <SelectItem value={CollaboratorRole.VIEWER}>👁️ VIEWER - View only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {loadingFriends ? (
                      <p className="text-sm text-muted-foreground">Loading friends...</p>
                    ) : friends.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No friends found.</p>
                    ) : (
                      friends.map((f) => (
                        <label key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-background/40">
                          <input type="checkbox" checked={selectedFriendIds.includes(f.id)} onChange={() => toggleSelectFriend(f.id)} />
                          <div className="flex items-center gap-2">
                            {f.avatar ? <img src={f.avatar} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-muted" />}
                            <span>{f.name}</span>
                          </div>
                        </label>
                      ))
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                      <Button variant="outline" onClick={() => { setCollabOpen(false); setSelectedFriendIds([]); }} disabled={sendingInvites}>Cancel</Button>
                      <Button onClick={sendInvites} disabled={sendingInvites || selectedFriendIds.length === 0}>
                        {sendingInvites ? 'Sending...' : `Send invites (${selectedFriendIds.length})`}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

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
              {(playlist?.songs || []).filter(s => !hiddenSongIds.includes(s.id)).map((song, index) => {
                const active = currentSong?.id === song.id;
                return (
                <div
                  key={song.id}
                  onClick={() => handlePlaySong(song)}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-background/30 transition-colors group cursor-pointer"
                >
                  <div className="w-8 text-center flex justify-center">
                    {active ? (
                      isPlaying ? (
                        <span className="flex gap-0.5 h-4 items-end">
                          <i className="bar" />
                          <i className="bar delay-100" />
                          <i className="bar delay-200" />
                        </span>
                      ) : (
                        <Play className="w-4 h-4" />
                      )
                    ) : (
                      <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  <Avatar className="w-12 h-12">
                    <AvatarImage src={song.cover} alt={song.title} />
                    <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{song.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>

                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">{song.album}</p>
                  </div>

                  <div className="hidden lg:block w-32">
                    {/* Reserved for addedBy/addedAt if backend provides */}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSongLike(song.id)}
                      className={`h-8 w-8 ${likedSongs.includes(song.id) ? 'text-red-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-current' : ''}`} />
                    </Button>

                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {toSeconds(song.duration) > 0 ? msToMMSS(toSeconds(song.duration)) : '--:--'}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label="Tùy chọn bài hát"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                        {meId && collaborators && collaborators.some(c => c.userId === meId) && (
                          <DropdownMenuItem onClick={() => setHiddenSongIds(prev => prev.includes(song.id) ? prev : [...prev, song.id])}>
                            Ẩn bài hát này
                          </DropdownMenuItem>
                        )}
                        {permissions.isOwner && (
                          <DropdownMenuItem onClick={() => setCollabOpen(true)}>
                            <Users className="w-4 h-4 mr-2" />Cộng tác
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch { void 0; } }}>
                          <Share2 className="w-4 h-4 mr-2" />Chia sẻ
                        </DropdownMenuItem>
                        {/* Owner/Editor can remove from playlist */}
                        {permissions.canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => confirmRemoveSong(song.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Xóa khỏi playlist
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );})}
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
    {/* equalizer animation */}
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
