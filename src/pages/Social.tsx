import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { friendsApi } from "@/services/api/friendsApi";
import { authApi } from "@/services/api/authApi";
import { API_BASE_URL } from "@/services/api/config";
import { premiumSubscriptionApi, type PremiumSubscriptionDTO } from "@/services/api/premiumSubscriptionApi";

import { playlistCollabInvitesApi, playlistsApi, playlistCollaboratorsApi } from "@/services/api/playlistApi";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

import { chatApi, ChatMessageDTO, playlistChatApi } from "@/services/api/chatApi";
import { useMusic } from "@/contexts/MusicContext";
import type { Song } from "@/contexts/MusicContext";
import { watchChatMessages, watchChatMessagesForRoom, type FirebaseMessage, watchTyping, watchReactions, watchMessageIndex, getChatRoomKey, watchAllRoomUnreadCounts } from "@/services/firebase/chat";

import { NotificationDTO as FBNotificationDTO, watchNotifications } from "@/services/firebase/notifications";
import {

  MessageCircle,

  Users,

} from "lucide-react";

import type { CollabInviteDTO, Message, Friend, ApiFriendDTO, ApiPendingDTO, MessageReactionSummary } from "@/types/social";
import type { PlaylistLibraryItemDTO } from "@/services/api/playlistApi";
import { parseIncomingContent, DEFAULT_ARTIST_NAME, decodeUnicodeEscapes } from "@/utils/socialUtils";
import { emitChatBubble } from "@/utils/chatBubbleBus";
import { emitChatTabOpened } from "@/utils/chatEvents";
import { ChatArea } from "@/components/social/ChatArea";
import { FriendsPanel } from "@/components/social/FriendsPanel";
import { FriendRequestsList } from "@/components/social/FriendRequestsList";
import { PublicProfileCard } from "@/components/social/PublicProfileCard";
import { SocialInlineCard } from "@/components/social/SocialInlineCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { STREAK_STORAGE_EVENT, StreakStorageEventDetail } from "@/constants/streak";
import { chatStreakApi } from "@/services/api/chatStreakApi";
import { mapDtoToStreakState } from "@/hooks/useStreakManager";
import { clearStreakCache } from "@/utils/streakCache";
import { PlaylistChatWindow } from "@/components/playlist/PlaylistChatWindow";


// Realtime notification DTO from /user/queue/notifications

const envVars = ((import.meta as unknown) as { env?: Record<string, string | undefined> }).env || {};

type SocialTab = "chat" | "friends";

const normalizeSocialTab = (value?: string | null): SocialTab =>
  (value || "").toLowerCase() === "friends" ? "friends" : "chat";

const coerceToNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

// Type for window extension to track pending chat refreshes
declare global {
  interface Window {
    __chatRefreshPending?: Record<string, boolean>;
  }
}

const resolveSongNumericId = (song: Song | null | undefined): number | null => {
  if (!song) return null;
  const candidates: unknown[] = [
    song.id,
    (song as { songId?: unknown }).songId,
    (song as { SongId?: unknown }).SongId,
    (song as { song?: { id?: unknown } }).song?.id,
  ];
  for (const candidate of candidates) {
    const parsed = coerceToNumber(candidate);
    if (parsed != null) {
      return parsed;
    }
  }
  return null;
};

