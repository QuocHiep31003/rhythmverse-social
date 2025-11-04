import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { friendsApi, inviteLinksApi } from "@/services/api/friendsApi";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";
import { chatApi, ChatMessageDTO, SharedAlbumDTO, SharedContentDTO, SharedContentType, SharedPlaylistDTO, SharedSongDTO } from "@/services/api/chatApi";
import { useMusic, Song } from "@/contexts/MusicContext";
import { songsApi } from "@/services/api/songApi";
import { playlistsApi, PlaylistDTO } from "@/services/api/playlistApi";
import { albumsApi } from "@/services/api/albumApi";
import { watchChatMessages, type FirebaseMessage } from "@/services/firebase/chat";
import { watchNotifications, NotificationDTO as FBNotificationDTO } from "@/services/firebase/notifications";

import {
  MessageCircle,
  Users,
  Share2,
  Send,
  Search,
  Music,
  Flame,
  Headphones,
  Play
} from "lucide-react";

// Realtime notification DTO from /user/queue/notifications
const envVars = ((import.meta as unknown) as { env?: Record<string, string | undefined> }).env || {};

interface CollabInviteDTO {
  id: number;
  playlistId?: number;
  playlistName?: string;
  senderId?: number;
  senderName?: string;
  role?: string;
  playlist?: {
    id?: number;
    name?: string;
    description?: string | null;
    coverUrl?: string | null;
    visibility?: string | null;
    songLimit?: number | null;
    songs?: Array<{
      id?: number;
      name?: string;
      artists?: unknown;
      urlImageAlbum?: string | null;
      coverUrl?: string | null;
      duration?: number | string | null;
    }>;
  } | null;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: "text" | "song" | "playlist" | "album";
  songData?: {
    id?: string | number;
    title: string;
    artist: string;
  };
  playlistData?: {
    id: number;
    name: string;
    coverUrl?: string | null;
    songCount?: number;
    owner?: string;
  };
  albumData?: {
    id: number;
    name: string;
    coverUrl?: string | null;
    artist?: string;
    releaseYear?: number;
  };
  sharedContentType?: SharedContentType;
  sharedPlaylist?: SharedPlaylistMessageData;
  sharedAlbum?: SharedAlbumMessageData;
  sharedSong?: SharedSongMessageData;
}

interface SharedPlaylistSongMessageData {
  id?: number;
  name?: string;
  artists: string[];
  coverUrl?: string | null;
  durationLabel?: string | null;
}

interface SharedPlaylistMessageData {
  id?: number;
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: string | null;
  songLimit?: number | null;
  songs: SharedPlaylistSongMessageData[];
  ownerName?: string | null;
  totalSongs?: number | null;
}

interface SharedAlbumMessageData {
  id?: number;
  name?: string;
  coverUrl?: string | null;
  artistName?: string | null;
  releaseYear?: number | null;
  releaseDateLabel?: string | null;
}

interface SharedSongMessageData {
  id?: number;
  name?: string;
  artists: string[];
  coverUrl?: string | null;
  audioUrl?: string | null;
  durationLabel?: string | null;
}

const DEFAULT_ARTIST_NAME = "Unknown Artist";

function normalizeArtistName(artist: unknown): string {
  if (!artist) return DEFAULT_ARTIST_NAME;
  if (typeof artist === "string") return artist;
  if (Array.isArray(artist)) {
    const first = artist[0];
    return first ? normalizeArtistName(first) : DEFAULT_ARTIST_NAME;
  }
  if (typeof artist === "object" && artist !== null) {
    const maybeName = (artist as { name?: unknown }).name;
    if (maybeName) return normalizeArtistName(maybeName);
  }
  return DEFAULT_ARTIST_NAME;
}

const extractArtistNames = (artists: unknown): string[] => {
  if (!Array.isArray(artists)) return [];
  return artists
    .map((artist) => {
      if (!artist) return null;
      if (typeof artist === "string") return artist;
      if (typeof artist === "object") {
        const maybeName = (artist as { name?: unknown }).name;
        if (typeof maybeName === "string") return maybeName;
      }
      return null;
    })
    .filter((name): name is string => !!(name && name.trim().length > 0))
    .map((name) => name.trim());
};

const formatDurationLabel = (input: unknown): string | null => {
  if (input == null) return null;
  if (typeof input === "string" && input.trim().length > 0) return input.trim();
  if (typeof input === "number" && Number.isFinite(input)) {
    const totalSeconds = Math.max(0, Math.floor(input));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return null;
};

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  isOnline: boolean;
  currentlyListening?: {
    title: string;
    artist: string;
  };
  streak: number;
}

interface ApiFriendDTO {
  id: number; // relationship id
  friendId: number;
  friendName: string;
  friendEmail: string;
  friendAvatar: string | null;
  createdAt: string;
}
interface ApiPendingDTO {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string | null;
  receiverId: number;
  receiverName?: string;
  status: string;
  createdAt: string;
}