const resolveSongTitle = (song: Song | null | undefined): string => {
  if (!song) return "";
  const candidates = [
    song.songName,
    (song as { name?: string }).name,
    (song as { title?: string }).title,
    (song as { songTitle?: string }).songTitle,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return "";
};

const resolveSongArtist = (song: Song | null | undefined): string => {
  if (!song) return "";
  const names: string[] = [];
  const addName = (value: unknown) => {
    if (!value) return;
    if (typeof value === "string" && value.trim().length > 0) {
      names.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(addName);
      return;
    }
    if (typeof value === "object") {
      const maybeName = (value as { name?: unknown }).name;
      if (typeof maybeName === "string" && maybeName.trim().length > 0) {
        names.push(maybeName.trim());
      }
    }
  };

  addName(song.artist);
  addName((song as { artistName?: unknown }).artistName);
  addName((song as { artists?: unknown }).artists);
  addName((song as { artistNames?: unknown }).artistNames);

  const unique = Array.from(new Set(names.filter((name) => name.length > 0)));
  return unique.join(", ");
};

const getMessageSortKey = (msg: Message): number => {
  if (typeof msg.sentAt === "number" && Number.isFinite(msg.sentAt)) {
    return msg.sentAt;
  }
  if (typeof msg.id === "string") {
    const numericId = Number(msg.id);
    if (Number.isFinite(numericId)) return numericId;
    const digits = msg.id.match(/\d+/g);
    if (digits?.length) {
      const last = Number(digits[digits.length - 1]);
      if (Number.isFinite(last)) return last;
    }
  }
  return 0;
};

const sortMessagesChronologically = (messages: Message[]): Message[] => {
  return [...messages].sort((a, b) => {
    const diff = getMessageSortKey(a) - getMessageSortKey(b);
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  });
};



const Social = () => {

  // Track if selectedChat was set by user click (true) or auto-select (false)
  const isUserSelectedRef = useRef<boolean>(false);

  const [selectedChat, setSelectedChat] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lastChatFriendId');
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<SocialTab>(() => {
    if (typeof window === 'undefined') return 'chat';
    const search = new URLSearchParams(window.location.search || '');
    return normalizeSocialTab(search.get('tab'));
  });
  const [newMessage, setNewMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const pushBubble = useCallback(
    (
      message: string,
      variant: "info" | "success" | "warning" | "error" = "info",
      from?: string,
      avatar?: string | null
    ) => {
      emitChatBubble({ from: from || "System", message, variant, avatar: avatar || undefined });
    },
    []
  );

  

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const updateTabQuery = useCallback((tab: SocialTab, replace = false) => {
    const baseSearch = typeof window !== 'undefined'
      ? window.location.search
      : searchParams.toString();
    const next = new URLSearchParams(baseSearch);
    if (tab === 'chat') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, replace ? { replace: true } : undefined);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const nextTab = normalizeSocialTab(searchParams.get('tab'));
    setActiveTab(prev => (prev === nextTab ? prev : nextTab));
    
    // Xử lý query parameter 'friend' để chọn đúng người chat
    const friendParam = searchParams.get('friend');
    if (friendParam && nextTab === 'chat') {
      const friendId = String(friendParam);
      // Chỉ set nếu friendId hợp lệ và khác với selectedChat hiện tại
      if (friendId && friendId !== selectedChat) {
        setSelectedChat(friendId);
        // Lưu vào localStorage để giữ trạng thái
        try {
          localStorage.setItem('lastChatFriendId', friendId);
        } catch {
          void 0;
        }
        // Xóa query parameter sau khi đã xử lý
        const next = new URLSearchParams(searchParams.toString());
        next.delete('friend');
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, selectedChat, setSearchParams]);

  const [friends, setFriends] = useState<Friend[]>([]);

  const friendsRef = useRef<Friend[]>([]);
  const chatWatchersRef = useRef<Record<string, () => void>>({});
  const typingWatchersRef = useRef<Record<string, () => void>>({});
  const reactionsWatcherRef = useRef<(() => void) | null>(null);
  const lastReadRef = useRef<Record<string, number>>({});
  const selectedChatRef = useRef<string | null>(selectedChat);
  const typingStatusRef = useRef<{ roomId: string | null; active: boolean }>({ roomId: null, active: false });
  const typingStartTimeoutRef = useRef<number | null>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const mergeFirebaseMessagesRef = useRef<((friendKey: string, firebaseMessages: FirebaseMessage[]) => void) | null>(null);
  const recentFirebaseKeysRef = useRef<Record<string, Set<string>>>({});
  const typingDebounceTimeoutRef = useRef<number | null>(null);
  const loadedHistoryRef = useRef<Set<string>>(new Set()); // ✅ Track đã load history cho từng chat
  const lastMarkedMessageIdRef = useRef<Record<string, string>>({}); // ✅ Track tin nhắn cuối cùng đã mark as read cho mỗi chat

  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);

  // Legacy invite link flow removed



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

  // Track meId state để tự động update khi localStorage thay đổi
  const [meId, setMeId] = useState<number | undefined>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  });

  // Update meId khi localStorage thay đổi (cho OAuth login)
  useEffect(() => {
    const checkUserId = () => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const n = raw ? Number(raw) : NaN;
        const newId = Number.isFinite(n) ? n : undefined;
        setMeId(prev => {
          if (prev !== newId) {
            console.log('[Social] meId changed:', prev, '->', newId);
            return newId;
          }
          return prev;
        });
      } catch {
        setMeId(undefined);
      }
    };

    // Check ngay lập tức
    checkUserId();

    // Polling để detect thay đổi trong cùng tab (cho OAuth login)
    let pollInterval = 100; // 100ms trong 5 giây đầu
    const checkInterval = setInterval(() => {
      checkUserId();
    }, pollInterval);

    // Sau 5 giây, giảm tần suất về 500ms
    const slowPollTimeout = setTimeout(() => {
      clearInterval(checkInterval);
      pollInterval = 500;
      const slowInterval = setInterval(() => {
        checkUserId();
      }, pollInterval);
      return () => clearInterval(slowInterval);
    }, 5000);

    // Listen for storage changes (từ tab khác)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userId') {
        checkUserId();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for window focus (khi user quay lại tab sau OAuth)
    const handleFocus = () => {
      checkUserId();
    };
    window.addEventListener('focus', handleFocus);

    // Detect OAuth callback từ URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('token') || urlParams.has('oauth_token')) {
      setTimeout(checkUserId, 100);
    }

    return () => {
      clearInterval(checkInterval);
      clearTimeout(slowPollTimeout);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const { firebaseReady, firebaseStatus, firebaseError } = useFirebaseAuth(meId);
  const realtimeUserId = firebaseReady ? meId : undefined;

  useEffect(() => {
    if (firebaseError) {
      console.error("[Social] Firebase auth error:", firebaseError);
    }
  }, [firebaseError]);

  // Legacy invite URL persistence removed.
  // Legacy invite persistence removed

  // Legacy invite preview flow removed
  // Legacy invite preview removed



  // Do not auto-accept on link open; user must click Accept/Decline.

  const [pending, setPending] = useState<ApiPendingDTO[]>([]);

  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  const [profileName, setProfileName] = useState<string>("");

  const [profileEmail, setProfileEmail] = useState<string>("");

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string>("");
  const [profilePlanLabel, setProfilePlanLabel] = useState<string>("");
  const [profileIsPremium, setProfileIsPremium] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string>("");
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  // Inline public profile viewing via /social?u=USERNAME
  const [inlineProfileLoading, setInlineProfileLoading] = useState(false);
  const [inlineProfile, setInlineProfile] = useState<{ id?: number; username?: string; name?: string | null; avatar?: string | null; bio?: string | null } | null>(null);
  const [inlineProfileNotFound, setInlineProfileNotFound] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const [collabInvites, setCollabInvites] = useState<CollabInviteDTO[]>([]);

  const [loadingCollabInvites, setLoadingCollabInvites] = useState<boolean>(false);

  const [expandedInviteId, setExpandedInviteId] = useState<number | null>(null);
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);
  const [pendingUnfriend, setPendingUnfriend] = useState<{ friendId: string; friendName: string } | null>(null);

  // Invite link preview state
  // Legacy states removed

  // Track unread counts for chats and notifications.
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  // unreadByFriend: key = friendId (string), value = unread count (number)
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});
  const [unreadByPlaylist, setUnreadByPlaylist] = useState<Record<string, number>>({});

  const [playlistRooms, setPlaylistRooms] = useState<PlaylistLibraryItemDTO[]>([]);
  const [loadingPlaylistRooms, setLoadingPlaylistRooms] = useState(false);
  // Track collaborator count for each playlist to determine if group chat should be locked
  const [playlistCollaboratorCounts, setPlaylistCollaboratorCounts] = useState<Record<number, number>>({});

  // Load playlist rooms (owner + collaborator) để hiển thị trong Social chat
  useEffect(() => {
    let active = true;
    const loadRooms = async () => {
      if (!meId) {
        if (active) {
          setPlaylistRooms([]);
          setLoadingPlaylistRooms(false);
        }
        return;
      }
      try {
        setLoadingPlaylistRooms(true);
        const data = await playlistsApi.library();
        if (!active) return;
        // Library API đã trả về tất cả owned + collaborated playlists
        // Hiển thị tất cả để user có thể chat trong các playlist groups
        console.log("[Social] Raw library data:", data?.length, data);
        const rooms: PlaylistLibraryItemDTO[] = (data || []).filter((p: PlaylistLibraryItemDTO) => {
          if (!p) return false;
          // Hiển thị tất cả playlists từ library (đã bao gồm owned + collaborated)
          return true;
        });
        console.log("[Social] Loaded playlist rooms:", rooms.length, rooms);
        
        // Xử lý khi playlist bị xóa - cleanup Firebase listeners và clear messages
        const currentRoomIds = new Set(
          rooms.map((r) => typeof r.playlistId === "number" ? r.playlistId : (typeof (r as any).id === "number" ? (r as any).id : 0))
        );
        const previousRoomIds = new Set(
          playlistRooms.map((r) => typeof r.playlistId === "number" ? r.playlistId : (typeof (r as any).id === "number" ? (r as any).id : 0))
        );
        
        // Tìm các playlist đã bị xóa
        const deletedPlaylistIds: number[] = [];
        previousRoomIds.forEach((id) => {
          if (id > 0 && !currentRoomIds.has(id)) {
            deletedPlaylistIds.push(id);
          }
        });
        
        // Cleanup Firebase listeners và clear messages cho các playlist đã bị xóa
        if (deletedPlaylistIds.length > 0 && active) {
          console.log("[Social] Playlists deleted, cleaning up:", deletedPlaylistIds);
          deletedPlaylistIds.forEach((playlistId) => {
            const roomId = `pl_${playlistId}`;
            // Unsubscribe Firebase listener
            if (chatWatchersRef.current[roomId]) {
              chatWatchersRef.current[roomId]();
              delete chatWatchersRef.current[roomId];
            }
            // Clear messages
            setChatByFriend((prev) => {
              const next = { ...prev };
              delete next[roomId];
              return next;
            });
            // Clear unread count
            setUnreadByPlaylist((prev) => {
              const next = { ...prev };
              delete next[String(playlistId)];
              return next;
            });
            // Nếu đang xem playlist này, đóng chat
            if (selectedChatRef.current === roomId) {
              setSelectedChat(null);
            }
          });
        }
        
        setPlaylistRooms(rooms);
        
        // Fetch collaborator counts for each playlist
        const collaboratorCounts: Record<number, number> = {};
        await Promise.all(
          rooms.map(async (room) => {
            const playlistId = typeof room.playlistId === "number" ? room.playlistId : (typeof (room as any).id === "number" ? (room as any).id : 0);
            if (!playlistId) return;
            try {
              const collaborators = await playlistCollaboratorsApi.list(playlistId);
              // Count includes owner, so total members = collaborators.length + 1 (owner)
              const totalMembers = collaborators.length + 1; // owner + collaborators
              collaboratorCounts[playlistId] = totalMembers;
            } catch (error) {
              // If error (e.g., playlist deleted or no permission), assume 0 members (playlist deleted)
              collaboratorCounts[playlistId] = 0;
            }
          })
        );
        if (active) {
          setPlaylistCollaboratorCounts(collaboratorCounts);
        }
      } catch {
        if (active) setPlaylistRooms([]);
      } finally {
        if (active) setLoadingPlaylistRooms(false);
      }
    };
    void loadRooms();
    return () => {
      active = false;
    };
  }, [meId]);

  const [playlistChatOpen, setPlaylistChatOpen] = useState(false);
  const [activePlaylistChat, setActivePlaylistChat] = useState<PlaylistLibraryItemDTO | null>(null);

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
    if (selectedChat) {
      try {
        localStorage.setItem('lastChatFriendId', selectedChat);
      } catch {
        void 0;
      }
    }
  }, [selectedChat]);



  // Music context (for sharing current song)

  const { currentSong, playSong } = useMusic();



  // Chat state: messages per friend id

  const [chatByFriend, setChatByFriend] = useState<Record<string, Message[]>>({});
  const [typingByFriend, setTypingByFriend] = useState<Record<string, boolean>>({});
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, MessageReactionSummary[]>>({});
  const [messageIndexByRoom, setMessageIndexByRoom] = useState<Record<string, Record<string, string>>>({});

  const getLastActivityTimestamp = useCallback(
    (friendId: string): number => {
      const friendMessages = chatByFriend[friendId];
      if (!friendMessages || friendMessages.length === 0) {
        return 0;
      }
      const latest = friendMessages[friendMessages.length - 1];
      return getMessageSortKey(latest);
    },
    [chatByFriend]
  );

  const markConversationAsRead = useCallback(
    (friendKey: string | number | null | undefined) => {
      if (!meId || friendKey == null) return;
      
      // Xử lý playlist room (pl_{playlistId})
      if (typeof friendKey === "string" && friendKey.startsWith("pl_")) {
        const playlistId = Number(friendKey.replace("pl_", ""));
        if (!Number.isFinite(playlistId)) return;
        
        const cacheKey = `pl_${meId}-${playlistId}`;
        const now = Date.now();
        const last = lastReadRef.current[cacheKey];
        if (last && now - last < 1000) {
          console.log('⏭️ [DEBUG] Skipping mark playlist room as read (throttled)');
          return;
        }
        lastReadRef.current[cacheKey] = now;
        
        console.log('✅ [DEBUG] Calling markPlaylistRoomAsRead API...', { playlistId, userId: meId });
        playlistChatApi
          .markRoomAsRead(playlistId, meId)
          .then(() => {
            console.log('✅ [DEBUG] markPlaylistRoomAsRead API completed successfully');
          })
          .catch((error) => {
            console.warn("[Social] Failed to mark playlist room as read", error);
          });
        return;
      }
      
      // Xử lý 1-1 chat (friend)
      const friendId = Number(friendKey);
      if (!Number.isFinite(friendId)) return;
      
      // 🔴 DEBUG: Log mỗi lần markConversationAsRead được gọi
      console.log('🔴 [DEBUG] markConversationAsRead called:', { meId, friendId, friendKey });
      console.trace('🔴 [DEBUG] Call stack:');
      
      const cacheKey = `${meId}-${friendId}`;
      const now = Date.now();
      const last = lastReadRef.current[cacheKey];
      if (last && now - last < 1000) {
        console.log('⏭️ [DEBUG] Skipping mark as read (throttled, last call was', now - last, 'ms ago)');
        return;
      }
      lastReadRef.current[cacheKey] = now;
      
      console.log('✅ [DEBUG] Calling markConversationRead API...');
      chatApi
        .markConversationRead(meId, friendId)
        .then(() => {
          console.log('✅ [DEBUG] markConversationRead API completed successfully');
        })
        .catch((error) => {
          console.warn("[Social] Failed to mark conversation as read", error);
        });
    },
    [meId]
  );

  // Store mergeFirebaseMessages in ref to avoid re-subscribing Firebase listeners
  const mergeFirebaseMessages = useCallback(
    (friendKey: string, firebaseMessages: FirebaseMessage[]) => {
      const parsed = firebaseMessages.map((firebaseMessage) => {
        // Priority: contentPlain > contentPreview > content/contentCipher
        // If only preview exists (truncated), show it temporarily while fetching full content
        const hasPlaintext = !!firebaseMessage.contentPlain;
        const displayContent =
          firebaseMessage.contentPlain ??
          firebaseMessage.contentPreview ??
          (typeof firebaseMessage.content === "string" && firebaseMessage.content.trim() ? firebaseMessage.content : "") ??
          (typeof firebaseMessage.contentCipher === "string" ? "[Encrypted]" : "");
        
        if (!displayContent && !firebaseMessage.sharedContentType && !firebaseMessage.sharedContent) {
          console.warn("[Social] Message from Firebase has no displayable content:", {
            id: firebaseMessage.id,
            messageId: firebaseMessage.messageId,
            hasContentPlain: !!firebaseMessage.contentPlain,
            hasContentPreview: !!firebaseMessage.contentPreview,
            hasContent: !!firebaseMessage.content,
            hasContentCipher: !!firebaseMessage.contentCipher,
          });
        }
        
        const normalized: ChatMessageDTO = {
          ...(firebaseMessage as unknown as ChatMessageDTO),
          contentPlain: hasPlaintext ? firebaseMessage.contentPlain : (displayContent || undefined),
          content: displayContent || (hasPlaintext ? undefined : ""),
        };
        const parsed = parseIncomingContent(normalized, friendsRef.current.length ? friendsRef.current : friends);
        // Store firebaseKey for reactions lookup
        // Priority: firebaseKey field in message object > snapshot key (id)
        const firebaseKey = (firebaseMessage as { firebaseKey?: string }).firebaseKey || firebaseMessage.id;
        // Preserve senderName and senderAvatar from Firebase for playlist room messages
        const result = firebaseKey ? { ...parsed, firebaseKey } : parsed;
        if (firebaseMessage.senderName) {
          (result as any).senderName = firebaseMessage.senderName;
        }
        if (firebaseMessage.senderAvatar !== undefined) {
          (result as any).senderAvatar = firebaseMessage.senderAvatar;
        }
        return result;
      });
      
      // If any message lacks plaintext, trigger history refresh to get full content immediately
      const needsRefresh = parsed.some((msg) => {
        const original = firebaseMessages.find((fm) => String(fm.id) === String(msg.id));
        // Check if message has only preview (truncated) or no contentPlain
        return original && (!original.contentPlain || (original.contentPreview && !original.contentPlain)) && original.messageId;
      });
      
      // Skip history refresh for playlist rooms (pl_{playlistId}) - they don't have history API
      if (needsRefresh && meId && !friendKey.startsWith("pl_")) {
        const friendNumericId = Number(friendKey);
        if (Number.isFinite(friendNumericId)) {
          // Fetch immediately without debounce for better UX
          const refreshKey = `refresh-${friendKey}`;
          if (!window.__chatRefreshPending?.[refreshKey]) {
            if (!window.__chatRefreshPending) {
              window.__chatRefreshPending = {};
            }
            window.__chatRefreshPending[refreshKey] = true;
            // Fetch immediately, no setTimeout delay for better UX
              chatApi
                .getHistory(meId, friendNumericId)
                .then((history) => {
                  const normalizedHistory = history.map((h) => ({
                    ...h,
                    contentPlain: h.contentPlain ?? (typeof h.content === "string" ? h.content : undefined),
                  }));
                
                  const mapped = normalizedHistory.map((h) => parseIncomingContent(h, friendsRef.current.length ? friendsRef.current : friends));
                  setChatByFriend((prev) => {
                    const existing = prev[friendKey] || [];
                    const historyIds = new Set(mapped.map((m) => String(m.id)));
                  const historyByBackendId = new Map<number, Message>();
                  mapped.forEach((msg) => {
                    if (msg.backendId) {
                      historyByBackendId.set(msg.backendId, msg);
                    }
                  });
                  
                  // Merge: update existing messages with full content from history
                  // IMPORTANT: Preserve system messages (type === "system" or no backendId) from Firebase
                  const updated = existing.map((msg) => {
                    // Preserve system messages - they don't have backendId and aren't in history
                    if (msg.type === "system" || (!msg.backendId && !msg.id?.startsWith("temp-"))) {
                      return msg;
                    }
                    // If message has backendId and history has full content for it, use history version
                    if (msg.backendId && historyByBackendId.has(msg.backendId)) {
                      const historyMsg = historyByBackendId.get(msg.backendId)!;
                      // Always use history version if it has content (full content from API)
                      if (historyMsg.content) {
                        console.log('[Social] Updating message with full content from history:', { 
                          backendId: msg.backendId, 
                          oldLength: msg.content?.length || 0, 
                          newLength: historyMsg.content.length 
                        });
                        return historyMsg;
                      }
                    }
                    // If message ID matches history, use history version
                    if (historyIds.has(String(msg.id))) {
                      const historyMsg = mapped.find(m => String(m.id) === String(msg.id));
                      if (historyMsg && historyMsg.content) {
                        console.log('[Social] Updating message by ID with full content:', { 
                          id: msg.id, 
                          oldLength: msg.content?.length || 0, 
                          newLength: historyMsg.content.length 
                        });
                        return historyMsg;
                      }
                    }
                    return msg;
                  });
                  
                  // Add new messages from history that don't exist in current
                  const existingIds = new Set(updated.map(m => String(m.id)));
                  mapped.forEach((msg) => {
                    if (!existingIds.has(String(msg.id))) {
                      updated.push(msg);
                    }
                  });
                  
                    // Keep temp messages and system messages that aren't in history yet
                    existing.forEach((msg) => {
                      const isTemp = msg.id?.startsWith("temp-");
                      const isSystem = msg.type === "system" || (!msg.backendId && !isTemp);
                      if ((isTemp || isSystem) && !historyIds.has(msg.id)) {
                      const alreadyAdded = updated.some(m => m.id === msg.id);
                      if (!alreadyAdded) {
                        updated.push(msg);
                      }
                      }
                    });
                  
                  return { ...prev, [friendKey]: sortMessagesChronologically(updated) };
                  });
                  if (window.__chatRefreshPending) {
                    delete window.__chatRefreshPending[refreshKey];
                  }
                })
                .catch((err) => {
                  console.warn("[Social] Failed to refresh message history:", err);
                  if (window.__chatRefreshPending) {
                    delete window.__chatRefreshPending[refreshKey];
                  }
                });
          }
        }
      }

      const incomingFirebaseKeys = new Set(
        parsed
          .map((msg) => msg.firebaseKey)
          .filter((key): key is string => typeof key === "string" && key.length > 0)
      );
      const previousFirebaseKeys = recentFirebaseKeysRef.current[friendKey] || new Set<string>();
      const removedFirebaseKeys =
        previousFirebaseKeys.size > 0
          ? new Set(Array.from(previousFirebaseKeys).filter((key) => !incomingFirebaseKeys.has(key)))
          : new Set<string>();
      recentFirebaseKeysRef.current[friendKey] = incomingFirebaseKeys;

      setChatByFriend((prev) => {
        const existing = prev[friendKey] || [];
        const replaced = existing.map((msg) => {
          if (typeof msg.id !== "string" || !msg.id.startsWith("temp-")) {
            return msg;
          }
          const matching = parsed.find((candidate) => {
            if (candidate.sender !== msg.sender) return false;
            if (candidate.type !== msg.type) return false;
            if (msg.type === "song") {
              return candidate.songData?.id === msg.songData?.id;
            }
            if (msg.type === "playlist") {
              return candidate.playlistData?.id === msg.playlistData?.id;
            }
            if (msg.type === "album") {
              return candidate.albumData?.id === msg.albumData?.id;
            }
            return candidate.content === msg.content;
          });
          return matching ?? msg;
        });

        const unique = new Map<string, Message>();
        replaced.forEach((message) => {
          // For system messages, use firebaseKey or content + timestamp as key to avoid duplicates
          const key = message.type === "system" 
            ? (message.firebaseKey || `${message.content}_${message.sentAt || message.timestamp || Date.now()}`)
            : String(message.id);
          unique.set(key, message);
        });
        parsed.forEach((message) => {
          // For system messages, use firebaseKey or content + timestamp as key to avoid duplicates
          const key = message.type === "system"
            ? (message.firebaseKey || `${message.content}_${message.sentAt || message.timestamp || Date.now()}`)
            : String(message.id);
          // Only add if not already exists (for system messages, check by content + timestamp)
          if (!unique.has(key)) {
            unique.set(key, message);
          } else if (message.type === "system" && message.firebaseKey) {
            // If system message has firebaseKey, prefer the one with firebaseKey
            const existing = unique.get(key);
            if (existing && !existing.firebaseKey) {
              unique.set(key, message);
            }
          }
        });

        const sorted = sortMessagesChronologically(
          Array.from(unique.values()).filter((message) => {
            if (!message.firebaseKey) return true;
            if (removedFirebaseKeys.has(message.firebaseKey)) {
              console.log("[Social] Removing message due to firebase deletion:", {
                firebaseKey: message.firebaseKey,
                messageId: message.id,
                backendId: message.backendId,
              });
              return false;
            }
            return true;
          })
        );
        const previous = prev[friendKey] || [];
        const unchanged =
          previous.length === sorted.length &&
          previous.every((message, index) => {
            const next = sorted[index];
            if (!next) return false;
            if (message.id !== next.id) return false;
            if (message.content !== next.content) return false;
            if (message.type !== next.type) return false;
            const messageSongId = message.songData?.id ?? null;
            const nextSongId = next.songData?.id ?? null;
            return messageSongId === nextSongId;
          });

        if (unchanged) {
          return prev;
        }

        return { ...prev, [friendKey]: sorted };
      });

      // Note: Unread count is managed by Firebase listener, not here
      // When user views chat, markConversationAsRead will trigger backend to update Firebase
    },
    [activeTab, selectedChat, markConversationAsRead, friends, meId]
  );

  // Store mergeFirebaseMessages in ref to avoid re-subscribing Firebase listeners
  useEffect(() => {
    mergeFirebaseMessagesRef.current = mergeFirebaseMessages;
  }, [mergeFirebaseMessages]);

  useEffect(() => {
    if (!selectedChat) return;
    // Don't reset if it's a playlist room (pl_{playlistId})
    if (selectedChat.startsWith("pl_")) {
      return;
    }
    const stillExists = friends.some((friend) => friend.id === selectedChat);
    if (!stillExists) {
      setSelectedChat(null);
    }
  }, [friends, selectedChat]);

  // Only auto-select a friend when first entering chat tab (selectedChat is null)
  // Do NOT auto-switch when user is already chatting with someone
  // Do NOT mark as read when auto-selecting - only mark when user explicitly clicks
  useEffect(() => {
    if (activeTab !== "chat") return;
    // If user already has a selected chat (friend or playlist room), don't auto-switch
    if (selectedChat) {
      // Check if it's a friend
      if (friends.some((friend) => friend.id === selectedChat)) {
        return;
      }
      // Check if it's a playlist room (pl_{playlistId})
      if (selectedChat.startsWith("pl_")) {
        return;
      }
    }
    if (!friends.length) return;

    // Only auto-select when selectedChat is null (first time entering chat tab)
    // Use setSelectedChat directly (not handleFriendSelect) to avoid auto-marking as read
    // Use getLastActivityTimestamp directly instead of in dependencies to avoid infinite loop
    const unreadCandidates = friends
      .filter((friend) => (unreadByFriend[friend.id] || 0) > 0)
      .sort((a, b) => {
        const diff = (unreadByFriend[b.id] || 0) - (unreadByFriend[a.id] || 0);
        if (diff !== 0) return diff;
        return getLastActivityTimestamp(b.id) - getLastActivityTimestamp(a.id);
      });

    const recentCandidates = [...friends].sort(
      (a, b) => getLastActivityTimestamp(b.id) - getLastActivityTimestamp(a.id)
    );

    const fallback = friends[0];
    const nextFriend = unreadCandidates[0] || recentCandidates[0] || fallback;
    if (nextFriend) {
      // Direct setSelectedChat - do NOT call handleFriendSelect to avoid auto-marking as read
      isUserSelectedRef.current = false; // Mark as auto-selected
      setSelectedChat(nextFriend.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, friends, selectedChat, unreadByFriend]);

  // Handle friend selection - mark as read when user explicitly clicks on a friend
  const handleFriendSelect = useCallback((friendId: string) => {
    console.log('👆 [DEBUG] handleFriendSelect called (user clicked on friend):', friendId);
    isUserSelectedRef.current = true; // Mark as user-selected
    setSelectedChat(friendId);
    // Mark as read when user clicks on a friend (not automatically when entering social page)
    console.log('👆 [DEBUG] Calling markConversationAsRead from handleFriendSelect...');
    markConversationAsRead(friendId);
  }, [markConversationAsRead]);

  useEffect(() => {
    if (activeTab !== "chat" || !selectedChat) return;
    const payload =
      selectedChat.startsWith("pl_")
        ? { roomId: selectedChat, friendId: null }
        : { friendId: selectedChat, roomId: null };
    emitChatTabOpened(payload);
  }, [activeTab, selectedChat]);

  // ✅ Mark conversation as read ngay khi user vào chat (không delay để tránh unread tăng)
  useEffect(() => {
    if (!meId || !selectedChat || activeTab !== "chat") return;
    
    // ✅ Mark as read ngay lập tức (không delay) để tránh unread count tăng
    console.log('👁️ [Social] User is viewing chat, marking as read immediately:', selectedChat);
    // Sử dụng setTimeout để đảm bảo mark as read được gọi sau khi component đã render xong
    const timeoutId = setTimeout(() => {
      markConversationAsRead(selectedChat);
      // Clear local unread state ngay lập tức cho UX mượt
      if (selectedChat.startsWith("pl_")) {
        const playlistId = selectedChat.replace("pl_", "");
        setUnreadByPlaylist((prev) => {
          if (!prev[playlistId]) return prev;
          const next = { ...prev };
          delete next[playlistId];
          return next;
        });
      } else {
        setUnreadByFriend((prev) => {
          if (!prev[selectedChat]) return prev;
          const next = { ...prev };
          delete next[selectedChat];
          return next;
        });
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [meId, selectedChat, activeTab, markConversationAsRead]);

  // ✅ Mark as read khi có tin nhắn mới đến trong chat đang xem
  useEffect(() => {
    if (!meId || !selectedChat || activeTab !== "chat") return;
    
    const messages = chatByFriend[selectedChat] || [];
    if (messages.length === 0) return;
    
    // Lấy tin nhắn mới nhất
    const latestMessage = messages[messages.length - 1];
    const latestMessageId = latestMessage?.id;
    
    // Check xem tin nhắn này đã được mark chưa
    const lastMarkedId = lastMarkedMessageIdRef.current[selectedChat];
    if (lastMarkedId === latestMessageId) {
      // Đã mark rồi, không cần mark lại
      return;
    }
    
    // Nếu tin nhắn mới nhất không phải từ user hiện tại (từ friend) → mark as read
    if (latestMessage && latestMessage.sender !== 'You' && latestMessageId) {
      // Debounce để tránh mark quá nhiều lần
      const timeoutId = setTimeout(() => {
        console.log('👁️ [Social] New message received in active chat, marking as read:', selectedChat, 'messageId:', latestMessageId);
        markConversationAsRead(selectedChat);
        // ✅ Mark tin nhắn này đã được mark
        lastMarkedMessageIdRef.current[selectedChat] = latestMessageId;
      }, 1000); // Delay 1s để tránh mark quá nhiều khi có nhiều tin nhắn liên tiếp
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [meId, selectedChat, activeTab, chatByFriend, markConversationAsRead]);

  // Normalize relative URLs from API to absolute
  const toAbsoluteUrl = (u?: string | null): string | null => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const base = API_BASE_URL.replace(/\/?$/, '');
    if (u.startsWith('/api/')) {
      if (base.endsWith('/api')) {
        return `${base.slice(0, -4)}${u}`;
      }
    }
    // Ensure single slash between base and path
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u}`;
  };

  // Load my profile info for Friends panel (name, email, avatar)
  useEffect(() => {
    let lastToken: string | null = null;
    let lastUserId: string | null = null;
    let loadAttempts = 0;
    
    const loadMe = async (force = false) => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const userId = typeof window !== 'undefined' ? (localStorage.getItem('userId') || sessionStorage.getItem('userId')) : null;
        
        // Nếu không có token, reset state
        if (!token) {
          setProfileName("");
          setProfileEmail("");
          setProfileAvatar(null);
          setProfileUserId(null);
          setProfileUsername("");
          setShareUrl("");
          lastToken = null;
          lastUserId = null;
          return;
        }
        
        // Chỉ load lại nếu token hoặc userId thay đổi, hoặc force reload
        if (!force && token === lastToken && userId === lastUserId) {
          return;
        }
        
        lastToken = token;
        lastUserId = userId;
        loadAttempts++;
        
        console.log('[Social] Loading profile, attempt:', loadAttempts, { token: token?.substring(0, 20) + '...', userId });
        
        const me = await authApi.me();
        setProfileName((me?.name || me?.username || '').trim());
        setProfileEmail((me?.email || '').trim());
        setProfileAvatar(toAbsoluteUrl(me?.avatar || null));
        const resolvedUserId = typeof me?.id === 'number' ? me.id : (() => {
          const idRaw = localStorage.getItem('userId') || sessionStorage.getItem('userId');
          const idNum = idRaw ? Number(idRaw) : NaN;
          return Number.isFinite(idNum) ? idNum : null;
        })();
        setProfileUserId(resolvedUserId);

        // ======== Premium label (sync với Profile.tsx) ========
        try {
          let subscription: PremiumSubscriptionDTO | null = null;
          if (resolvedUserId) {
            subscription = await premiumSubscriptionApi.getMySubscription(resolvedUserId);
          }

          const getPremiumStringFlag = (value?: string | null) => {
            if (!value) return false;
            const v = String(value).toLowerCase();
            return (
              v === "premium" ||
              v === "vip" ||
              v === "paid" ||
              v === "yes" ||
              v === "true" ||
              v === "1"
            );
          };

          const userPremiumBoolean =
            Boolean((me as any)?.isPremium) ||
            Boolean((me as any)?.premium) ||
            getPremiumStringFlag((me as any)?.plan) ||
            getPremiumStringFlag((me as any)?.membership) ||
            getPremiumStringFlag(me?.roleName);

          const premiumSources = [
            userPremiumBoolean,
            getPremiumStringFlag(subscription?.planName),
            getPremiumStringFlag(subscription?.planCode),
          ];
          const isPremiumUser = premiumSources.some((flag) => Boolean(flag));

          const premiumStartDate =
            subscription?.createdAt ||
            subscription?.startDate ||
            subscription?.currentPeriodStart ||
            (me as any)?.premiumStartDate ||
            (me as any)?.premiumStartedAt ||
            null;
          const premiumEndDate =
            subscription?.expiresAt ||
            subscription?.endDate ||
            subscription?.currentPeriodEnd ||
            (me as any)?.premiumEndDate ||
            (me as any)?.premiumExpiresAt ||
            null;

          let rawPlanLabel =
            subscription?.planName ||
            subscription?.planCode ||
            (me as any)?.planName ||
            (me as any)?.plan ||
            (me as any)?.membership ||
            (isPremiumUser ? "Premium" : "Free");

          const planLabel = rawPlanLabel
            ?.replace(/Premium\s*1\s*tháng/gi, "Premium Monthly")
            ?.replace(/Premium\s*3\s*tháng/gi, "Premium Quarterly")
            ?.replace(/Premium\s*1\s*năm/gi, "Premium Yearly")
            ?.replace(/Premium\s*tháng/gi, "Premium Monthly")
            ?.replace(/Premium\s*năm/gi, "Premium Yearly")
            || (isPremiumUser ? "Premium" : "Free");

          let finalPremium = isPremiumUser;
          let finalPlanLabel = planLabel;
          if (premiumEndDate) {
            const end = new Date(premiumEndDate);
            if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
              finalPremium = false;
              finalPlanLabel = "Free";
            }
          }

          setProfileIsPremium(finalPremium);
          setProfilePlanLabel(finalPlanLabel);
        } catch (e) {
          console.warn("[Social] Failed to load premium subscription for FriendsPanel:", e);
          setProfileIsPremium(false);
          setProfilePlanLabel("");
        }
        const uname = (me?.username || (me?.email ? me.email.split('@')[0] : '') || '').trim();
        setProfileUsername(uname);
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          // Prefer sharing by numeric userId for robustness
          if (origin && resolvedUserId) {
            const shareLink = `${origin}/social?u=${encodeURIComponent(String(resolvedUserId))}`;
            setShareUrl(shareLink);
            console.log('[Social] Profile loaded, shareUrl set:', shareLink);
          } else if (origin && uname) {
            const shareLink = `${origin}/social?u=${encodeURIComponent(uname)}`;
            setShareUrl(shareLink);
            console.log('[Social] Profile loaded, shareUrl set:', shareLink);
          }
        } catch { /* noop */ }
      } catch (e) {
        // Non-fatal; keep fallbacks
        try { console.warn('[Social] Failed to load profile', e); } catch { /* noop */ }
      }
    };
    
    // Load ngay lập tức
    void loadMe(true);
    
    // Polling để detect token thay đổi trong cùng tab (cho OAuth login)
    // Tăng tần suất trong 5 giây đầu để catch OAuth callback nhanh hơn
    let checkInterval: NodeJS.Timeout | null = null;
    
    const startPolling = (interval: number) => {
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = setInterval(() => {
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const currentUserId = typeof window !== 'undefined' ? (localStorage.getItem('userId') || sessionStorage.getItem('userId')) : null;
        
        if (currentToken !== lastToken || currentUserId !== lastUserId) {
          console.log('[Social] Token/UserId changed, reloading profile');
          void loadMe(true);
        }
      }, interval);
    };
    
    // Bắt đầu với polling nhanh (100ms) trong 5 giây đầu
    startPolling(100);
    
    // Sau 5 giây, giảm tần suất polling về 500ms
    const fastPollTimeout = setTimeout(() => {
      startPolling(500);
    }, 5000);
    
    // Listen for storage changes (when token is set from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'userId') {
        console.log('[Social] Storage changed, reloading profile');
        void loadMe(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for window focus (khi user quay lại tab sau OAuth)
    const handleFocus = () => {
      console.log('[Social] Window focused, checking for token changes');
      void loadMe(true);
    };
    window.addEventListener('focus', handleFocus);
    
    // Also listen for custom login event if your app uses it
    const handleLogin = () => {
      console.log('[Social] Login event detected, reloading profile');
      void loadMe(true);
    };
    window.addEventListener('app:login-success', handleLogin);
    
    // Detect OAuth callback từ URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('token') || urlParams.has('oauth_token')) {
      console.log('[Social] OAuth callback detected in URL, reloading profile');
      setTimeout(() => void loadMe(true), 100);
    }
    
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      clearTimeout(fastPollTimeout);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('app:login-success', handleLogin);
    };
  }, []);



  // Legacy auto-clear for inviteCode removed
  // Legacy auto-clear removed

  // Define load functions BEFORE they are used in useEffect

  const loadFriends = async () => {

    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

    const idNum = raw ? Number(raw) : NaN;

    if (!Number.isFinite(idNum)) return;

    setLoadingFriends(true);

    try {

      const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(idNum);

      const mapped: Friend[] = apiFriends.map((f) => ({

        id: String(f.friendId ?? f.id),
        friendUserId: typeof f.friendId === "number" ? f.friendId : undefined,
        relationshipId: typeof f.id === "number" ? f.id : undefined,

        name: f.friendName || `User ${f.friendId}`,

        username: f.friendEmail ? `@${(f.friendEmail.split('@')[0] || '').toLowerCase()}` : `@user${f.friendId}`,

        avatar: toAbsoluteUrl(f.friendAvatar) || undefined,

        isOnline: false,

        streak: 0,

      }));

      setFriends(mapped);

      if (mapped.length > 0) {
        const firstFriend = mapped[0].id;
        setSelectedChat((prev) => {
          if (prev === null) {
            isUserSelectedRef.current = false; // Mark as auto-selected
            return firstFriend;
          }
          return prev;
        });
      }

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

    // Only call the API when a token is available
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setPending([]);
      return;
    }

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

  const handleAcceptFriendReq = async (id: number) => {
    try {
      await friendsApi.accept(id);
      await Promise.all([loadPending(), loadFriends()]);
      pushBubble("Friend request accepted", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || 'Failed to accept friend request');
      pushBubble(msg, "error");
    }
  };

  const handleRejectFriendReq = async (id: number) => {
    try {
      await friendsApi.reject(id);
      await loadPending();
      pushBubble("Friend request declined", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || 'Failed to decline friend request');
      pushBubble(msg, "error");
    }
  };



  const loadCollabInvites = useCallback(async () => {

  // Only fetch invites when tokens exist to avoid 401 spam after logout
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setCollabInvites([]);
      return;
    }

    setLoadingCollabInvites(true);

    try {

      const list = await playlistCollabInvitesApi.pending();

      setCollabInvites(Array.isArray(list) ? list : []);

      // Track which invites the user has viewed so we can highlight new ones later
      // Uses localStorage so the state persists between sessions
      if (Array.isArray(list) && list.length > 0 && meId) {
        try {
          const viewedInvitesKey = `viewedInvites_${meId}`;
          const viewedInvites = JSON.parse(localStorage.getItem(viewedInvitesKey) || '[]');
          const newInviteIds = list.map((inv: CollabInviteDTO) => inv.id);
          const allViewed = [...new Set([...viewedInvites, ...newInviteIds])];
          localStorage.setItem(viewedInvitesKey, JSON.stringify(allViewed));
        } catch {
          // Ignore localStorage errors
        }
      }

    } catch { setCollabInvites([]); }

    finally { setLoadingCollabInvites(false); }

  }, [meId]);



  // Load friends, pending requests, and invites when auth or tabs change
  useEffect(() => {
    if (!hasToken || !meId) return;
    void loadFriends();
    void loadPending();
    if (activeTab !== 'friends') {
      void loadCollabInvites();
    }
  }, [hasToken, meId, activeTab, loadCollabInvites]);

  useEffect(() => {
    if (activeTab !== 'friends') return;
    loadCollabInvites().catch(() => { void 0; });
  }, [activeTab, loadCollabInvites]);



  useEffect(() => {

    if (expandedInviteId == null) return;

    if (!collabInvites.some(inv => inv.id === expandedInviteId)) {

      setExpandedInviteId(null);

    }

  }, [collabInvites, expandedInviteId]);



  // Firebase Realtime handler

  // Memoize friend ids so presence listeners do not churn each render

  const friendsIdsString = useMemo(() => JSON.stringify(friends.map(f => f.id).sort()), [friends.map(f => f.id).join(',')]);

  const friendIds = useMemo(() => friends.map(f => Number(f.id)).sort((a, b) => a - b), [friendsIdsString]);

  // Load initial unread counts từ API khi component mount
  useEffect(() => {
    if (!meId) return;
    
    let cancelled = false;
    
    const loadInitialUnreadCounts = async () => {
      try {
        const data = await chatApi.getUnreadCounts(meId);
        if (cancelled) return;
        
        // Convert roomKey (e.g., "2_5") to friendId
        // roomKey format: "minId_maxId", cần tìm friendId là maxId hoặc minId (không phải meId)
        const unreadByFriendMap: Record<string, number> = {};
        
        const unreadByPlaylistMap: Record<string, number> = {};
        Object.entries(data.unreadCounts).forEach(([roomKey, count]) => {
          if (roomKey.startsWith("pl_")) {
            const playlistId = roomKey.replace("pl_", "");
            if (playlistId && Number(count) > 0) {
              unreadByPlaylistMap[playlistId] = Number(count);
            }
          } else {
            const [minId, maxId] = roomKey.split('_').map(Number);
            // Tìm friendId (không phải meId)
            const friendId = minId === meId ? maxId : minId;
            if (friendId && friendId !== meId && count > 0) {
              unreadByFriendMap[String(friendId)] = count;
            }
          }
        });
        
        console.log('[Social] Loaded initial unread counts from API:', { 
          unreadCounts: data.unreadCounts, 
          unreadByFriendMap,
          unreadByPlaylistMap,
          totalUnread: data.totalUnread 
        });
        
        setUnreadByFriend(unreadByFriendMap);
        setUnreadByPlaylist(unreadByPlaylistMap);
        setUnreadMessagesCount(data.totalUnread);
      } catch (error) {
        console.warn('[Social] Failed to load initial unread counts from API:', error);
        // Fallback: set empty (Firebase listener will update)
        setUnreadByFriend({});
        setUnreadMessagesCount(0);
      }
    };
    
    void loadInitialUnreadCounts();
    
    return () => {
      cancelled = true;
    };
  }, [meId]);

  // Listen Firebase realtime unread counts (with API polling fallback if Firebase fails)
  useEffect(() => {
    if (!meId || !firebaseReady) return;
    
    console.log('[Social] Setting up Firebase unread counts listener for user:', meId);
    
    let pollInterval: number | null = null;
    
    // ✅ Track Firebase realtime activity - nếu có update thì không cần poll
    let lastFirebaseUpdateRef = Date.now();
    
    const unsubscribe = watchAllRoomUnreadCounts(meId, (unreadCounts, totalUnread) => {
      lastFirebaseUpdateRef = Date.now(); // ✅ Mark Firebase đang hoạt động
      
      // Convert roomKey to friendId (1-1 chat) và playlistId (group chat)
      const unreadByFriendMap: Record<string, number> = {};
      const unreadByPlaylistMap: Record<string, number> = {}; // playlistId -> count
      
      Object.entries(unreadCounts).forEach(([roomKey, count]) => {
        if (roomKey.startsWith("pl_")) {
          // Playlist room: pl_{playlistId}
          const playlistId = roomKey.replace("pl_", "");
          if (playlistId && Number(count) > 0) {
            unreadByPlaylistMap[playlistId] = Number(count);
          }
        } else {
          // 1-1 chat: minId_maxId
          const [minId, maxId] = roomKey.split('_').map(Number);
          if (!Number.isFinite(minId) || !Number.isFinite(maxId)) return;
          // Tìm friendId (không phải meId)
          const friendId = minId === meId ? maxId : minId;
          if (friendId && friendId !== meId && count > 0) {
            unreadByFriendMap[String(friendId)] = count;
          }
        }
      });
      
      console.log('[Social] Firebase unread counts updated:', { 
        unreadCounts, 
        unreadByFriendMap,
        totalUnread,
        selectedChat: selectedChatRef.current
      });
      
      // ✅ Nếu đang xem chat (friend hoặc playlist room) → không cập nhật unread count (để tránh tăng)
      const currentSelectedChat = selectedChatRef.current;
      if (currentSelectedChat) {
        // Xử lý playlist room chat (pl_{playlistId})
        if (currentSelectedChat.startsWith("pl_")) {
          const playlistId = currentSelectedChat.replace("pl_", "");
          const roomId = `pl_${playlistId}`;
          const unreadForCurrentChat = unreadCounts[roomId] || 0;
          if (unreadForCurrentChat > 0) {
            console.log('[Social] User is viewing this playlist room chat, marking as read to prevent unread increase');
            markConversationAsRead(currentSelectedChat);
            // ✅ Trừ unread của chat đang xem khỏi total
            const adjustedTotal = totalUnread - unreadForCurrentChat;
            const adjustedUnreadByPlaylist = { ...unreadByPlaylistMap };
            delete adjustedUnreadByPlaylist[playlistId];
            setUnreadByPlaylist(adjustedUnreadByPlaylist);
            setUnreadMessagesCount(Math.max(0, adjustedTotal));
            return;
          }
        } else {
          // Xử lý 1-1 chat (friend)
          const friendNumericId = Number(currentSelectedChat);
          if (Number.isFinite(friendNumericId)) {
            const roomId = getChatRoomKey(meId, friendNumericId);
            const unreadForCurrentChat = unreadCounts[roomId] || 0;
            if (unreadForCurrentChat > 0) {
              console.log('[Social] User is viewing this friend chat, marking as read to prevent unread increase');
              markConversationAsRead(currentSelectedChat);
              // ✅ Trừ unread của chat đang xem khỏi total
              const adjustedTotal = totalUnread - unreadForCurrentChat;
              const adjustedUnreadByFriend = { ...unreadByFriendMap };
              delete adjustedUnreadByFriend[currentSelectedChat];
              setUnreadByFriend(adjustedUnreadByFriend);
              setUnreadMessagesCount(Math.max(0, adjustedTotal));
              return;
            }
          }
        }
      }
      
      setUnreadByFriend(unreadByFriendMap);
      setUnreadByPlaylist(unreadByPlaylistMap);
      setUnreadMessagesCount(totalUnread);
    });
    
    // ✅ Fallback: Poll API chỉ khi Firebase không update trong 30s (realtime fail)
    // This ensures unread counts are still updated even if Firebase rooms/ path is not setup
    const pollUnreadCounts = async () => {
      const timeSinceLastFirebaseUpdate = Date.now() - lastFirebaseUpdateRef;
      
      // Nếu Firebase đã update trong 30s gần đây → không cần poll
      if (timeSinceLastFirebaseUpdate < 30000) {
        console.log('[Social] Skipping poll - Firebase updated recently:', timeSinceLastFirebaseUpdate, 'ms ago');
        return;
      }
      
      try {
        const data = await chatApi.getUnreadCounts(meId);
        const unreadByFriendMap: Record<string, number> = {};
        const unreadByPlaylistMap: Record<string, number> = {};
        
        Object.entries(data.unreadCounts).forEach(([roomKey, count]) => {
          if (roomKey.startsWith("pl_")) {
            const playlistId = roomKey.replace("pl_", "");
            if (playlistId && Number(count) > 0) {
              unreadByPlaylistMap[playlistId] = Number(count);
            }
          } else {
            const [minId, maxId] = roomKey.split('_').map(Number);
            const friendId = minId === meId ? maxId : minId;
            if (friendId && friendId !== meId && count > 0) {
              unreadByFriendMap[String(friendId)] = count;
            }
          }
        });
        
        console.log('[Social] Polled unread count from API (Firebase fallback):', data.totalUnread);
        setUnreadByFriend(unreadByFriendMap);
        setUnreadByPlaylist(unreadByPlaylistMap);
        setUnreadMessagesCount(data.totalUnread);
      } catch (error) {
        console.warn('[Social] Failed to poll unread counts from API:', error);
      }
    };
    
    // ✅ Poll mỗi 30s (thay vì 10s) - chỉ poll khi Firebase không hoạt động
    pollInterval = window.setInterval(pollUnreadCounts, 30000);
    
    return () => {
      console.log('[Social] Cleaning up Firebase unread counts listener');
      unsubscribe();
      if (pollInterval !== null) {
        window.clearInterval(pollInterval);
      }
    };
  }, [meId, firebaseReady]);

  useFirebaseRealtime(realtimeUserId, {

    onPresence: (p) => {

      console.log('[Social] Presence update received:', p, 'online:', p.online, 'type of userId:', typeof p.userId);

      setFriends(prev => {

        const updated = prev.map(f => {

          const friendId = Number(f.id);

          const match = friendId === p.userId;

          if (match) {

            const newOnlineStatus = !!p.online;

            if (f.isOnline !== newOnlineStatus) {
              console.log('[Social] Updating friend presence', friendId, 'from', f.isOnline, 'to', newOnlineStatus);
            }

            return { ...f, isOnline: newOnlineStatus };

          }

          return f;

        });

        console.log('[Social] Updated friends list:', updated.map(f => ({ id: f.id, isOnline: f.isOnline })));

        return updated;

      });

    },

    onNotification: (n: FBNotificationDTO) => {
      console.log('🔔 [DEBUG] Notification received:', { 
        type: n?.type, 
        senderId: n?.senderId, 
        senderName: n?.senderName,
        body: n?.body,
        read: n?.read 
      });

      if (!n.read) {
        setUnreadNotificationsCount(prev => prev + 1);
      }

      try {

        if (n?.type === 'MESSAGE') {
          // Không đếm unreadByFriend từ notification nữa
          // Unread count sẽ được đếm từ Firebase messages để tránh đếm trùng
          // Chỉ hiển thị bubble notification
          pushBubble(`${n.senderName || 'Someone'}: ${n.body || 'New message'}`, "info", n.senderName || 'Someone', n.senderAvatar ?? null);

        } else if (n?.type === 'SHARE') {

          const title = n?.metadata?.playlistName || n?.metadata?.songName || n?.metadata?.albumName || n?.title || 'Shared content';

          pushBubble(`${n.senderName || 'Someone'} shared: ${title}`, "info", n.senderName || 'Someone', n.senderAvatar ?? null);

          // Also reflect the share inside the chat thread for the receiver

            const sid = n.senderId;

          if (sid && meId) {
              const friendKey = String(sid);

              const m = n.metadata as { playlistId?: number; songId?: number; albumId?: number } | undefined;

            

            void (async () => {
              try {
                const history = await chatApi.getHistory(meId, sid);
                const latestShare = history.find(msg => {
                  if (m?.playlistId && msg.sharedContentType === 'PLAYLIST' && msg.sharedContentId === m.playlistId) return true;
                  if (m?.albumId && msg.sharedContentType === 'ALBUM' && msg.sharedContentId === m.albumId) return true;
                  if (m?.songId && msg.sharedContentType === 'SONG' && msg.sharedContentId === m.songId) return true;
                  return false;
                });
                
                if (latestShare) {
                  const normalized = {
                    ...latestShare,
                    contentPlain: latestShare.contentPlain ?? (typeof latestShare.content === "string" ? latestShare.content : undefined),
                  };
                  const parsed = parseIncomingContent(normalized, friends);
                  setChatByFriend(prev => {
                    const existing = prev[friendKey] || [];
                    const existingIds = new Set(existing.map(m => m.id));
                    if (!existingIds.has(parsed.id)) {
                      return { ...prev, [friendKey]: [...existing, parsed] };
                    }
                    return prev;
                  });
                  return;
                }
              } catch { /* fallback to creating message from metadata */ }
              

              let msgType: "text" | "song" | "playlist" | "album" = 'text';
              if (m?.playlistId) msgType = 'playlist';
              else if (m?.albumId) msgType = 'album';
              else if (m?.songId) msgType = 'song';
              
              const sentAt = Date.now();
              const msg: Message = {

                id: `${sentAt}`,
                sender: n.senderName || `User ${sid}`,

                content: title,
                timestamp: new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sentAt,
                type: msgType,
                ...(msgType === 'playlist' && m?.playlistId ? { 
                  playlistData: { id: m.playlistId, name: title, coverUrl: null } 
                } : {}),
                ...(msgType === 'album' && m?.albumId ? { 
                  albumData: { id: m.albumId, name: title, coverUrl: null } 
                } : {}),
                ...(msgType === 'song' && m?.songId ? { 
                  songData: { id: m.songId, title, artist: '' } 
                } : {}),
              };

              setChatByFriend(prev => ({ ...prev, [friendKey]: [...(prev[friendKey] || []), msg] }));

            })();
            }

        } else if (n?.type === 'INVITE') {
          const playlistName = n?.metadata?.playlistName || n?.body?.match(/playlist[:\s]+([^,]+)/i)?.[1] || 'playlist';
          pushBubble(`${n.senderName || 'Someone'} mời bạn cộng tác: ${playlistName}`, "info", n.senderName || 'Someone', n.senderAvatar ?? null);

          loadCollabInvites().catch(() => { void 0; });
          
        } else if (n?.type === 'INVITE_ACCEPTED') {
          const playlistName = n?.metadata?.playlistName || n?.body?.match(/playlist[:\s]+([^,]+)/i)?.[1] || 'playlist';
          pushBubble(`${n.senderName || 'Someone'} đã chấp nhận lời mời cộng tác: ${playlistName}`, "success", n.senderName || 'Someone', n.senderAvatar ?? null);
          
          // Refresh collaborators nếu đang ở trang playlist detail
          window.dispatchEvent(new CustomEvent('app:collab-invite-accepted', { detail: { playlistId: n?.metadata?.playlistId } }));
          
        } else if (n?.type === 'INVITE_REJECTED') {
          const playlistName = n?.metadata?.playlistName || n?.body?.match(/playlist[:\s]+([^,]+)/i)?.[1] || 'playlist';
          pushBubble(`${n.senderName || 'Someone'} đã từ chối lời mời cộng tác: ${playlistName}`, "info", n.senderName || 'Someone', n.senderAvatar ?? null);

        } else if (n?.type === 'FRIEND_REQUEST') {
          console.log('🔔 [DEBUG] FRIEND_REQUEST notification received:', {
            senderId: n.senderId,
            senderName: n.senderName,
            body: n.body
          });

          pushBubble(`${n.senderName || 'Someone'} sent you a friend request`, "info", n.senderName || 'Someone', n.senderAvatar ?? null);

          loadPending().catch(() => { void 0; });

        } else if (n?.type === 'FRIEND_REQUEST_ACCEPTED') {
          console.log('🔔 [DEBUG] FRIEND_REQUEST_ACCEPTED notification received:', {
            senderId: n.senderId,
            senderName: n.senderName,
            body: n.body
          });

          pushBubble(`${n.senderName || 'Someone'} accepted your friend request`, "success", n.senderName || 'Someone', n.senderAvatar ?? null);

          loadFriends().catch(() => { void 0; });

        }

      } catch { void 0; }

    },

    friends: friendIds

  });

  useEffect(() => {
    if (!meId || !firebaseReady) {
      Object.values(chatWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      chatWatchersRef.current = {};
      return;
    }

    const friendKeys = friends.map((friend) => friend.id).filter((id): id is string => typeof id === "string");
    const friendKeySet = new Set(friendKeys);

    Object.entries(chatWatchersRef.current).forEach(([friendId, unsubscribe]) => {
      if (!friendKeySet.has(friendId)) {
        unsubscribe();
        delete chatWatchersRef.current[friendId];
      }
    });

    friendKeys.forEach((friendId) => {
      if (chatWatchersRef.current[friendId]) return;
      const friendNumericId = Number(friendId);
      if (!Number.isFinite(friendNumericId)) return;
      const unsubscribe = watchChatMessages(meId, friendNumericId, (messages) => {
        // Use ref to avoid re-subscribing when mergeFirebaseMessages changes
        if (mergeFirebaseMessagesRef.current) {
          mergeFirebaseMessagesRef.current(friendId, messages);
        }
      });
      chatWatchersRef.current[friendId] = unsubscribe;
    });

    return () => {
      Object.values(chatWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      chatWatchersRef.current = {};
    };
  }, [meId, firebaseReady, friendsIdsString, mergeFirebaseMessages]); // include mergeFirebaseMessages to ensure watcher callbacks active

  // Watch messages for playlist rooms when selectedChat is a playlist room
  useEffect(() => {
    if (!meId || !firebaseReady || !selectedChat || !selectedChat.startsWith("pl_")) {
      // Cleanup playlist room watcher if exists
      if (chatWatchersRef.current[selectedChat || ""] && selectedChat && !selectedChat.startsWith("pl_")) {
        chatWatchersRef.current[selectedChat]();
        delete chatWatchersRef.current[selectedChat];
      }
      return;
    }

    const roomId = selectedChat; // pl_{playlistId}
    if (chatWatchersRef.current[roomId]) return; // Already watching

    console.log('[Social] Setting up playlist room message watcher for:', roomId);
    const unsubscribe = watchChatMessagesForRoom(roomId, (messages) => {
      if (mergeFirebaseMessagesRef.current) {
        mergeFirebaseMessagesRef.current(roomId, messages);
      }
    });
    chatWatchersRef.current[roomId] = unsubscribe;

    return () => {
      if (chatWatchersRef.current[roomId]) {
        chatWatchersRef.current[roomId]();
        delete chatWatchersRef.current[roomId];
      }
    };
  }, [meId, firebaseReady, selectedChat, mergeFirebaseMessages]);

  useEffect(() => {
    if (!meId || !firebaseReady) {
      Object.values(typingWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      typingWatchersRef.current = {};
      setTypingByFriend({});
      return;
    }

    const friendKeys = friends.map((friend) => friend.id).filter((id): id is string => typeof id === "string");
    const friendKeySet = new Set(friendKeys);

    Object.entries(typingWatchersRef.current).forEach(([friendId, unsubscribe]) => {
      if (!friendKeySet.has(friendId)) {
        unsubscribe();
        delete typingWatchersRef.current[friendId];
        setTypingByFriend((prev) => {
          if (!(friendId in prev)) return prev;
          const { [friendId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    });

    friendKeys.forEach((friendId) => {
      if (typingWatchersRef.current[friendId]) return;
      const numericFriendId = Number(friendId);
      if (!Number.isFinite(numericFriendId)) return;
      const roomId = meId ? getChatRoomKey(meId, numericFriendId) : null;
      if (!roomId) return;
      const unsubscribe = watchTyping(roomId, numericFriendId, (data) => {
        if (!data) {
          setTypingByFriend((prev) => {
            if (!(friendId in prev) || !prev[friendId]) return prev;
            const { [friendId]: _removed, ...rest } = prev;
            return rest;
          });
          return;
        }
        // Check TTL: if updatedAt exists and is older than 5s, consider not typing
        const now = Date.now();
        const updatedAt = data.updatedAt;
        const isTyping = Boolean(data.isTyping) && (!updatedAt || (now - updatedAt < 5000));
        console.log('[Social] Typing status update:', { friendId, roomId, isTyping, updatedAt, now, ttl: updatedAt ? (now - updatedAt) : 'N/A' });
        setTypingByFriend((prev) => {
          if (prev[friendId] === isTyping) return prev;
          return { ...prev, [friendId]: isTyping };
        });
      });
      typingWatchersRef.current[friendId] = () => {
        unsubscribe();
        setTypingByFriend((prev) => {
          if (!(friendId in prev)) return prev;
          const { [friendId]: _removed, ...rest } = prev;
          return rest;
        });
      };
    });

    return () => {
      Object.values(typingWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      typingWatchersRef.current = {};
      setTypingByFriend({});
    };
  }, [meId, firebaseReady, friendsIdsString]);

  // Cleanup typing when selectedChat changes or component unmounts
  useEffect(() => {
    if (!meId || !firebaseReady || !selectedChat) {
      if (typingStartTimeoutRef.current) {
        clearTimeout(typingStartTimeoutRef.current);
        typingStartTimeoutRef.current = null;
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      if (typingStatusRef.current.active && typingStatusRef.current.roomId) {
        const roomId = typingStatusRef.current.roomId;
        typingStatusRef.current = { roomId: null, active: false };
        if (meId) {
          void chatApi.typingStop(roomId, meId).catch(() => {});
        }
      }
      return;
    }

    // Cleanup on selectedChat change
    return () => {
      if (typingStartTimeoutRef.current) {
        clearTimeout(typingStartTimeoutRef.current);
        typingStartTimeoutRef.current = null;
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      if (typingStatusRef.current.active && typingStatusRef.current.roomId) {
        const roomId = typingStatusRef.current.roomId;
        typingStatusRef.current = { roomId: null, active: false };
        if (meId) {
          void chatApi.typingStop(roomId, meId).catch(() => {});
        }
      }
    };
  }, [meId, firebaseReady, selectedChat]);

  // Handle typing indicator with debounce (separate from newMessage useEffect)
  useEffect(() => {
    if (!meId || !firebaseReady || !selectedChat) return;

    // Xử lý playlist rooms (pl_{playlistId})
    let roomId: string | null = null;
    if (selectedChat.startsWith("pl_")) {
      roomId = selectedChat; // pl_{playlistId}
    } else {
      // Xử lý 1-1 chat
      const friendNumericId = Number(selectedChat);
      if (!Number.isFinite(friendNumericId)) return;
      roomId = getChatRoomKey(meId, friendNumericId);
    }
    
    if (!roomId) return;
    const trimmed = newMessage.trim();

    const stopTyping = () => {
      if (!typingStatusRef.current.active || typingStatusRef.current.roomId !== roomId) {
        return;
      }
      typingStatusRef.current = { roomId: null, active: false };
      if (meId && firebaseReady) {
        console.log('[Social] Stopping typing indicator:', { roomId, meId });
        void chatApi.typingStop(roomId, meId).catch((error) => {
          console.warn("[Social] Failed to stop typing indicator", error?.message || error);
      });
      }
    };

    // Clear previous debounce
    if (typingDebounceTimeoutRef.current) {
      clearTimeout(typingDebounceTimeoutRef.current);
      typingDebounceTimeoutRef.current = null;
      }

    if (trimmed.length > 0) {
      // Debounce 400ms before starting typing
      typingDebounceTimeoutRef.current = window.setTimeout(() => {
        if (!typingStatusRef.current.active || typingStatusRef.current.roomId !== roomId) {
          typingStatusRef.current = { roomId, active: true };
          if (meId && firebaseReady) {
            console.log('[Social] Starting typing indicator:', { roomId, meId });
            void chatApi.typingStart(roomId, meId).catch((error) => {
              console.warn("[Social] Failed to start typing indicator", error?.message || error);
          });
          }
        }
        typingDebounceTimeoutRef.current = null;
      }, 400); // ✅ Debounce 400ms to prevent spam
      
      // Auto stop after 2s of no typing
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      typingStopTimeoutRef.current = window.setTimeout(() => {
        stopTyping();
        typingStopTimeoutRef.current = null;
      }, 2000); // ✅ 2 giây sau khi ngưng nhập
    } else {
      // Input is empty, stop typing immediately
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      stopTyping();
    }

    return () => {
      if (typingDebounceTimeoutRef.current) {
        clearTimeout(typingDebounceTimeoutRef.current);
        typingDebounceTimeoutRef.current = null;
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
    };
  }, [meId, firebaseReady, selectedChat, newMessage]);

  // Watch messageIndex to map messageId -> firebaseKey
  useEffect(() => {
    if (!meId || !firebaseReady || !selectedChat) {
      setMessageIndexByRoom(prev => {
        // Xử lý cleanup cho cả playlist rooms và 1-1 chat
        if (selectedChat && selectedChat.startsWith("pl_")) {
          const { [selectedChat]: _removed, ...rest } = prev;
          return rest;
        }
        const friendNumericId = Number(selectedChat);
        if (!Number.isFinite(friendNumericId)) return prev;
        const roomId = getChatRoomKey(meId, friendNumericId);
        const { [roomId]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    // Xử lý playlist rooms (pl_{playlistId})
    let roomId: string | null = null;
    if (selectedChat.startsWith("pl_")) {
      roomId = selectedChat; // pl_{playlistId}
    } else {
      // Xử lý 1-1 chat
      const friendNumericId = Number(selectedChat);
      if (!Number.isFinite(friendNumericId)) return;
      roomId = getChatRoomKey(meId, friendNumericId);
    }

    if (!roomId) return;
    console.log('[Social] Setting up messageIndex watcher for room:', roomId);

    const unsubscribe = watchMessageIndex(roomId, (index) => {
      console.log('[Social] MessageIndex received:', { roomId, index });
      setMessageIndexByRoom(prev => ({ ...prev, [roomId]: index }));
      
      // Update messages with firebaseKey from index
      setChatByFriend(prev => {
        const messages = prev[selectedChat] || [];
        const updated = messages.map(msg => {
          if (msg.firebaseKey) return msg; // Already has firebaseKey
          const messageId = msg.backendId || (msg.id && !msg.id.startsWith('temp-') ? Number(msg.id) : null);
          if (messageId && Number.isFinite(messageId)) {
            const firebaseKey = index[String(messageId)];
            if (firebaseKey) {
              console.log('[Social] Mapped firebaseKey for message:', { messageId, firebaseKey, msgId: msg.id });
              return { ...msg, firebaseKey };
            }
          }
          return msg;
        });
        if (updated.some((m, i) => m.firebaseKey !== messages[i]?.firebaseKey)) {
          return { ...prev, [selectedChat]: updated };
        }
        return prev;
      });
    });

    return () => {
      unsubscribe();
      setMessageIndexByRoom(prev => {
        const { [roomId]: _removed, ...rest } = prev;
        return rest;
      });
    };
  }, [meId, firebaseReady, selectedChat]);

  // Watch reactions for selected chat
  useEffect(() => {
    if (!meId || !firebaseReady || !selectedChat) {
      if (reactionsWatcherRef.current) {
        reactionsWatcherRef.current();
        reactionsWatcherRef.current = null;
      }
      setReactionsByMessage({});
      return;
    }

    // Xử lý playlist rooms (pl_{playlistId})
    let roomId: string | null = null;
    if (selectedChat.startsWith("pl_")) {
      roomId = selectedChat; // pl_{playlistId}
    } else {
      // Xử lý 1-1 chat
      const friendNumericId = Number(selectedChat);
      if (!Number.isFinite(friendNumericId)) return;
      roomId = getChatRoomKey(meId, friendNumericId);
    }

    if (!roomId) return;
    console.log('[Social] Setting up reactions watcher for room:', roomId);

    const unsubscribe = watchReactions(roomId, (reactions) => {
      console.log('[Social] Firebase reactions received:', { roomId, reactionsCount: Object.keys(reactions).length, reactions });
      const parsed: Record<string, MessageReactionSummary[]> = {};
      Object.entries(reactions).forEach(([firebaseKey, userReactions]) => {
        if (!userReactions || typeof userReactions !== 'object') {
          console.warn('[Social] Invalid userReactions for key:', firebaseKey, userReactions);
          return;
        }
        const grouped = new Map<string, { count: number; userIds: Set<number> }>();
        Object.entries(userReactions).forEach(([userIdStr, reaction]) => {
          if (!reaction || typeof reaction !== 'object') {
            console.warn('[Social] Invalid reaction for userId:', userIdStr, reaction);
            return;
          }
          const emoji = decodeUnicodeEscapes(reaction.emoji);
          const userId = Number(userIdStr);
          if (!emoji || !Number.isFinite(userId)) {
            console.warn('[Social] Invalid emoji or userId:', { emoji, userId, userIdStr, reaction });
            return;
          }
          if (!grouped.has(emoji)) {
            grouped.set(emoji, { count: 0, userIds: new Set() });
          }
          const group = grouped.get(emoji)!;
          group.count++;
          group.userIds.add(userId);
        });
        const reactionsList = Array.from(grouped.entries()).map(([emoji, { count, userIds }]) => ({
          emoji,
          count,
          reactedByMe: userIds.has(meId),
        }));
        // Store with both the original key (could be messageId number or firebaseKey string)
        // and also as string version for lookup
        parsed[firebaseKey] = reactionsList;
        // If key is a number (messageId), also store as string for easier lookup
        const numericKey = Number(firebaseKey);
        if (Number.isFinite(numericKey) && String(numericKey) !== firebaseKey) {
          parsed[String(numericKey)] = reactionsList;
        }
        console.log('[Social] Parsed reactions for key:', firebaseKey, reactionsList);
      });
      console.log('[Social] All parsed reactions:', parsed);
      setReactionsByMessage(parsed);
    });

    reactionsWatcherRef.current = unsubscribe;

    return () => {
      console.log('[Social] Cleaning up reactions watcher for room:', roomId);
      if (reactionsWatcherRef.current) {
        reactionsWatcherRef.current();
        reactionsWatcherRef.current = null;
      }
      setReactionsByMessage({});
    };
  }, [meId, firebaseReady, selectedChat]);

  // Update messages with firebaseKey when messageIndex changes
  useEffect(() => {
    if (!selectedChat) return;
    
    // Xử lý playlist rooms (pl_{playlistId})
    let roomId: string | null = null;
    if (selectedChat.startsWith("pl_")) {
      roomId = selectedChat; // pl_{playlistId}
    } else {
      // Xử lý 1-1 chat
      const friendNumericId = Number(selectedChat);
      if (!Number.isFinite(friendNumericId)) return;
      roomId = getChatRoomKey(meId, friendNumericId);
    }
    
    if (!roomId) return;
    const messageIndex = messageIndexByRoom[roomId];
    if (!messageIndex || Object.keys(messageIndex).length === 0) return;

    setChatByFriend(prev => {
      const messages = prev[selectedChat] || [];
      const updated = messages.map(msg => {
        if (msg.firebaseKey) return msg; // Already has firebaseKey
        const messageId = msg.backendId || (msg.id && !msg.id.startsWith('temp-') ? Number(msg.id) : null);
        if (messageId && Number.isFinite(messageId)) {
          const firebaseKey = messageIndex[String(messageId)];
          if (firebaseKey) {
            console.log('[Social] Updated firebaseKey for message from index:', { messageId, firebaseKey, msgId: msg.id });
            return { ...msg, firebaseKey };
          }
        }
        return msg;
      });
      // Only update if something changed
      if (updated.some((m, i) => m.firebaseKey !== messages[i]?.firebaseKey)) {
        return { ...prev, [selectedChat]: updated };
      }
      return prev;
    });
  }, [meId, selectedChat, messageIndexByRoom]);

  // Handler for reaction toggle
  const handleDeleteMessage = useCallback(
    async (message: Message): Promise<boolean> => {
      if (!meId) return false;
      
      // Find messageId from message
      const messageIdFromBackend = message.backendId;
      const messageIdStr = message.id;
      const derivedMessageId =
        messageIdFromBackend ??
        (messageIdStr && !messageIdStr.startsWith('temp-') ? Number(messageIdStr) : null);
      
      if (!derivedMessageId || !Number.isFinite(derivedMessageId)) {
        console.warn('[Social] Cannot recall: message ID is invalid', {
          messageIdStr,
          backendId: messageIdFromBackend,
        });
        toast.error("Không thể thu hồi tin nhắn: ID không hợp lệ");
        return false;
      }

      try {
        await chatApi.deleteMessage(derivedMessageId, meId);
        
        // Remove message from local state
        if (selectedChat) {
          setChatByFriend(prev => {
            const friendMessages = prev[selectedChat] || [];
            return {
              ...prev,
              [selectedChat]: friendMessages.filter(m => m.id !== message.id && m.backendId !== derivedMessageId)
            };
          });
        }
        
        toast.success("Đã thu hồi tin nhắn");
        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Không thể thu hồi tin nhắn";
        console.error('[Social] Failed to recall message:', error);
        toast.error(errorMsg);
        return false;
      }
    },
    [meId, selectedChat]
  );

  const handleReact = useCallback(
    async (message: Message, emoji: string) => {
      if (!meId || !selectedChat) return;
      if (message.type === "system") return;

      // Find messageId from message (could be in id or firebaseKey)
      const messageIdFromBackend = message.backendId;
      const messageIdStr = message.id;
      const derivedMessageId =
        messageIdFromBackend ??
        (messageIdStr && !messageIdStr.startsWith('temp-') ? Number(messageIdStr) : null);
      if (!derivedMessageId || !Number.isFinite(derivedMessageId)) {
        console.warn('[Social] Cannot react: message ID is invalid', {
          messageIdStr,
          backendId: messageIdFromBackend,
        });
        return;
      }

      const normalizedEmoji = decodeUnicodeEscapes(emoji).trim();

      try {
        // Try multiple keys to find existing reactions
        const firebaseKey = message.firebaseKey;
        const messageIdKey = String(derivedMessageId);
        const existingReactions = 
          reactionsByMessage[firebaseKey || ''] || 
          reactionsByMessage[messageIdKey] || 
          reactionsByMessage[messageIdStr] || 
          [];
        const myReaction = existingReactions.find((r) => r.reactedByMe);
        const isSameEmoji = myReaction?.emoji === normalizedEmoji;
        
        console.log('[Social] Toggling reaction:', { 
          messageId: derivedMessageId, 
          emoji: normalizedEmoji, 
          firebaseKey, 
          messageIdStr, 
          hasReaction: !!myReaction,
          isSameEmoji,
          existingReactions
        });
        
        if (isSameEmoji) {
          // Remove reaction if clicking the same emoji
          await chatApi.removeReaction(derivedMessageId, meId);
          console.log('[Social] Reaction removed successfully');
          // Optimistically update UI
          const key = firebaseKey || messageIdKey || messageIdStr;
          setReactionsByMessage(prev => {
            const msgReactions = prev[firebaseKey || ''] || prev[messageIdKey] || prev[messageIdStr] || [];
            const updated = msgReactions
              .map(r => r.emoji === normalizedEmoji ? { ...r, count: Math.max(0, r.count - 1), reactedByMe: false } : r)
              .filter(r => r.count > 0 || r.emoji !== normalizedEmoji);
            const result = { ...prev };
            if (firebaseKey) result[firebaseKey] = updated;
            if (messageIdKey) result[messageIdKey] = updated;
            if (messageIdStr) result[messageIdStr] = updated;
            return result;
          });
        } else {
          // If user has another reaction, remove it first, then add new one
          if (myReaction) {
            await chatApi.removeReaction(derivedMessageId, meId);
          }
          // Add new reaction
          await chatApi.toggleReaction(derivedMessageId, normalizedEmoji, meId);
          console.log('[Social] Reaction added successfully');
          // Optimistically update UI
          const key = firebaseKey || messageIdKey || messageIdStr;
          setReactionsByMessage(prev => {
            const msgReactions = prev[firebaseKey || ''] || prev[messageIdKey] || prev[messageIdStr] || [];
            // Remove old reaction if exists
            const withoutOld = myReaction 
              ? msgReactions
                  .map(r => r.emoji === myReaction.emoji ? { ...r, count: Math.max(0, r.count - 1), reactedByMe: false } : r)
                  .filter(r => r.count > 0 || r.emoji !== myReaction.emoji)
              : msgReactions;
            // Add or update new reaction
            const existing = withoutOld.find(r => r.emoji === normalizedEmoji);
            const updated = existing
              ? withoutOld.map(r => 
                  r.emoji === normalizedEmoji ? { ...r, count: r.count + 1, reactedByMe: true } : r
                )
              : [...withoutOld, { emoji: normalizedEmoji, count: 1, reactedByMe: true }];
            const result = { ...prev };
            if (firebaseKey) result[firebaseKey] = updated;
            if (messageIdKey) result[messageIdKey] = updated;
            if (messageIdStr) result[messageIdStr] = updated;
            return result;
          });
        }
      } catch (error) {
        console.error('[Social] Failed to toggle reaction:', error);
        pushBubble('Failed to react to message', 'error');
      }
    },
    [meId, selectedChat, reactionsByMessage, pushBubble]
  );

  // Note: unreadMessagesCount is now managed by Firebase listener (watchAllRoomUnreadCounts)
  // No need to calculate from unreadByFriend




  useEffect(() => {

    (async () => {

      try {

        if (!friends.length || !meId) return;

        const ids = friends.map(f => f.id).join(',');

        const base = envVars.VITE_API_BASE_URL || '';

        const res = await fetch(`${base}/api/presence/status?userIds=${encodeURIComponent(ids)}`, { headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } });

        const map = await res.json();

        setFriends(prev => prev.map(f => ({ ...f, isOnline: !!map[String(f.id)] })));


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

        const now = Date.now();
        const baseMsg = {
          id: `${now}`,
          sender: 'You',
          timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sentAt: now,
        };
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
      // Lấy thông tin invite trước khi accept để hiển thị message chi tiết
      const invite = collabInvites.find(inv => inv.id === inviteId);
      const playlistName = invite?.playlist?.name || invite?.playlistName || 'playlist';

      await playlistCollabInvitesApi.accept(inviteId);

      pushBubble(`Đã chấp nhận lời mời cộng tác: ${playlistName}`, 'success');

      setExpandedInviteId(prev => (prev === inviteId ? null : prev));

      await loadCollabInvites();

      // Dispatch event để refresh collaborators trong PlaylistDetail
      window.dispatchEvent(new CustomEvent('app:collab-invite-accepted', { detail: { inviteId, playlistId: invite?.playlistId } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      pushBubble(msg || 'Không thể chấp nhận lời mời', 'error');
    }
  };



  const handleRejectCollabInvite = async (inviteId: number) => {
    try {
      // Lấy thông tin invite trước khi reject để hiển thị message chi tiết
      const invite = collabInvites.find(inv => inv.id === inviteId);
      const playlistName = invite?.playlist?.name || invite?.playlistName || 'playlist';

      await playlistCollabInvitesApi.reject(inviteId);

      pushBubble(`Đã từ chối lời mời cộng tác: ${playlistName}`, 'info');

      setExpandedInviteId(prev => (prev === inviteId ? null : prev));

      await loadCollabInvites();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      pushBubble(msg || 'Không thể từ chối lời mời', 'error');
    }
  };



  // ✅ Load chat history only once when selectedChat changes (no polling - Firebase handles realtime)
  useEffect(() => {
    if (!meId || !selectedChat || activeTab !== 'chat') {
      // Reset loaded history khi không có selectedChat
      if (!selectedChat) {
        loadedHistoryRef.current.clear();
      }
      return;
    }

    // ✅ Check đã load history cho chat này chưa
    const historyKey = `${meId}-${selectedChat}`;
    if (loadedHistoryRef.current.has(historyKey)) {
      console.log('📖 [Social] History already loaded for this chat, skipping:', historyKey);
      return;
    }

    let cancelled = false;

    const mergeHistory = (historyMessages: Message[]) => {
      setChatByFriend(prev => {
        const existing = prev[selectedChat] || [];
        const historyIds = new Set(historyMessages.map(m => m.id));
        const friendNumericId = Number(selectedChat);
        const roomId = Number.isFinite(friendNumericId) ? getChatRoomKey(meId, friendNumericId) : null;
        // Ensure messageIndex is always an object, never undefined
        const messageIndex = (roomId && messageIndexByRoom[roomId]) ? messageIndexByRoom[roomId] : {};
        
        // Create maps for efficient lookup
        const existingMap = new Map<string, Message>();
        const existingByBackendId = new Map<number, Message>();
        existing.forEach(msg => {
          if (msg.id) existingMap.set(msg.id, msg);
          if (msg.backendId) existingByBackendId.set(msg.backendId, msg);
        });
        // Merge history messages, preserving firebaseKey from existing or messageIndex
        const merged = historyMessages.map(historyMsg => {
          // Try to find existing message by id first
          const existingMsg = existingMap.get(historyMsg.id);
          if (existingMsg?.firebaseKey && !historyMsg.firebaseKey) {
            return { ...historyMsg, firebaseKey: existingMsg.firebaseKey };
          }
          // Try to find by backendId if available
          if (historyMsg.backendId) {
            const existingByBackend = existingByBackendId.get(historyMsg.backendId);
            if (existingByBackend?.firebaseKey && !historyMsg.firebaseKey) {
              return { ...historyMsg, firebaseKey: existingByBackend.firebaseKey };
            }
            // Try to get firebaseKey from messageIndex (only if messageIndex is an object)
            if (messageIndex && typeof messageIndex === 'object') {
              const firebaseKeyFromIndex = messageIndex[String(historyMsg.backendId)];
              if (firebaseKeyFromIndex && !historyMsg.firebaseKey) {
                console.log('[Social] Mapped firebaseKey from messageIndex:', { messageId: historyMsg.backendId, firebaseKey: firebaseKeyFromIndex });
                return { ...historyMsg, firebaseKey: firebaseKeyFromIndex };
              }
            }
          }
          // Fallback: try to get from messageId if it's a number
          const messageIdNum = historyMsg.id && !historyMsg.id.startsWith('temp-') ? Number(historyMsg.id) : null;
          if (messageIdNum && Number.isFinite(messageIdNum) && messageIndex && typeof messageIndex === 'object') {
            const firebaseKeyFromIndex = messageIndex[String(messageIdNum)];
            if (firebaseKeyFromIndex && !historyMsg.firebaseKey) {
              console.log('[Social] Mapped firebaseKey from messageIndex (fallback):', { messageId: messageIdNum, firebaseKey: firebaseKeyFromIndex });
              return { ...historyMsg, firebaseKey: firebaseKeyFromIndex };
            }
          }
          return historyMsg;
        });
        // Add temp messages and system messages that aren't in history
        // System messages don't have backendId and aren't in database, so preserve them from Firebase
        existing.forEach(msg => {
          const isTemp = msg.id?.startsWith('temp-');
          const isSystem = msg.type === "system" || (!msg.backendId && !isTemp && !msg.id?.startsWith('temp-'));
          if ((isTemp || isSystem) && !historyIds.has(msg.id)) {
            merged.push(msg);
          }
        });
        const sortedMerged = sortMessagesChronologically(merged);
        const unchanged =
          existing.length === sortedMerged.length &&
          existing.every((msg, idx) => {
            const next = sortedMerged[idx];
            if (!next) return false;
            if (msg.id !== next.id) return false;
            if (msg.content !== next.content) return false;
            if (msg.type !== next.type) return false;
            const msgSongId = msg.songData?.id ?? null;
            const nextSongId = next.songData?.id ?? null;
            if (msgSongId !== nextSongId) return false;
            return true;
          });
        if (unchanged) return prev;
        
        return { ...prev, [selectedChat]: sortedMerged };
      });
    };

    const fetchHistory = async () => {
      try {
        // Playlist rooms không có history API, chỉ có messages từ Firebase
        if (selectedChat.startsWith("pl_")) {
          console.log('📖 [Social] Skipping history load for playlist room:', selectedChat);
          loadedHistoryRef.current.add(historyKey);
          return;
        }

        console.log('📖 [Social] Loading chat history (initial load only):', { meId, selectedChat });
        const history = await chatApi.getHistory(meId, Number(selectedChat));
        console.log('📖 [Social] Chat history loaded:', { count: history.length, selectedChat });
        const normalizedHistory = history.map((h) => ({
          ...h,
          contentPlain: h.contentPlain ?? (typeof h.content === "string" ? h.content : undefined),
        }));
        
        const mapped = sortMessagesChronologically(
          normalizedHistory.map(h => parseIncomingContent(h, friendsRef.current))
        );
        if (!cancelled) {
          mergeHistory(mapped);
          // ✅ Mark đã load history cho chat này
          loadedHistoryRef.current.add(historyKey);
          // ✅ NOTE: markConversationAsRead is NOT called here - only when user explicitly clicks on a friend
          console.log('📖 [Social] History merged, NOT marking as read (only mark when user clicks)');
        }
      } catch (error) {
          console.error('[Social] Failed to load chat history:', error);
        // Không mark là đã load nếu lỗi, để có thể retry
      }
    };

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [meId, selectedChat, activeTab]); // ✅ Removed messageIndexByRoom from dependencies - chỉ load khi selectedChat thay đổi



  const handleSendMessage = async () => {
    const rawInput = newMessage.trim();
    if (!rawInput || !selectedChat || !meId) return;

    // Xử lý playlist room chat (pl_{playlistId})
    if (selectedChat.startsWith("pl_")) {
      const playlistId = Number(selectedChat.replace("pl_", ""));
      if (!Number.isFinite(playlistId)) {
        console.warn("[Social] Cannot resolve playlist id for chat:", selectedChat);
        return;
      }

      const decodedContent = decodeUnicodeEscapes(rawInput);
      const messageContent = decodedContent || rawInput;

      // Optimistic update
      const now = Date.now();
      const optimisticMsg: Message = {
        id: `temp-${now}`,
        sender: "You",
        content: messageContent,
        timestamp: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sentAt: now,
        type: "text",
      };

      setChatByFriend((prev) => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), optimisticMsg] }));
      setNewMessage("");

      try {
        await playlistChatApi.sendText(playlistId, meId, messageContent);
        console.log("[Social] Playlist message sent successfully");
        // Message sẽ được cập nhật từ Firebase listener
      } catch (error) {
        console.error("[Social] Failed to send playlist message:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Remove optimistic message on error
        setChatByFriend((prev) => ({
          ...prev,
          [selectedChat]: prev[selectedChat]?.filter((m) => m.id !== optimisticMsg.id) || [],
        }));
        // Hiển thị error từ backend (có thể là group chat bị khóa hoặc playlist đã bị xóa)
        pushBubble(errorMessage || "Không thể gửi tin nhắn. Group chat có thể đã bị khóa hoặc playlist đã bị xóa.", "error");
      }
      return;
    }

    // Xử lý 1-1 chat (friend)
    const friend = friends.find((f) => f.id === selectedChat);
    const receiverSource = friend?.friendUserId ?? selectedChat;
    const receiverId = Number(receiverSource);
    if (!Number.isFinite(receiverId)) {
      console.warn("[Social] Cannot resolve receiver id for chat:", selectedChat);
      return;
    }

    // Calculate friendKeyForStreak the same way as selectedFriendUserKey in ChatArea.tsx
    // This ensures the event friendId matches the useStreakManager friendId
    const friendKeyForStreak = friend?.friendUserId ? String(friend.friendUserId) : String(receiverId);
    const decodedContent = decodeUnicodeEscapes(rawInput);
    const messageContent = decodedContent || rawInput;

    // Optimistic update so the UI feels instant
    const now = Date.now();
    const optimisticMsg: Message = {
      id: `temp-${now}`,
      sender: "You",
      content: messageContent,
      timestamp: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sentAt: now,
      type: "text",
    };

    setChatByFriend((prev) => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), optimisticMsg] }));
    setNewMessage("");

    try {
      const result = await chatApi.sendMessage(meId, receiverId, messageContent);
      console.log("[Social] Message sent result:", result);

      if (result && typeof result === "object" && "id" in result) {
        const normalizedResult = {
          ...result,
          contentPlain: result.contentPlain ?? (typeof result.content === "string" ? result.content : undefined),
        };

        const parsed = parseIncomingContent(normalizedResult as ChatMessageDTO, friends);

        setChatByFriend((prev) => ({
          ...prev,
          [selectedChat]:
            prev[selectedChat]?.map((m) => (m.id === optimisticMsg.id ? { ...parsed, id: String(normalizedResult.id) } : m)) ||
            [],
        }));
      }

      try {
        const updatedStreak = await chatStreakApi.increment(receiverId);
        if (updatedStreak && typeof window !== "undefined") {
          const detail: StreakStorageEventDetail = {
            friendId: friendKeyForStreak,
            type: "updated",
            payload: mapDtoToStreakState(updatedStreak),
          };
          console.log("[Social] Streak incremented, dispatching event for friendId:", friendKeyForStreak, "streak:", updatedStreak.streak || updatedStreak.currentStreakCount);
          window.dispatchEvent(new CustomEvent(STREAK_STORAGE_EVENT, { detail }));
        }
      } catch (incrementError) {
        console.warn("[Social] Failed to increment streak:", incrementError);
      }
    } catch (e) {
      console.error("[Social] Failed to send message:", e);
      setChatByFriend((prev) => ({
        ...prev,
        [selectedChat]: prev[selectedChat]?.filter((m) => m.id !== optimisticMsg.id) || [],
      }));
      pushBubble(e instanceof Error ? e.message : "Failed to send message", "error");
      setNewMessage(messageContent);
    }
  };

  const isSelectedFriendTyping = selectedChat ? !!typingByFriend[selectedChat] : false;

  // ✅ Removed debug typing status useEffect - gây spam log

  // Memoize mapped playlist rooms to prevent infinite re-renders
  const mappedPlaylistRooms = useMemo(() => {
    return playlistRooms.map(
      (
        p: PlaylistLibraryItemDTO & {
          playlistId?: number;
          title?: string;
          ownerName?: string;
          owner?: string;
          id?: number;
        }
      ) => {
        const playlistId = typeof p.playlistId === "number" ? p.playlistId : (typeof p.id === "number" ? p.id : 0);
        const memberCount = playlistCollaboratorCounts[playlistId] ?? 1; // Default to 1 if not loaded yet
        return {
          id: playlistId,
          name: p.name ?? p.title ?? `Playlist ${playlistId}`,
          coverUrl: p.coverUrl ?? null,
          ownerName: p.ownerName ?? p.owner ?? null,
          memberCount, // Total members (owner + collaborators)
        };
      }
    );
  }, [playlistRooms, playlistCollaboratorCounts]);

  // ✅ Merge reactions into messages for selected chat - chỉ merge khi reactionsByMessage thay đổi
  const messagesWithReactions = useMemo(() => {
    if (!selectedChat) return chatByFriend;
    const messages = chatByFriend[selectedChat] || [];
    
    // ✅ Chỉ log khi có thay đổi thực sự (không log mỗi lần render)
    const hasReactions = Object.keys(reactionsByMessage).length > 0;
    if (hasReactions && messages.length > 0) {
      console.log('[Social] Merging reactions (snapshot changed):', { 
        messagesCount: messages.length, 
        reactionsKeys: Object.keys(reactionsByMessage).length
      });
    }
    
    return {
      ...chatByFriend,
      [selectedChat]: messages.map((msg) => {
        // Try multiple keys: firebaseKey (priority), messageId (backend), and id
        // Backend stores reactions with firebaseKey (string like "-OeeIuig2tnWwY6vA6bf")
        const firebaseKey = msg.firebaseKey;
        const messageIdKey = msg.backendId ? String(msg.backendId) : null;
        const messageIdNum = msg.backendId || (msg.id && !msg.id.startsWith('temp-') ? Number(msg.id) : null);
        const msgId = msg.id;
        
        // Try all possible keys
        let reactions = reactionsByMessage[firebaseKey || ''] || [];
        if (reactions.length === 0 && messageIdKey) {
          reactions = reactionsByMessage[messageIdKey] || [];
        }
        if (reactions.length === 0 && messageIdNum && Number.isFinite(messageIdNum)) {
          reactions = reactionsByMessage[String(messageIdNum)] || [];
        }
        if (reactions.length === 0 && msgId) {
          reactions = reactionsByMessage[msgId] || [];
        }
        
        return { ...msg, reactions: reactions.length > 0 ? reactions : undefined };
      }),
    };
  }, [chatByFriend, selectedChat, reactionsByMessage]);

  const handleShareCurrentSong = async () => {

    if (!currentSong || !selectedChat || !meId) return;

    const receiverId = Number(selectedChat);
    const now = Date.now();
    const tempId = `temp-share-${now}`;
    const numericSongId = resolveSongNumericId(currentSong);
    const songTitle = resolveSongTitle(currentSong) || "Shared song";
    const songArtist = resolveSongArtist(currentSong) || DEFAULT_ARTIST_NAME;
    const payloadId =
      numericSongId ??
      (currentSong.id && currentSong.id.trim().length > 0 ? currentSong.id : now);

    const optimisticMsg: Message = {
      id: tempId,
      sender: "You",
      content: "Shared a song",
      timestamp: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sentAt: now,
      type: "song",
      songData: { id: payloadId, title: songTitle, artist: songArtist }
    };

    setChatByFriend(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), optimisticMsg]
    }));

    try {
      if (numericSongId != null) {
        const result = await chatApi.shareSong(meId, receiverId, numericSongId);
        const normalizedResult = {
          ...result,
          contentPlain:
            result.contentPlain ?? (typeof result.content === "string" ? result.content : undefined)
        };
        const parsed = parseIncomingContent(normalizedResult as ChatMessageDTO, friends);
        setChatByFriend(prev => {
          const existing = prev[selectedChat] || [];
          const replaced = existing.map(m => (m.id === tempId ? parsed : m));
          const hasParsed = replaced.some(m => m.id === parsed.id);
          return {
            ...prev,
            [selectedChat]: hasParsed ? replaced : [...replaced, parsed]
          };
        });
        return;
      }

      const fallbackPayload = {
        id: payloadId,
        title: songTitle,
        artist: songArtist
      };
      const content = `SONG:${JSON.stringify(fallbackPayload)}`;
      const result = await chatApi.sendMessage(meId, receiverId, content);

      if (result && typeof result === "object" && "id" in result) {
        const normalizedResult = {
          ...result,
          contentPlain:
            result.contentPlain ?? (typeof result.content === "string" ? result.content : undefined)
        };
        const parsed = parseIncomingContent(normalizedResult as ChatMessageDTO, friends);
        setChatByFriend(prev => {
          const existing = prev[selectedChat] || [];
          return {
            ...prev,
            [selectedChat]: existing.map(m => (m.id === tempId ? parsed : m))
          };
        });
      }
    } catch (e) {
      console.error('[Social] Failed to share song:', e);
      pushBubble('Failed to share song', 'error');
      setChatByFriend(prev => ({
        ...prev,
        [selectedChat]: prev[selectedChat]?.filter(m => m.id !== tempId) || []
      }));
    }

  };


  const handleSharePlaylistLink = async () => {

    if (!selectedChat || !meId) return;

    try {

      const input = window.prompt('Enter playlist URL (or ID):');

      if (!input) return;

      const url = /^(http|https):/i.test(input) ? input : `${window.location.origin}/playlist/${String(input).trim()}`;

      const receiverId = Number(selectedChat);

      await chatApi.sendMessage(meId, receiverId, `PLAYLIST_LINK:${url}`);

      // Optimistic update

      const now = Date.now();
      const msg: Message = {
        id: `${now}`,
        sender: 'You',
        content: url,
        timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentAt: now,
        type: 'text',
      };
      setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }));

    } catch { pushBubble('Failed to share link', 'error'); }

  };





  // Poll friends list so new friendship reflects without manual reload



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

          avatar: toAbsoluteUrl(f.friendAvatar) || undefined,

          isOnline: false,

          streak: 0,

        }));

        if (!active) return;

        



        setFriends(prev => {

          const prevIds = prev.map(f => f.id).sort().join(',');

          const newIds = mapped.map(f => f.id).sort().join(',');

          



          if (prevIds === newIds) {



            const updated = mapped.map(newF => {

              const existing = prev.find(p => p.id === newF.id);

              return existing ? { ...newF, isOnline: existing.isOnline } : newF;

            });

            return updated;

          }

          



          return mapped;

        });

      } catch { void 0; }

    };



    const iv = setInterval(tick, 30000);

    tick();

    return () => { active = false; clearInterval(iv); };

  }, [meId]);



  // Helper function để decode JWT và lấy userId
  const getUserIdFromToken = (): number | null => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return null;
      
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode payload (base64url)
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      
      // Lấy userId từ payload
      if (decoded.userId && typeof decoded.userId === 'number') {
        return decoded.userId;
      }
      return null;
    } catch (e) {
      console.warn('Failed to decode token:', e);
      return null;
    }
  };

  const copyShareLink = async (linkUrl: string): Promise<boolean> => {
    if (!linkUrl) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(linkUrl);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = linkUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn('Fallback copy method failed:', err);
      return false;
    }
  };

  const handleCreateInviteLink = async () => {
    console.log('[Share Profile] Button clicked');
    try {
      // Luôn refresh data từ API để đảm bảo có thông tin mới nhất
      let uid = profileUserId;
      let uname = profileUsername;
      
      console.log('[Share Profile] Initial state:', { uid, uname, profileUserId, profileUsername });
      
      // Ưu tiên lấy từ localStorage/sessionStorage
      if (!uid) {
        const idRaw = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const idNum = idRaw ? Number(idRaw) : NaN;
        if (Number.isFinite(idNum)) {
          uid = idNum;
          console.log('[Share Profile] Got userId from storage:', uid);
        }
      }
      
      // Nếu vẫn không có, decode từ JWT token
      if (!uid) {
        const tokenUserId = getUserIdFromToken();
        if (tokenUserId) {
          uid = tokenUserId;
          setProfileUserId(tokenUserId);
          console.log('[Share Profile] Got userId from token:', uid);
        }
      }
      
      // Thử gọi API để refresh data (nhưng không block nếu fail)
      try {
        const me = await authApi.me();
        if (typeof me?.id === 'number') {
          uid = me.id;
          setProfileUserId(me.id);
        }
        uname = (me?.username || (me?.email ? me.email.split('@')[0] : '') || '').trim();
        setProfileUsername(uname);
        setProfileName((me?.name || me?.username || '').trim());
        setProfileEmail((me?.email || '').trim());
        setProfileAvatar(toAbsoluteUrl(me?.avatar || null));
        console.log('[Share Profile] Got user info from API:', { uid, uname });
      } catch (apiError) {
        // Nếu API fail nhưng đã có uid từ token, vẫn tiếp tục
        console.warn('[Share Profile] API failed, using token data:', apiError);
        if (!uid) {
          pushBubble('Please sign in to generate a share link', 'warning');
          navigate('/login');
          return;
        }
      }
      
      // Nếu vẫn không có uid sau tất cả các cách, báo lỗi
      if (!uid) {
        console.error('[Share Profile] No userId found after all attempts');
        pushBubble('Unable to generate invite link. Please try again.', 'error');
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const linkUrl =
        origin && uid != null
          ? `${origin}/social?u=${encodeURIComponent(String(uid))}`
          : origin && uname
          ? `${origin}/social?u=${encodeURIComponent(uname)}`
          : '';

      console.log('[Share Profile] Generated link:', linkUrl);

      if (linkUrl) {
        setShareUrl(linkUrl);
        
        // Luôn cố gắng copy vào clipboard với fallback method
        let copied = false;
        
        // Method 1: Modern Clipboard API
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(linkUrl);
            copied = true;
            console.log('[Share Profile] Copied via Clipboard API');
          }
        } catch (e) {
          console.warn('[Share Profile] Clipboard API failed, trying fallback:', e);
        }
        
        // Method 2: Fallback - tạo input element tạm để copy
        if (!copied) {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = linkUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
              copied = true;
              console.log('[Share Profile] Copied via fallback method');
            }
          } catch (e) {
            console.warn('[Share Profile] Fallback copy method failed:', e);
          }
        }
        
        if (copied) {
          console.log('[Share Profile] Calling pushBubble with success message');
          pushBubble(`Copied invite link: ${linkUrl}`, 'success');
          // Verify clipboard content
          try {
            const clipboardText = await navigator.clipboard.readText();
            console.log('[Share Profile] Clipboard content verified:', clipboardText);
          } catch (e) {
            console.warn('[Share Profile] Could not verify clipboard:', e);
          }
        } else {
          // Nếu cả 2 method đều fail, vẫn hiển thị link và hướng dẫn user copy thủ công
          console.log('[Share Profile] Copy failed, showing info message');
          pushBubble(`Your invite link (click to copy): ${linkUrl}`, 'info');
        }
      } else {
        console.error('[Share Profile] Failed to generate link - no uid or uname');
        pushBubble('Unable to generate invite link', 'error');
      }
    } catch (e: unknown) {
      console.error('[Share Profile] Error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      pushBubble(msg || 'Failed to share invite link', 'error');
    }
  };

  // Panel routing by query: panel=profile|requests|friends and u=username
  const panelParam = (searchParams.get('panel') || '').trim();
  const usernameParam = (searchParams.get('u') || '').trim();
  const currentPanel = panelParam || (usernameParam ? 'profile' : 'friends');

  useEffect(() => {
    if (currentPanel === 'profile' && usernameParam) {
      setInlineProfileLoading(true);
      setInlineProfile(null);
      setInlineProfileNotFound(false);
      (async () => {
        try {
          const isNumericId = /^\d+$/.test(usernameParam);
          const url = isNumericId
            ? `${API_BASE_URL}/user/id/${usernameParam}/public`
            : `${API_BASE_URL}/user/${encodeURIComponent(usernameParam)}/public`;
          const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
          if (res.status === 404) {
            setInlineProfileNotFound(true);
            setInlineProfile(null);
            return;
          }
          if (!res.ok) {
            throw new Error(await res.text());
          }
          const data = await res.json();
          setInlineProfile(data || null);
        } catch {
          setInlineProfile(null);
          setInlineProfileNotFound(true);
        } finally {
          setInlineProfileLoading(false);
        }
      })();
    } else {
      setInlineProfile(null);
      setInlineProfileNotFound(false);
      setInlineProfileLoading(false);
    }
  }, [currentPanel, usernameParam]);

  useEffect(() => {
    if (currentPanel !== 'profile' || !usernameParam) {
      setProfileDialogOpen(false);
      return;
    }
    if (inlineProfileLoading) {
      setProfileDialogOpen(true);
      return;
    }
    if (inlineProfile || inlineProfileNotFound) {
      setProfileDialogOpen(true);
    }
  }, [currentPanel, usernameParam, inlineProfile, inlineProfileNotFound, inlineProfileLoading]);

  const closeProfileModal = () => {
    setProfileDialogOpen(false);
    setInlineProfile(null);
    setInlineProfileNotFound(false);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('u');
    if (next.get('panel') === 'profile') {
      next.set('panel', 'friends');
    }
    setSearchParams(next, { replace: true });
  };



  const handleAcceptInviteFromQuery = async () => { /* Legacy flow removed */ };



  const handleDeclineInviteFromQuery = () => { /* Legacy flow removed */ };



  const handleUnfriend = async (friendId: string): Promise<void> => {
    const me = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!me) {
      pushBubble('Missing user id', 'error');
      return;
    }
    const friend = friends.find(f => f.id === friendId);
    if (!friend) {
      pushBubble('Friend not found', 'error');
      return;
    }
    setPendingUnfriend({ friendId, friendName: friend.name });
    setUnfriendDialogOpen(true);
  };

  // ✅ Cleanup tất cả watchers cho một friend cụ thể
  const cleanupFriendWatchers = (friendId: string) => {
    console.log('[Social] Cleaning up watchers for friend:', friendId);
    
    // 1. Cleanup chat messages watcher
    if (chatWatchersRef.current[friendId]) {
      console.log('[Social] Unsubscribing chat messages watcher for:', friendId);
      chatWatchersRef.current[friendId]();
      delete chatWatchersRef.current[friendId];
    }
    
    // 2. Cleanup typing watcher
    if (typingWatchersRef.current[friendId]) {
      console.log('[Social] Unsubscribing typing watcher for:', friendId);
      typingWatchersRef.current[friendId]();
      delete typingWatchersRef.current[friendId];
      // Clear typing state
      setTypingByFriend((prev) => {
        if (!(friendId in prev)) return prev;
        const { [friendId]: _removed, ...rest } = prev;
        return rest;
      });
    }
    
    // 3. Cleanup reactions watcher nếu đang watch friend này
    if (selectedChat === friendId && reactionsWatcherRef.current) {
      console.log('[Social] Unsubscribing reactions watcher for:', friendId);
      reactionsWatcherRef.current();
      reactionsWatcherRef.current = null;
      setReactionsByMessage({});
    }
    
    // 4. Clear chat messages và unread count cho friend này
    setChatByFriend((prev) => {
      if (!(friendId in prev)) return prev;
      const { [friendId]: _removed, ...rest } = prev;
      return rest;
    });
    
    setUnreadByFriend((prev) => {
      if (!(friendId in prev)) return prev;
      const { [friendId]: _removed, ...rest } = prev;
      return rest;
    });
    
    console.log('[Social] All watchers cleaned up for friend:', friendId);
  };

  const clearStreakCacheForFriend = useCallback((friend?: Friend) => {
    if (!friend) return;
    const candidateIds = new Set<string>();
    const registerKey = (value?: string | number | null) => {
      if (value === undefined || value === null) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      candidateIds.add(normalized);
    };
    registerKey(friend.id);
    registerKey(friend.friendUserId);

    candidateIds.forEach((id) => {
      clearStreakCache(id);
      if (typeof window !== "undefined") {
        const detail: StreakStorageEventDetail = { friendId: id, type: "invalidate" };
        window.dispatchEvent(new CustomEvent(STREAK_STORAGE_EVENT, { detail }));
      }
    });
  }, []);

  const confirmUnfriend = async () => {
    if (!pendingUnfriend) return;
    const { friendId, friendName } = pendingUnfriend;
    setUnfriendDialogOpen(false);
    
    try {
      const me = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (!me) throw new Error('Missing user id');
      const friend = friends.find(f => f.id === friendId);
      if (!friend) {
        pushBubble('Friend not found', 'error');
        return;
      }
      
      // friendId parameter là string của friendUserId hoặc id
      // friend.friendUserId là userId của friend (number)
      // friend.relationshipId là relationshipId (number)
      // API cần friendUserId (userId của friend), không phải relationshipId
      const friendUserId = friend.friendUserId ?? Number(friendId);
      
      if (!friendUserId || !Number.isFinite(friendUserId)) {
        pushBubble('Invalid friend ID', 'error');
        return;
      }
      
      console.log('[Social] Unfriending:', {
        me: Number(me),
        friendId: friendId,
        friendUserId: friendUserId,
        relationshipId: friend.relationshipId,
        friend: friend
      });
      
      // ✅ FIX 1: Cleanup watchers NGAY LẬP TỨC trước khi gọi API
      cleanupFriendWatchers(friendId);
      
      // ✅ FIX 2: Clear selectedChat và navigate TRƯỚC KHI gọi API
      if (selectedChat === friendId) {
        setSelectedChat(null);
        // Navigate về social page (clear chat view)
        navigate('/social?tab=friends');
      }
      
      // Gọi API unfriend
      await friendsApi.remove(Number(me), friendUserId, {
        relationshipId: friend.relationshipId,
      });

      clearStreakCacheForFriend(friend);
      
      // Reload friends list sau khi unfriend thành công
      await loadFriends();
      
      pushBubble('Friend removed', 'info');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Social] Unfriend error:', e);
      pushBubble(msg || 'Failed to remove friend', 'error');
    } finally {
      setPendingUnfriend(null);
    }
  };



  if (loadingFriends && friends.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-dark">
        <div className="container mx-auto px-4 py-8 pb-28">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 mb-6 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-dark">

      <div className="container mx-auto px-4 py-8 pb-28">

        <div className="max-w-6xl mx-auto">

          {/* Legacy invite UI removed */}



          {/* Inline profile panel via query */}
          {currentPanel === 'profile' && usernameParam ? (
            <Dialog
              open={profileDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  closeProfileModal();
                } else {
                  setProfileDialogOpen(true);
                }
              }}
            >
              <DialogContent className="max-w-lg border border-white/10 bg-gradient-to-b from-background/95 to-background/80 p-0 backdrop-blur">
                <DialogHeader className="sr-only">
                  <DialogTitle>Public profile preview</DialogTitle>
                  <DialogDescription>View user profile inside social page</DialogDescription>
                </DialogHeader>
              {inlineProfileLoading ? (
                  <div className="p-6 space-y-5">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
              ) : inlineProfileNotFound ? (
                  <div className="p-6">
                    <DialogHeader className="text-center">
                      <DialogTitle>Profile Not Found</DialogTitle>
                      <DialogDescription>
                        We could not find that profile. Please double-check the username or try again later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex justify-center">
                      <Button variant="outline" onClick={closeProfileModal}>
                        Go back
                      </Button>
                    </div>
                  </div>
              ) : inlineProfile ? (
                <PublicProfileCard profile={inlineProfile} onAddFriendSuccess={closeProfileModal} />
              ) : null}
              </DialogContent>
            </Dialog>
          ) : null}

          {/* Requests-only panel via query */}
          {currentPanel === 'requests' && (
            <div className="mb-6">
              <FriendRequestsList
                items={pending}
                loading={loadingPending}
                onAccept={handleAcceptFriendReq}
                onReject={handleRejectFriendReq}
              />
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(tab) => {
              const nextTab: SocialTab = tab === 'friends' ? 'friends' : 'chat';
              setActiveTab(nextTab);
              updateTabQuery(nextTab, true);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">

            <TabsTrigger value="chat" className="gap-2 relative">
              <MessageCircle className="w-4 h-4" />
              Chat
                {/* Per-user unread shown in list; hide badge here */}
            </TabsTrigger>

            <TabsTrigger value="friends" className="gap-2">

                <Users className="w-4 h-4" />

                Friends

              </TabsTrigger>

            </TabsList>



            <TabsContent value="chat">

              <ChatArea
                selectedChat={selectedChat}
                friends={friends}
                messages={messagesWithReactions}
                unreadByFriend={unreadByFriend}
                unreadByPlaylist={unreadByPlaylist}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFriendSelect={handleFriendSelect}
                newMessage={newMessage}
                onMessageChange={setNewMessage}
                onSendMessage={handleSendMessage}
                onShareCurrentSong={handleShareCurrentSong}
                playSong={playSong}
                currentSong={currentSong}
                loadingFriends={loadingFriends}
                meId={meId}
                isFriendTyping={isSelectedFriendTyping}
                onReact={handleReact}
                onDelete={handleDeleteMessage}
                playlistRooms={mappedPlaylistRooms}
                onOpenPlaylistChat={(playlistId) => {
                  // Trong Social, dùng chung giao diện với chat 1:1 trong ChatArea
                  // Chỉ khi vào PlaylistDetail mới dùng PlaylistChatWindow
                  const roomKey = `pl_${playlistId}`;
                  console.log('[Social] Opening playlist chat:', playlistId);
                  setSelectedChat(roomKey);
                  // Đảm bảo tab chat được active
                  setActiveTab("chat");
                }}
              />
            </TabsContent>



            <TabsContent value="friends">
              <FriendRequestsList
                items={pending}
                loading={loadingPending}
                onAccept={handleAcceptFriendReq}
                onReject={handleRejectFriendReq}
              />
              <FriendsPanel
                friends={friends}
                collabInvites={collabInvites}
                loadingCollabInvites={loadingCollabInvites}
                expandedInviteId={expandedInviteId}
                profileName={profileName}
                profileEmail={profileEmail}
                profileAvatar={profileAvatar}
                shareUrl={shareUrl}
                profilePlanLabel={profilePlanLabel}
                profileIsPremium={profileIsPremium}
                profileUsername={profileUsername}
                onToggleInvite={(id) => setExpandedInviteId(prev => (prev === id ? null : id))}
                onAcceptInvite={handleAcceptCollabInvite}
                onRejectInvite={handleRejectCollabInvite}
                onCreateInviteLink={handleCreateInviteLink}
                onUnfriend={handleUnfriend}
                onSelectChat={(friendId) => {
                  setActiveTab("chat");
                  setSelectedChat(friendId);
                }}
              />
            </TabsContent>

          </Tabs>

        </div>

      </div>

      {/* Dialog xác nhận unfriend */}
      <AlertDialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy kết bạn</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy kết bạn với {pendingUnfriend?.friendName || "người này"}? Hành động này sẽ xóa tất cả tin nhắn và lịch sử trò chuyện giữa hai bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnfriend}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PlaylistChatWindow chỉ dùng trong PlaylistDetail, không dùng trong Social */}

      <style>{`
        /* Hide scrollbar */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
      `}</style>
    </div>

  );

};



export default Social;