const Social = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const inviteCode = (searchParams.get('inviteCode') || '').trim();

  // Token presence helper
  const hasToken = useMemo(() => {
    try {
      return !!(
        localStorage.getItem('token') ||
        localStorage.getItem('adminToken') ||
        ((): string | null => { try { return sessionStorage.getItem('token'); } catch { return null; } })()
      );
    } catch {
      try { return !!(localStorage.getItem('token') || localStorage.getItem('adminToken')); } catch { return false; }
    }
  }, []);

  // Preserve invite URL so after login we can return
  useEffect(() => {
    if (inviteCode) {
      try {
        localStorage.setItem('pendingInviteUrl', window.location.pathname + window.location.search);
      } catch { void 0; }
    }
  }, [inviteCode]);

  // Do not auto-accept on link open; user must click Accept/Decline.
  const [pending, setPending] = useState<ApiPendingDTO[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [collabInvites, setCollabInvites] = useState<CollabInviteDTO[]>([]);
  const [loadingCollabInvites, setLoadingCollabInvites] = useState<boolean>(false);
  const [expandedInviteId, setExpandedInviteId] = useState<number | null>(null);

  // Note: do not memoize userId; always read latest from localStorage
  const meId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [localStorage.getItem('userId')]);

  // Music context (for sharing current song)
  const { currentSong, playSong } = useMusic();

  // Chat state: messages per friend id
  const [chatByFriend, setChatByFriend] = useState<Record<string, Message[]>>({});
  // (typing removed; backend contract does not include typing events)

  // Define load functions BEFORE they are used in useEffect
  const loadFriends = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const idNum = raw ? Number(raw) : NaN;
    if (!Number.isFinite(idNum)) return;
    setLoadingFriends(true);
    try {
      const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(idNum);
      const mapped: Friend[] = apiFriends.map((f) => ({
        id: String(f.friendId || f.id),
        name: f.friendName || `User ${f.friendId}`,
        username: f.friendEmail ? `@${(f.friendEmail.split('@')[0] || '').toLowerCase()}` : `@user${f.friendId}`,
        avatar: f.friendAvatar || undefined,
        isOnline: false,
        streak: 0,
      }));
      setFriends(mapped);
      if (mapped.length > 0) setSelectedChat((prev) => prev ?? mapped[0].id);
    } catch (e) {
      console.error('Failed to load friends', e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadPending = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const idNum = raw ? Number(raw) : NaN;
    if (!Number.isFinite(idNum)) return;
    setLoadingPending(true);
    try {
      const data: ApiPendingDTO[] = await friendsApi.getPending(idNum);
      setPending(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load pending requests', e);
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadCollabInvites = async () => {
    setLoadingCollabInvites(true);
    try {
      const list = await playlistCollabInvitesApi.pending();
      setCollabInvites(Array.isArray(list) ? list : []);
    } catch { setCollabInvites([]); }
    finally { setLoadingCollabInvites(false); }
  };

  useEffect(() => {
    if (expandedInviteId == null) return;
    if (!collabInvites.some(inv => inv.id === expandedInviteId)) {
      setExpandedInviteId(null);
    }
  }, [collabInvites, expandedInviteId]);

  // Firebase Realtime handler
  // Memoize friendIds để tránh tạo array mới mỗi lần render (tránh trigger presence watch không cần thiết)
  const friendsIdsString = useMemo(() => JSON.stringify(friends.map(f => f.id).sort()), [friends.map(f => f.id).join(',')]);
  const friendIds = useMemo(() => friends.map(f => Number(f.id)).sort((a, b) => a - b), [friendsIdsString]);
  const { sendMessage, watchChatWithFriend, isConnected } = useFirebaseRealtime(meId, {
    onPresence: (p) => {
      console.log('[Social] Presence update received:', p, 'online:', p.online, 'type of userId:', typeof p.userId);
      setFriends(prev => {
        const updated = prev.map(f => {
          const friendId = Number(f.id);
          const match = friendId === p.userId;
          if (match) {
            const newOnlineStatus = !!p.online;
            console.log('[Social] ✅ MATCH! Updating friend', friendId, 'from', f.isOnline, 'to', newOnlineStatus);
            return { ...f, isOnline: newOnlineStatus };
          }
          return f;
        });
        console.log('[Social] Updated friends list:', updated.map(f => ({ id: f.id, isOnline: f.isOnline })));
        return updated;
      });
    },
    onNotification: (n: FBNotificationDTO) => {
      try {
        if (n?.type === 'MESSAGE') {
          toast(`${n.senderName || 'Someone'}: ${n.body || ''}`);
        } else if (n?.type === 'SHARE') {
          const title = n?.metadata?.playlistName || n?.metadata?.songName || n?.metadata?.albumName || n?.title || 'Shared content';
          toast(`${n.senderName || 'Someone'} shared: ${title}`);
          // Also reflect the share inside the chat thread for the receiver
          try {
            const sid = n.senderId;
            if (sid) {
              const friendKey = String(sid);
              let url = '';
              const m = n.metadata as { playlistId?: number; songId?: number; albumId?: number } | undefined;
              if (m?.playlistId) url = `${window.location.origin}/playlist/${m.playlistId}`;
              else if (m?.songId) url = `${window.location.origin}/song/${m.songId}`;
              else if (m?.albumId) url = `${window.location.origin}/album/${m.albumId}`;
              const content = url ? url : title;
              const msg: Message = {
                id: `${Date.now()}`,
                sender: n.senderName || `User ${sid}`,
                content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text',
              };
              setChatByFriend(prev => ({ ...prev, [friendKey]: [...(prev[friendKey] || []), msg] }));
            }
          } catch { void 0; }
        } else if (n?.type === 'INVITE') {
          toast(`${n.senderName || 'Someone'} invited you to collaborate on a playlist`);
          loadCollabInvites().catch(() => { void 0; });
          try { navigate('/playlists/invites'); } catch { void 0; }
        } else if (n?.type === 'FRIEND_REQUEST') {
          toast(`${n.senderName || 'Someone'} sent you a friend request`);
          loadPending().catch(() => { void 0; });
        } else if (n?.type === 'FRIEND_REQUEST_ACCEPTED') {
          toast(`${n.senderName || 'Someone'} accepted your friend request`);
          loadFriends().catch(() => { void 0; });
        }
      } catch { void 0; }
    },
    friends: friendIds
  });

  // Watch chat messages for selected friend
  useEffect(() => {
    if (!meId || !selectedChat) return;
    
    console.log('[Social] Setting up Firebase watch for chat:', { meId, friendId: selectedChat });
    
    const unsubscribe = watchChatMessages(meId, Number(selectedChat), (messages) => {
      console.log('[Social] Received messages from Firebase:', messages.length);
      const parsed = messages.map((m) => {
        const firebaseMessage = m as FirebaseMessage;
        const normalized = {
          ...(firebaseMessage as unknown as ChatMessageDTO),
          contentPlain:
            firebaseMessage.contentPlain ??
            (typeof firebaseMessage.content === "string" ? firebaseMessage.content : undefined),
        };
        return parseIncomingContent(normalized, friends);
      });
      setChatByFriend(prev => {
        // Merge với messages hiện tại để tránh mất optimistic updates
        const existing = prev[selectedChat] || [];
        const existingIds = new Set(existing.map(m => m.id));
        const newParsed = parsed.filter(m => !existingIds.has(m.id));
        return { ...prev, [selectedChat]: [...existing, ...newParsed].sort((a, b) => {
          const timeA = a.timestamp;
          const timeB = b.timestamp;
          return timeA.localeCompare(timeB);
        }) };
      });
    });

    return () => {
      console.log('[Social] Cleaning up Firebase watch');
      unsubscribe();
    };
  }, [meId, selectedChat, JSON.stringify(friends.map(f => f.id))]);

  // Initial presence fetch for all friends (fallback n?u Firebase chua ready)
  useEffect(() => {
    (async () => {
      try {
        if (!friends.length || !meId) return;
        const ids = friends.map(f => f.id).join(',');
        const base = envVars.VITE_API_BASE_URL || '';
        const res = await fetch(`${base}/api/presence/status?userIds=${encodeURIComponent(ids)}`, { headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } });
        const map = await res.json();
        setFriends(prev => prev.map(f => ({ ...f, isOnline: !!map[String(f.id)] })));
        // Firebase realtime s? override sau d�
      } catch { void 0; }
    })();
  }, [JSON.stringify(friends.map(f => f.id).sort()), meId]);

  // Listen to local share-sent events to append to chat immediately for the sender
  useEffect(() => {
    const onLocalShare = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as {
          receiverId: number;
          message?: ChatMessageDTO;
          content?: string;
          kind?: "SONG";
          songId?: number;
          title?: string;
        } | undefined;
        if (!detail) return;
        const friendKey = String(detail.receiverId);
        if (detail.message) {
          const normalizedMessage = {
            ...detail.message,
            contentPlain:
              detail.message.contentPlain ??
              (typeof detail.message.content === "string" ? detail.message.content : undefined),
          };
          const parsed = parseIncomingContent(normalizedMessage, friends);
          setChatByFriend(prev => {
            const existing = prev[friendKey] || [];
            const incomingId = parsed.id;
            const already = existing.find((m) => m.id === incomingId);
            const nextList = already
              ? existing.map((m) => (m.id === incomingId ? parsed : m))
              : [...existing, parsed];
            return { ...prev, [friendKey]: nextList };
          });
          return;
        }
        const baseMsg = { id: `${Date.now()}`, sender: 'You', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } as const;
        const msg: Message = detail.kind === 'SONG' && detail.songId != null
          ? { ...baseMsg, type: 'song', content: 'Shared a song', songData: { id: detail.songId, title: detail.title || '', artist: '' } }
          : { ...baseMsg, type: 'text', content: detail.content || '' };
        setChatByFriend(prev => ({ ...prev, [friendKey]: [...(prev[friendKey] || []), msg] }));
      } catch { void 0; }
    };
    window.addEventListener('app:chat-share-sent', onLocalShare as EventListener);
    return () => { window.removeEventListener('app:chat-share-sent', onLocalShare as EventListener); };
  }, []);

  const handleAcceptCollabInvite = async (inviteId: number) => {
    try {
      await playlistCollabInvitesApi.accept(inviteId);
      toast.success('Invite accepted');
      setExpandedInviteId(prev => (prev === inviteId ? null : prev));
      await loadCollabInvites();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Failed to accept');
    }
  };

  const handleRejectCollabInvite = async (inviteId: number) => {
    try {
      await playlistCollabInvitesApi.reject(inviteId);
      toast.success('Invite rejected');
      setExpandedInviteId(prev => (prev === inviteId ? null : prev));
      await loadCollabInvites();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Failed to reject');
    }
  };

/* messages moved to state */

  // Load chat history for selected friend
  useEffect(() => {
    (async () => {
      if (!meId || !selectedChat) return;
      try {
        const history = await chatApi.getHistory(meId, Number(selectedChat));
        const normalizedHistory = history.map((h) => ({
          ...h,
          contentPlain: h.contentPlain ?? (typeof h.content === "string" ? h.content : undefined),
        }));
        const mapped = normalizedHistory.map(h => parseIncomingContent(h, friends));
        setChatByFriend(prev => ({ ...prev, [selectedChat]: mapped }));
      } catch { void 0; }
    })();
  }, [meId, selectedChat]);

  

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !meId) return;
    const receiverId = Number(selectedChat);
    const messageContent = newMessage.trim();
    
    // Optimistic update - hiển thị message ngay
    const optimisticMsg: Message = { 
      id: `temp-${Date.now()}`, 
      sender: 'You', 
      content: messageContent, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      type: 'text' 
    };
    setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), optimisticMsg] }));
    setNewMessage('');
    
    try {
      const result = await sendMessage(meId, receiverId, messageContent);
      console.log('[Social] Message sent result:', result);
      
      // Replace optimistic message with real one if needed
      if (result && typeof result === "object" && "id" in result) {
        const normalizedResult = {
          ...result,
          contentPlain:
            result.contentPlain ?? (typeof result.content === "string" ? result.content : undefined),
        };
        const parsed = parseIncomingContent(normalizedResult as ChatMessageDTO, friends);
        setChatByFriend(prev => ({
          ...prev,
          [selectedChat]: prev[selectedChat]?.map(m => 
            m.id === optimisticMsg.id 
              ? { ...parsed, id: String(normalizedResult.id) }
              : m
          ) || []
        }));
      }
    } catch (e) {
      console.error('[Social] Failed to send message:', e);
      // Remove optimistic message on error
      setChatByFriend(prev => ({
        ...prev,
        [selectedChat]: prev[selectedChat]?.filter(m => m.id !== optimisticMsg.id) || []
      }));
      toast.error(e instanceof Error ? e.message : 'Failed to send message');
      setNewMessage(messageContent); // Restore message for retry
    }
  };

  const handleShareCurrentSong = async () => {
    if (!currentSong || !selectedChat || !meId) return;
    const receiverId = Number(selectedChat);
    const content = `SONG:${JSON.stringify({ id: currentSong.id, title: currentSong.title || '', artist: currentSong.artist || '' })}`;
    try {
      await sendMessage(meId, receiverId, content);
      // Optimistic update
      const msg: Message = { id: `${Date.now()}`, sender: 'You', content: 'Shared a song', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'song', songData: { id: currentSong.id, title: currentSong.title || '', artist: currentSong.artist || '' } };
      setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }));
    } catch (e) {
      toast.error('Failed to share song');
    }
  };

  const handleSharePlaylistLink = async () => {
    if (!selectedChat || !meId) return;
    try {
      const input = window.prompt('Enter playlist URL (or ID):');
      if (!input) return;
      const url = /^(http|https):/i.test(input) ? input : `${window.location.origin}/playlist/${String(input).trim()}`;
      const receiverId = Number(selectedChat);
      await sendMessage(meId, receiverId, `PLAYLIST_LINK:${url}`);
      // Optimistic update
      const msg: Message = { id: `${Date.now()}`, sender: 'You', content: url, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'text' };
      setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }));
    } catch { toast.error('Failed to share link'); }
  };

  // Removed: inline invite/share from composer — sharing is done from detail pages

  const messages = chatByFriend;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    try {
      const el = messagesEndRef?.current as HTMLDivElement | null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch { void 0; }
  }, [selectedChat, JSON.stringify(messages[selectedChat || ''] || [])]);

  // Firebase realtime chat d� handle messages, kh�ng c?n polling n?a

  // Poll friends list so new friendship reflects without manual reload
  // Chỉ update nếu friends list thực sự thay đổi (tránh trigger presence watch không cần thiết)
  useEffect(() => {
    if (!meId) return;
    let active = true;
    const tick = async () => {
      try {
        const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(meId);
        const mapped: Friend[] = apiFriends.map((f) => ({
          id: String(f.friendId || f.id),
          name: f.friendName || `User ${f.friendId}`,
          username: f.friendEmail ? `@${(f.friendEmail.split('@')[0] || '').toLowerCase()}` : `@user${f.friendId}`,
          avatar: f.friendAvatar || undefined,
          isOnline: false,
          streak: 0,
        }));
        if (!active) return;
        
        // Chỉ update nếu friends list thực sự thay đổi (so sánh IDs)
        setFriends(prev => {
          const prevIds = prev.map(f => f.id).sort().join(',');
          const newIds = mapped.map(f => f.id).sort().join(',');
          
          // Nếu IDs giống nhau, giữ lại isOnline từ prev (tránh reset presence)
          if (prevIds === newIds) {
            // Map lại để giữ isOnline từ prev
            const updated = mapped.map(newF => {
              const existing = prev.find(p => p.id === newF.id);
              return existing ? { ...newF, isOnline: existing.isOnline } : newF;
            });
            return updated;
          }
          
          // Nếu IDs khác nhau (thêm/bớt friends), update bình thường
          return mapped;
        });
      } catch { void 0; }
    };
    // Tăng interval lên 30 giây để giảm polling
    const iv = setInterval(tick, 30000);
    tick();
    return () => { active = false; clearInterval(iv); };
  }, [meId]);

  const handleCreateInviteLink = async () => {
    try {
      const me = localStorage.getItem('userId');
      if (!me) {
        toast.error('Please login to create invite link');
        navigate('/login');
        return;
      }
      const result = await inviteLinksApi.create(Number(me));
      if (result?.shareUrl) {
        setShareUrl(result.shareUrl);
        try { await navigator.clipboard.writeText(result.shareUrl); } catch { void 0; }
        toast.success('Invite link created and copied!', { description: result.shareUrl });
      } else {
        toast.success('Invite link created');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Failed to create invite link');
      console.error(e);
    }
  };

  const handleAcceptInviteFromQuery = async () => {
    if (!inviteCode) return;
    try {
      const prevCount = friends.length;
      const res = await inviteLinksApi.accept(inviteCode);
      // After accepting, try to refresh friends immediately
      if (meId) {
        try {
          const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(meId);
          const mapped: Friend[] = apiFriends.map((f) => ({
            id: String(f.friendId || f.id),
            name: f.friendName || `User ${f.friendId}`,
            username: f.friendEmail ? `@${(f.friendEmail.split('@')[0] || '').toLowerCase()}` : `@user${f.friendId}`,
            avatar: f.friendAvatar || undefined,
            isOnline: false,
            streak: 0,
          }));
          setFriends(mapped);
          if (mapped.length > 0) setSelectedChat((prev) => prev ?? mapped[0].id);
          const becameFriends = mapped.length > prevCount;
          const msg = typeof res === 'string' ? res : (res?.message || (becameFriends ? 'You are now friends!' : 'Request sent to inviter'));
          toast.success(msg);
        } catch {
          const msg = typeof res === 'string' ? res : (res?.message || 'Request sent to inviter');
          toast.success(msg);
        }
      } else {
        const msg = typeof res === 'string' ? res : (res?.message || 'Request sent to inviter');
        toast.success(msg);
      }
      navigate('/social');
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e || 'Failed to accept invite');
      if (/401|unauthorized/i.test(raw)) {
        toast.error('Please login to accept the invite');
        try {
          const ret = window.location.pathname + window.location.search;
          localStorage.setItem('pendingInviteUrl', ret);
          navigate(`/login?redirect=${encodeURIComponent(ret)}`);
        } catch { void 0; }
        return;
      }
      // Surface clearer messages for common domain errors
      if (/already\s*friend/i.test(raw)) {
        toast.error('Already friends');
      } else if (/already\s*sent|duplicate/i.test(raw)) {
        toast.error('Friend request already sent');
      } else if (/expired|invalid\s*invite/i.test(raw)) {
        toast.error('Invalid or expired invite link');
      } else {
        toast.error(raw);
      }
    }
  };

  const handleDeclineInviteFromQuery = () => {
    toast('Invite dismissed');
    navigate('/social');
  };

  const renderFriendsList = () => (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 backdrop-blur-sm ${selectedChat === friend.id
            ? "bg-purple-500/20 border border-purple-400/40 shadow-md shadow-purple-500/20"
            : "bg-purple-500/5 hover:bg-purple-500/15 border border-purple-300/10"
            }`}
          onClick={() => setSelectedChat(friend.id)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-purple-400/30 ring-offset-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-sm">
                  {friend.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {friend.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-purple-500/20" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate text-purple-50/90">{friend.name}</p>
                {friend.streak >= 7 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-500">{friend.streak}</span>
                  </div>
                )}
              </div>
              {friend.currentlyListening ? (
                <div className="flex items-center gap-1 text-xs text-purple-100/70">
                  <Headphones className="w-3 h-3" />
                  <span className="truncate">
                    {friend.currentlyListening.title} — {friend.currentlyListening.artist}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-purple-100/70">{friend.username}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const SharedContentWrapper = ({ isSentByMe, children }: { isSentByMe: boolean; children: ReactNode }) => (
    <div className={`flex items-start ${isSentByMe ? "justify-end text-right" : "justify-start text-left"}`}>
      <div className="space-y-3 max-w-[320px] sm:max-w-[360px]">{children}</div>
    </div>
  );

  const SharedPlaylistCard = ({
    playlist,
    _link,
    isSentByMe,
    loading,
  }: {
    playlist: SharedPlaylistMessageData | null;
    _link?: string;
    isSentByMe: boolean;
    loading: boolean;
  }) => {
    if (!playlist) return null;

    const totalItems = playlist.totalSongs ?? playlist.songLimit ?? 0;
    const visibilityLabel = playlist.visibility ? playlist.visibility.toString().replace(/_/g, " ") : "Spotify";
    const primaryCover = playlist.coverUrl || undefined;

    const go = () => { if (_link) navigate(_link); };
    return (
      <SharedContentWrapper isSentByMe={isSentByMe}>
        <div className="space-y-2">
          <div className="overflow-hidden rounded-3xl border border-white/10 shadow-lg shadow-black/40 cursor-pointer" onClick={go} role="button" aria-label={playlist.name || 'Open playlist'}>
            <div className="relative aspect-[4/5] w-full">
              {primaryCover ? (
                <img src={primaryCover} alt={playlist.name || "Playlist cover"} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-fuchsia-700 to-indigo-800 flex items-center justify-center">
                  <Music className="w-10 h-10 text-white/40" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 text-left text-white space-y-1">
                <div className="text-[11px] uppercase tracking-[0.35em] text-white/70">Playlist</div>
                <p className="text-base font-semibold truncate">{loading ? "Loading…" : playlist.name || "Shared playlist"}</p>
                <p className="text-xs text-white/70 truncate">
                  {playlist.ownerName || visibilityLabel}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-muted/20 border border-border/20 px-3 py-2 text-left">
            <p className="text-sm font-semibold text-foreground">{playlist.name || "Playlist"}</p>
            <p className="text-[11px] text-muted-foreground">
              {playlist.ownerName || visibilityLabel}
              {totalItems > 0 ? ` · ${totalItems} ${totalItems === 1 ? "item" : "items"}` : ""}
            </p>
          </div>
        </div>
      </SharedContentWrapper>
    );
  };
  const SharedAlbumCard = ({
    album,
    _link,
    isSentByMe,
  }: {
    album: SharedAlbumMessageData | null;
    _link?: string;
    isSentByMe: boolean;
  }) => {
    if (!album) return null;
    const artistDisplay = album.artistName ? album.artistName : DEFAULT_ARTIST_NAME;
    const releaseDisplay = album.releaseYear ?? album.releaseDateLabel ?? null;

    const go = () => { if (_link) navigate(_link); };
    return (
      <SharedContentWrapper isSentByMe={isSentByMe}>
        <div className="space-y-2">
          <div className="overflow-hidden rounded-3xl border border-white/10 shadow-lg shadow-black/40 cursor-pointer" onClick={go} role="button" aria-label={album.name || 'Open album'}>
            <div className="relative aspect-[4/5] w-full">
              {album.coverUrl ? (
                <img src={album.coverUrl} alt={album.name || "Album cover"} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-fuchsia-700 to-indigo-800 flex items-center justify-center">
                  <Music className="w-10 h-10 text-white/40" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 text-left text-white space-y-1">
                <div className="text-[11px] uppercase tracking-[0.35em] text-white/70">Album</div>
                <p className="text-base font-semibold truncate">{album.name || "Shared album"}</p>
                <p className="text-xs text-white/70 truncate">
                  {artistDisplay}
                  {releaseDisplay ? ` · ${releaseDisplay}` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-muted/20 border border-border/20 px-3 py-2 text-left">
            <p className="text-sm font-semibold text-foreground">{album.name || "Shared album"}</p>
            <p className="text-[11px] text-muted-foreground">
              {artistDisplay}
              {releaseDisplay ? ` · ${releaseDisplay}` : ""}
            </p>
          </div>
        </div>
      </SharedContentWrapper>
    );
  };
  const SharedSongCard = ({
    song,
    onPlay,
    _link,
    isSentByMe,
  }: {
    song: SharedSongMessageData | null;
    onPlay: () => void | Promise<void>;
    _link?: string;
    isSentByMe: boolean;
  }) => {
    if (!song) return null;

    return (
      <SharedContentWrapper isSentByMe={isSentByMe}>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f172a]/95 via-[#101b2c]/95 to-[#020617]/95 shadow-xl shadow-black/40">
          <div className="flex items-center gap-4 p-4">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center ring-1 ring-white/10">
              {song.coverUrl ? (
                <img src={song.coverUrl} alt={song.name || "Song cover"} className="h-full w-full object-cover" />
              ) : (
                <Music className="w-6 h-6 text-white/50" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Song</p>
              <p className="text-sm font-semibold text-white truncate">{song.name || "Shared song"}</p>
              <p className="text-xs text-white/70 truncate">
                {song.artists.length ? song.artists.join(", ") : DEFAULT_ARTIST_NAME}
              </p>
              {song.durationLabel && (
                <p className="text-[11px] text-white/60">{song.durationLabel}</p>
              )}
            </div>
            <Button
              size="sm"
              className="rounded-full bg-emerald-500/90 hover:bg-emerald-400/90 text-black font-semibold h-8 px-5"
              onClick={onPlay}
              aria-label="Play song"
            >
              Play
            </Button>
          </div>
        </div>
      </SharedContentWrapper>
    );
  };
  const CollabPlaylistPreview = ({ playlist }: { playlist?: CollabInviteDTO["playlist"] }) => {
    if (!playlist) {
      return <p className="text-sm text-muted-foreground">Playlist details unavailable.</p>;
    }
    const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
    const totalSongs = songs.length;

    return (
      <div className="rounded-2xl border border-border/20 bg-background/70 p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-24 w-24 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {playlist.coverUrl ? (
              <img src={playlist.coverUrl} alt={playlist.name || "Playlist cover"} className="h-full w-full object-cover" />
            ) : (
              <Music className="w-10 h-10 text-muted-foreground/70" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-lg font-semibold truncate">{playlist.name || "Playlist"}</h3>
            {playlist.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{playlist.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Visibility: {playlist.visibility || "Unknown"}</span>
              <span>{totalSongs} {totalSongs === 1 ? "song" : "songs"}</span>
              {playlist.songLimit != null && (
                <span>Limit {playlist.songLimit}</span>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Songs ({totalSongs})</p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {songs.length ? (
              songs.map((song, idx) => {
                const artists = extractArtistNames(song?.artists);
                const durationLabel = formatDurationLabel(song?.duration);
                return (
                  <div
                    key={song?.id ?? idx}
                    className="flex items-center gap-3 rounded-lg border border-border/10 bg-muted/15 p-3"
                  >
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      {song?.urlImageAlbum ? (
                        <img src={song.urlImageAlbum} alt={song?.name || `Track ${idx + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-muted-foreground/70" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song?.name || `Track ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {artists.length ? artists.join(", ") : DEFAULT_ARTIST_NAME}
                      </p>
                    </div>
                    {durationLabel && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{durationLabel}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No songs in this playlist yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CollabInviteCard = ({
    invite,
    expanded,
    onToggle,
    onAccept,
    onReject,
  }: {
    invite: CollabInviteDTO;
    expanded: boolean;
    onToggle: (id: number) => void;
    onAccept: (id: number) => void;
    onReject: (id: number) => void;
  }) => {
    const playlistName = invite.playlist?.name || invite.playlistName || `Playlist #${invite.playlistId}`;
    return (
      <div className="rounded-2xl border border-border/20 bg-muted/10 p-4 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              {invite.playlist?.coverUrl ? (
                <img src={invite.playlist.coverUrl} alt={playlistName || "Playlist cover"} className="h-full w-full object-cover" />
              ) : (
                <Music className="w-6 h-6 text-muted-foreground/70" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm sm:text-base">{playlistName}</h4>
              <p className="text-xs text-muted-foreground">
                {invite.senderName ? `${invite.senderName} invited you to collaborate` : "Collaboration invite"}
              </p>
              <p className="text-xs text-muted-foreground">Role: {invite.role || "EDITOR"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onToggle(invite.id)}>
              {expanded ? "Hide preview" : "View playlist"}
            </Button>
            <Button size="sm" variant="hero" onClick={() => onAccept(invite.id)}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(invite.id)}>
              Reject
            </Button>
          </div>
        </div>
        {expanded && <CollabPlaylistPreview playlist={invite.playlist} />}
      </div>
    );
  };

  const renderMessages = () => {
    const currentMessages = selectedChat ? messages[selectedChat] || [] : [];

    return (
      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide scroll-smooth">
        {currentMessages.map((message) => (
          <MessageCard key={message.id} message={message} playSong={playSong} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  const MessageCard = ({ message, playSong }: { message: Message; playSong: (song: Song) => void }) => {
    const [playlistInfo, setPlaylistInfo] = useState<PlaylistDTO | null>(null);
    const [albumInfo, setAlbumInfo] = useState<{ id: number; name: string; coverUrl?: string | null; artist?: unknown; releaseYear?: number; songs?: unknown[] } | null>(null);
    const [loadingPlaylist, setLoadingPlaylist] = useState(false);
    const [loadingAlbum, setLoadingAlbum] = useState(false);
    const isSentByMe = message.sender === "You";

    useEffect(() => {
      if (message.type !== "playlist") return;
      if (message.sharedPlaylist) return;
      const playlistId = message.playlistData?.id;
      if (!playlistId || playlistInfo) return;
      setLoadingPlaylist(true);
      playlistsApi
        .getById(playlistId)
        .then((data) => setPlaylistInfo(data))
        .catch(() => void 0)
        .finally(() => setLoadingPlaylist(false));
    }, [message.type, message.sharedPlaylist, message.playlistData?.id, playlistInfo]);

    useEffect(() => {
      if (message.type !== "album") return;
      if (message.sharedAlbum) return;
      const albumId = message.albumData?.id;
      if (!albumId || albumInfo) return;
      setLoadingAlbum(true);
      albumsApi
        .getById(albumId)
        .then((data) => setAlbumInfo(data))
        .catch(() => void 0)
        .finally(() => setLoadingAlbum(false));
    }, [message.type, message.sharedAlbum, message.albumData?.id, albumInfo]);

    const playlistPreview = useMemo<SharedPlaylistMessageData | null>(() => {
      if (message.sharedPlaylist) {
        return {
          ...message.sharedPlaylist,
          songs: Array.isArray(message.sharedPlaylist.songs)
            ? message.sharedPlaylist.songs
            : [],
        };
      }
      if (playlistInfo) {
        const songs = Array.isArray(playlistInfo.songs)
          ? playlistInfo.songs.map((song: any) => ({
              id: song?.id ?? song?.songId,
              name: song?.name || song?.title || "",
              artists: extractArtistNames(song?.artists ?? song?.artistNames),
              coverUrl: song?.urlImageAlbum ?? song?.coverUrl ?? song?.cover ?? playlistInfo.coverUrl ?? undefined,
              durationLabel: formatDurationLabel(song?.duration ?? song?.length ?? song?.durationMs),
            }))
          : [];
        return {
          id: playlistInfo.id,
          name: playlistInfo.name,
          description: playlistInfo.description ?? null,
          coverUrl: playlistInfo.coverUrl ?? null,
          visibility: playlistInfo.visibility ?? null,
          songLimit: playlistInfo.songLimit ?? null,
          songs,
          ownerName: playlistInfo.owner?.name ?? null,
          totalSongs: Array.isArray(playlistInfo.songs)
            ? playlistInfo.songs.length
            : Array.isArray(playlistInfo.songIds)
            ? playlistInfo.songIds.length
            : null,
        };
      }
      if (message.playlistData) {
        return {
          id: message.playlistData.id,
          name: message.playlistData.name,
          description: null,
          coverUrl: message.playlistData.coverUrl ?? null,
          visibility: null,
          songLimit: null,
          songs: [],
          ownerName: message.playlistData.owner ?? null,
          totalSongs: message.playlistData.songCount ?? null,
        };
      }
      return null;
    }, [message.sharedPlaylist, playlistInfo, message.playlistData]);

    const albumPreview = useMemo<SharedAlbumMessageData | null>(() => {
      if (message.sharedAlbum) {
        return message.sharedAlbum;
      }
      if (albumInfo) {
        return {
          id: albumInfo.id,
          name: albumInfo.name,
          coverUrl: albumInfo.coverUrl ?? null,
          artistName: normalizeArtistName((albumInfo as { artist?: unknown }).artist),
          releaseYear: albumInfo.releaseYear ?? null,
          releaseDateLabel: null,
        };
      }
      if (message.albumData) {
        return {
          id: message.albumData.id,
          name: message.albumData.name,
          coverUrl: message.albumData.coverUrl ?? null,
          artistName: message.albumData.artist ?? null,
          releaseYear: message.albumData.releaseYear ?? null,
          releaseDateLabel: null,
        };
      }
      return null;
    }, [message.sharedAlbum, albumInfo, message.albumData]);

    const songPreview = useMemo<SharedSongMessageData | null>(() => {
      if (message.sharedSong) {
        return {
          ...message.sharedSong,
          artists: Array.isArray(message.sharedSong.artists)
            ? message.sharedSong.artists
            : [],
        };
      }
      if (message.songData) {
        const rawId = message.songData.id;
        const numericId = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : undefined;
        const parsedId = typeof numericId === "number" && Number.isFinite(numericId) ? numericId : undefined;
        return {
          id: parsedId,
          name: message.songData.title,
          artists: message.songData.artist ? [message.songData.artist] : [],
          coverUrl: undefined,
          audioUrl: undefined,
          durationLabel: null,
        };
      }
      return null;
    }, [message.sharedSong, message.songData]);

    const linkFromContent = useMemo(() => {
      const raw = String(message.content || "").trim();
      return /^https?:\/\//i.test(raw) ? raw : undefined;
    }, [message.content]);

    const playlistLink = useMemo(() => {
      if (linkFromContent) return linkFromContent;
      const id =
        message.sharedPlaylist?.id ??
        playlistPreview?.id ??
        message.playlistData?.id;
      return typeof id === "number" && Number.isFinite(id) ? `/playlist/${id}` : undefined;
    }, [linkFromContent, message.sharedPlaylist?.id, playlistPreview?.id, message.playlistData?.id]);

    const albumLink = useMemo(() => {
      if (linkFromContent) return linkFromContent;
      const id =
        message.sharedAlbum?.id ?? albumPreview?.id ?? message.albumData?.id;
      return typeof id === "number" && Number.isFinite(id) ? `/album/${id}` : undefined;
    }, [linkFromContent, message.sharedAlbum?.id, albumPreview?.id, message.albumData?.id]);

    const songLink = useMemo(() => {
      if (linkFromContent) return linkFromContent;
      const rawId =
        message.sharedSong?.id ??
        songPreview?.id ??
        (typeof message.songData?.id === "number"
          ? message.songData.id
          : typeof message.songData?.id === "string"
          ? Number(message.songData.id)
          : undefined);
      return typeof rawId === "number" && Number.isFinite(rawId) ? `/song/${rawId}` : undefined;
    }, [linkFromContent, message.sharedSong?.id, songPreview?.id, message.songData?.id]);

    const handlePlaySong = async () => {
      if (!songPreview) return;
      try {
        if (songPreview.audioUrl) {
          const playable: Song = {
            id: String(songPreview.id ?? songPreview.name ?? Date.now()),
            title: songPreview.name || "Shared song",
            artist: songPreview.artists.join(", ") || DEFAULT_ARTIST_NAME,
            album: "",
            duration: 0,
            cover: songPreview.coverUrl ?? "",
            audioUrl: songPreview.audioUrl,
          };
          playSong(playable);
          return;
        }
        const songId =
          songPreview.id ??
          (typeof message.songData?.id === "number"
            ? message.songData.id
            : typeof message.songData?.id === "string"
            ? Number(message.songData.id)
            : undefined);
        if (!songId) {
          toast.error("Song not playable");
          return;
        }
        const detail = await songsApi.getById(String(songId));
        if (!detail || !detail.audioUrl) {
          toast.error("Song not playable");
          return;
        }
        const playable: Song = {
          id: String(detail.id),
          title: detail.title || detail.name,
          artist:
            (Array.isArray(detail.artistNames) && detail.artistNames.length
              ? detail.artistNames.join(", ")
              : Array.isArray(detail.artists) && detail.artists[0]?.name) ||
            songPreview.artists.join(", ") ||
            DEFAULT_ARTIST_NAME,
          album:
            typeof detail.album === "string"
              ? detail.album
              : detail.album?.name || "",
          duration: typeof detail.duration === "number" ? detail.duration : 0,
          cover: detail.cover || songPreview.coverUrl || "",
          audioUrl: detail.audioUrl || "",
        };
        playSong(playable);
      } catch {
        toast.error("Failed to play song");
      }
    };

    const contentNode: ReactNode = (() => {
      if (message.type === "song" && songPreview) {
        return (
          <SharedSongCard
            song={songPreview}
            onPlay={handlePlaySong}
            _link={songLink}
            isSentByMe={isSentByMe}
          />
        );
      }
      if (message.type === "playlist" && (playlistPreview || loadingPlaylist)) {
        return (
          <SharedPlaylistCard
            playlist={playlistPreview}
            _link={playlistLink}
            isSentByMe={isSentByMe}
            loading={loadingPlaylist}
          />
        );
      }
      if (message.type === "album" && (albumPreview || loadingAlbum)) {
        return (
          <SharedAlbumCard
            album={albumPreview}
            _link={albumLink}
            isSentByMe={isSentByMe}
          />
        );
      }

      return (
        <div
          className={`px-4 py-2 rounded-lg ${
            isSentByMe ? "bg-primary text-primary-foreground" : "bg-muted/20"
          }`}
        >
          {(() => {
            const txt = String(message.content || "");
            const isUrl = /^https?:\/\//i.test(txt);
            return isUrl ? (
              <a href={txt} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                {txt}
              </a>
            ) : (
              <p className="text-sm break-words whitespace-pre-wrap">{txt}</p>
            );
          })()}
        </div>
      );
    })();

    if (!contentNode) return null;

    return (
      <div className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}>
        <div className="max-w-xs lg:max-w-md space-y-1">
          {contentNode}
          <p
            className={`text-xs text-muted-foreground/80 ${
              isSentByMe ? "text-right" : ""
            }`}
          >
            {message.timestamp}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8 pb-28">
        <div className="max-w-6xl mx-auto">
          {/* Header removed to keep chat frame stable */}

          {inviteCode && (
            <div className="mb-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Friend Invite</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-2">
                  <p className="text-sm text-muted-foreground flex-1">You received a friend invite. Accept to send a request to the inviter.</p>
                  <div className="flex gap-2">
                    <Button variant="hero" onClick={handleAcceptInviteFromQuery}>Accept</Button>
                    <Button variant="outline" onClick={handleDeclineInviteFromQuery}>Decline</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users className="w-4 h-4" />
                Friends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <div className="grid lg:grid-cols-3 gap-6 min-h-[420px] max-h-[calc(100vh-220px)] overflow-hidden">
                {/* Friends List */}
                <Card className="lg:col-span-1 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10 backdrop-blur-xl backdrop-saturate-150 border-purple-300/20 shadow-[0_8px_30px_rgba(88,28,135,0.25)]">
                  <CardHeader className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 backdrop-blur-sm border-b border-purple-300/20">
                    <CardTitle className="flex items-center gap-2 text-purple-50/90">
                      <MessageCircle className="w-5 h-5" />
                      Messages
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-200/70" />
                      <Input
                        placeholder="Search conversations..."
                        className="pl-10 bg-purple-500/10 border-purple-300/30 text-purple-50 placeholder:text-purple-200/50 focus:border-purple-400/50 focus:ring-purple-400/20 backdrop-blur-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto bg-gradient-to-b from-purple-500/5 to-transparent">
                    {loadingFriends ? (
                      <p className="text-sm text-purple-100/70">Loading friends...</p>
                    ) : friends.length === 0 ? (
                      <p className="text-sm text-purple-100/70">{meId ? 'No friends yet.' : 'Login to see your friends.'}</p>
                    ) : (
                      renderFriendsList()
                    )}
                  </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="lg:col-span-2 flex flex-col relative overflow-hidden rounded-[28px] bg-white/5 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 shadow-[0_30px_60px_-15px_rgba(91,33,182,0.45)] min-h-[520px] lg:h-[calc(100vh-220px)] lg:max-h-[calc(100vh-220px)]">
                  {selectedChat ? (
                    <>
                      <CardHeader className="border-b border-purple-300/20 bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 ring-2 ring-purple-400/30 ring-offset-0">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white">
                              {friends.find(f => f.id === selectedChat)?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg text-purple-50/90">
                              {friends.find(f => f.id === selectedChat)?.name}
                            </CardTitle>
                            <p className="text-sm text-purple-100/70">
                              {friends.find(f => f.id === selectedChat)?.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 min-h-0 p-4 overflow-y-auto scrollbar-custom scroll-smooth bg-gradient-to-b from-white/10 via-white/5 to-transparent">
                        {renderMessages()}
                      </CardContent>

                      <div className="p-4 border-t border-white/10 bg-gradient-to-t from-white/10 via-white/5 to-transparent backdrop-blur-xl sticky bottom-0 left-0 right-0 z-10">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => { setNewMessage(e.target.value); }}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-purple-500/10 border-purple-300/30 text-purple-50 placeholder:text-purple-200/50 focus:border-purple-400/50 focus:ring-purple-400/20 backdrop-blur-sm"
                          />
                          <Button 
                            variant="hero" 
                            size="icon" 
                            onClick={handleSendMessage}
                            className="bg-gradient-to-br from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/30"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          {currentSong && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="ml-2 border-purple-300/30 text-purple-100 hover:bg-purple-400/10 hover:border-purple-300/40 bg-purple-500/5 backdrop-blur-sm"
                              onClick={handleShareCurrentSong}
                            >
                              <Music className="w-4 h-4 mr-2" /> Share current song
                            </Button>
                          )}
                          {/* Sharing links/invites from detail pages; no extra composer buttons */}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-purple-500/5 to-transparent">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 text-purple-300/50 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2 text-purple-50/90">Select a conversation</h3>
                        <p className="text-purple-100/70">Choose a friend to start messaging</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="friends">
              {/* Pending Collaboration Invites */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Collaboration Invites
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loadingCollabInvites ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : collabInvites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending collaboration invites</p>
                    ) : (
                      collabInvites.map((inv: CollabInviteDTO) => (
                        <CollabInviteCard
                          key={inv.id}
                          invite={inv}
                          expanded={expandedInviteId === inv.id}
                          onToggle={(id) => setExpandedInviteId(prev => (prev === id ? null : id))}
                          onAccept={handleAcceptCollabInvite}
                          onReject={handleRejectCollabInvite}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
              {/* My Profile */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      My Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-lg">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-primary text-white text-lg">
                          {(() => {
                            const name = profileName && profileName.trim().length > 0 ? profileName : (profileEmail.split('@')[0] || 'U');
                            const parts = name.trim().split(' ').filter(Boolean);
                            const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : name[0];
                            return (initials || 'U').toUpperCase();
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{profileName || (profileEmail ? profileEmail.split('@')[0] : 'Your Username')}</h3>
                        <p className="text-muted-foreground">
                          @{profileEmail ? profileEmail.split('@')[0] : (profileName ? profileName.toLowerCase().replace(/\s+/g, '') : 'yourusername')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{friends.length} friends</Badge>
                          <Badge variant="outline">Premium</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button variant="hero" size="sm" className="mb-2" onClick={handleCreateInviteLink}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Profile
                        </Button>
                        <p className="text-xs text-muted-foreground break-all">
                          {shareUrl
                            ? (
                              <a href={shareUrl} target="_blank" rel="noreferrer" className="underline">
                                {shareUrl}
                              </a>
                            ) : (
                              <>
                                Share: Click "Share Profile" to generate an invite link
                              </>
                            )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              

              {/* Friends List */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {friend.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{friend.name}</h3>
                          <p className="text-sm text-muted-foreground">{friend.username}</p>
                        </div>
                        {friend.streak >= 7 && (
                          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-500">{friend.streak}</span>
                          </div>
                        )}
                      </div>

                      {friend.currentlyListening && (
                        <div className="bg-muted/10 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Headphones className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">Currently listening</span>
                          </div>
                          <p className="text-sm font-medium">{friend.currentlyListening.title}</p>
                          <p className="text-xs text-muted-foreground">{friend.currentlyListening.artist}</p>
                        </div>
                      )}

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedChat(friend.id)}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              const me = localStorage.getItem('userId') || sessionStorage.getItem('userId');
                              if (!me) throw new Error('Missing user id');
                              const ok = window.confirm(`Unfriend ${friend.name}?`);
                              if (!ok) return;
                              await friendsApi.remove(Number(me), Number(friend.id));
                              await loadFriends();
                              if (selectedChat === friend.id) setSelectedChat(null);
                              toast.success('Unfriended');
                            } catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e); toast.error(msg || 'Failed to unfriend'); }
                          }}>
                            Unfriend
                          </Button>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Social;


function parseIncomingContent(m: ChatMessageDTO, friends: Friend[]): Message {
  let type: "text" | "song" | "playlist" | "album" = "text";
  let songData: { id?: string | number; title: string; artist: string } | undefined = undefined;
  let playlistData: { id: number; name: string; coverUrl?: string | null; songCount?: number; owner?: string } | undefined = undefined;
  let albumData: { id: number; name: string; coverUrl?: string | null; artist?: string; releaseYear?: number } | undefined = undefined;
  let sharedPlaylist: SharedPlaylistMessageData | undefined;
  let sharedAlbum: SharedAlbumMessageData | undefined;
  let sharedSong: SharedSongMessageData | undefined;
  const rawContent = m.contentPlain ?? m.content ?? "";
  let content = typeof rawContent === "string" ? rawContent : "";

  const sharedTypeRaw = m.sharedContentType ?? undefined;
  const sharedContent: SharedContentDTO | undefined = m.sharedContent ?? undefined;
  const normalizedSharedType = (() => {
    if (typeof sharedTypeRaw === "string" && sharedTypeRaw.length > 0) {
      return sharedTypeRaw.toUpperCase() as SharedContentType | "PLAYLIST" | "ALBUM" | "SONG";
    }
    const raw = (sharedContent as { type?: string | null })?.type ?? (sharedContent as { contentType?: string | null })?.contentType ?? null;
    if (typeof raw === "string" && raw.length) {
      return raw.toUpperCase() as SharedContentType | "PLAYLIST" | "ALBUM" | "SONG";
    }
    if (sharedContent && typeof sharedContent === "object") {
      if ((sharedContent as { playlist?: unknown }).playlist) return "PLAYLIST";
      if ((sharedContent as { album?: unknown }).album) return "ALBUM";
      if ((sharedContent as { song?: unknown }).song) return "SONG";
    }
    return undefined;
  })();

  if (normalizedSharedType === "PLAYLIST") {
    type = "playlist";
    const playlistDto: SharedPlaylistDTO | null = sharedContent?.playlist ?? null;
    sharedPlaylist = playlistDto
      ? {
          id: playlistDto.id ?? sharedContent?.id ?? undefined,
          name: playlistDto.name ?? sharedContent?.title ?? undefined,
          description: playlistDto.description ?? sharedContent?.description ?? null,
          coverUrl: playlistDto.coverUrl ?? sharedContent?.coverUrl ?? null,
          visibility: playlistDto.visibility ?? null,
          songLimit: playlistDto.songLimit ?? null,
          songs: Array.isArray(playlistDto.songs)
            ? playlistDto.songs.map((song) => ({
                id: song?.id,
                name: song?.name ?? "",
                artists: extractArtistNames(song?.artists),
                coverUrl: song?.urlImageAlbum ?? song?.coverUrl ?? sharedContent?.coverUrl ?? null,
                durationLabel: formatDurationLabel(song?.duration),
              }))
            : [],
          ownerName: undefined,
          totalSongs: Array.isArray(playlistDto.songs) ? playlistDto.songs.length : null,
        }
      : {
          id: sharedContent?.id ?? undefined,
          name: sharedContent?.title ?? undefined,
          description: sharedContent?.description ?? null,
          coverUrl: sharedContent?.coverUrl ?? null,
          visibility: null,
          songLimit: null,
          songs: [],
          ownerName: undefined,
          totalSongs: null,
        };

    const playlistIdValue = sharedPlaylist?.id;
    const playlistId =
      typeof playlistIdValue === "number" && Number.isFinite(playlistIdValue)
        ? playlistIdValue
        : undefined;
    if (playlistId != null) {
      playlistData = {
        id: playlistId,
        name: sharedPlaylist?.name || "Shared playlist",
        coverUrl: sharedPlaylist?.coverUrl ?? null,
        songCount: sharedPlaylist?.totalSongs ?? undefined,
      };
    }
  } else if (normalizedSharedType === "ALBUM") {
    type = "album";
    const albumDto: SharedAlbumDTO | null = sharedContent?.album ?? null;
    const releaseYear = (() => {
      if (albumDto?.releaseDate) {
        const year = new Date(albumDto.releaseDate).getFullYear();
        return Number.isFinite(year) ? year : undefined;
      }
      return undefined;
    })();
    sharedAlbum = {
      id: albumDto?.id ?? sharedContent?.id ?? undefined,
      name: albumDto?.name ?? sharedContent?.title ?? undefined,
      coverUrl: albumDto?.coverUrl ?? sharedContent?.coverUrl ?? null,
      artistName: albumDto?.artist?.name ?? null,
      releaseYear: releaseYear ?? undefined,
      releaseDateLabel: albumDto?.releaseDate ?? null,
    };
    const albumIdValue = sharedAlbum?.id;
    const albumId =
      typeof albumIdValue === "number" && Number.isFinite(albumIdValue)
        ? albumIdValue
        : undefined;
    if (albumId != null) {
      albumData = {
        id: albumId,
        name: sharedAlbum?.name || "Shared album",
        coverUrl: sharedAlbum?.coverUrl ?? null,
        artist: sharedAlbum?.artistName ?? undefined,
        releaseYear: sharedAlbum?.releaseYear ?? undefined,
      };
    }
  } else if (normalizedSharedType === "SONG") {
    type = "song";
    const songDto: SharedSongDTO | null = sharedContent?.song ?? null;
    const artists = extractArtistNames(songDto?.artists);
    sharedSong = {
      id: songDto?.id ?? sharedContent?.id ?? undefined,
      name: songDto?.name ?? songDto?.title ?? sharedContent?.title ?? undefined,
      artists,
      coverUrl: songDto?.urlImageAlbum ?? songDto?.coverUrl ?? sharedContent?.coverUrl ?? null,
      audioUrl: songDto?.audioUrl ?? null,
      durationLabel: formatDurationLabel(songDto?.duration),
    };
    const songIdValue = sharedSong?.id;
    const songId =
      typeof songIdValue === "number" && Number.isFinite(songIdValue)
        ? songIdValue
        : undefined;
    if (songId != null) {
      songData = {
        id: songId,
        title: sharedSong?.name || "Shared song",
        artist: artists.join(", ") || DEFAULT_ARTIST_NAME,
      };
    }
  }

  if (normalizedSharedType == null) {
    if (content.startsWith("SONG:")) {
      type = "song";
      try {
        const data = JSON.parse(content.slice(5));
        songData = { id: data.id, title: data.title, artist: data.artist };
      } catch {
        void 0;
      }
    } else if (content.startsWith("PLAYLIST_LINK:")) {
      type = "playlist";
      const url = content.slice(14);
      const playlistIdMatch = url.match(/\/playlist\/(\d+)/);
      if (playlistIdMatch) {
        const playlistId = Number(playlistIdMatch[1]);
        playlistData = { id: playlistId, name: "Loading...", coverUrl: null };
      }
      content = url;
    } else if (content.startsWith("ALBUM_LINK:")) {
      type = "album";
      const url = content.slice(11);
      const albumIdMatch = url.match(/\/album\/(\d+)/);
      if (albumIdMatch) {
        const albumId = Number(albumIdMatch[1]);
        albumData = { id: albumId, name: "Loading...", coverUrl: null };
      }
      content = url;
    } else if (content.startsWith("SONG_LINK:")) {
      content = content.slice(10);
    } else if (content.startsWith("COLLAB_INVITE:")) {
      try {
        const data = JSON.parse(content.slice(14));
        content = `Collab invite for playlist #${data.playlistId} (role: ${data.role})`;
      } catch {
        void 0;
      }
    }
  }

  if (!songData && sharedSong) {
    songData = {
      id: sharedSong.id,
      title: sharedSong.name || "Shared song",
      artist: sharedSong.artists.join(", ") || DEFAULT_ARTIST_NAME,
    };
  }
  if (!playlistData && sharedPlaylist && typeof sharedPlaylist.id === "number") {
    playlistData = {
      id: sharedPlaylist.id,
      name: sharedPlaylist.name || "Shared playlist",
      coverUrl: sharedPlaylist.coverUrl ?? null,
      songCount: sharedPlaylist.totalSongs ?? undefined,
      owner: sharedPlaylist.ownerName ?? undefined,
    };
  }
  if (!albumData && sharedAlbum && typeof sharedAlbum.id === "number") {
    albumData = {
      id: sharedAlbum.id,
      name: sharedAlbum.name || "Shared album",
      coverUrl: sharedAlbum.coverUrl ?? null,
      artist: sharedAlbum.artistName ?? undefined,
      releaseYear: sharedAlbum.releaseYear ?? undefined,
    };
  }

  const sender = ((): string => {
    try {
      const me = typeof window !== "undefined" ? Number(localStorage.getItem("userId")) : NaN;
      if (Number.isFinite(me) && m.senderId === me) return "You";
    } catch {
      void 0;
    }
    const f = friends?.find((x) => Number(x.id) === m.senderId);
    return f?.name || `User ${m.senderId}`;
  })();
  const timestamp = new Date(m.sentAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return {
    id: String(m.id),
    sender,
    content,
    timestamp,
    type,
    songData,
    playlistData,
    albumData,
    sharedContentType: (normalizedSharedType as SharedContentType | undefined),
    sharedPlaylist,
    sharedAlbum,
    sharedSong,
  };
}
