import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { friendsApi } from "@/services/api/friendsApi";
import { authApi } from "@/services/api/authApi";
import { API_BASE_URL } from "@/services/api/config";

import { playlistCollabInvitesApi } from "@/services/api/playlistApi";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

import { chatApi, ChatMessageDTO } from "@/services/api/chatApi";
import { useMusic } from "@/contexts/MusicContext";
import type { Song } from "@/contexts/MusicContext";
import { watchChatMessages, type FirebaseMessage, watchTyping, watchReactions, watchMessageIndex, getChatRoomKey } from "@/services/firebase/chat";

import { NotificationDTO as FBNotificationDTO, watchNotifications } from "@/services/firebase/notifications";
import {

  MessageCircle,

  Users,

} from "lucide-react";

import type { CollabInviteDTO, Message, Friend, ApiFriendDTO, ApiPendingDTO, MessageReactionSummary } from "@/types/social";
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

const CHAT_HISTORY_POLL_INTERVAL_MS = 15_000;

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
  const pushBubble = useCallback((message: string, variant: "info" | "success" | "warning" | "error" = "info") => {
    emitChatBubble({ from: "EchoVerse", message, variant });
  }, []);

  

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
  }, [searchParams]);

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

  // Note: do not memoize userId; always read latest from localStorage
  const meId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [localStorage.getItem('userId')]);

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

  // Invite link preview state
  // Legacy states removed

  // Track unread counts for chats and notifications.
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  
  // Load unreadByFriend from localStorage on mount
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('unreadByFriend');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[Social] Loaded unreadByFriend from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('[Social] Failed to load unreadByFriend from localStorage:', e);
    }
    return {};
  });
  
  // Save unreadByFriend to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('unreadByFriend', JSON.stringify(unreadByFriend));
      console.log('[Social] Saved unreadByFriend to localStorage:', unreadByFriend);
    } catch (e) {
      console.warn('[Social] Failed to save unreadByFriend to localStorage:', e);
    }
  }, [unreadByFriend]);
  
  // Track message IDs that have already been counted to avoid double counting
  const countedMessageIdsRef = useRef<Set<string>>(new Set());

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
      const friendId = Number(friendKey);
      if (!Number.isFinite(friendId)) return;
      const cacheKey = `${meId}-${friendId}`;
      const now = Date.now();
      const last = lastReadRef.current[cacheKey];
      if (last && now - last < 1000) return;
      lastReadRef.current[cacheKey] = now;
      chatApi
        .markConversationRead(meId, friendId)
        .catch((error) => console.warn("[Social] Failed to mark conversation as read", error));
    },
    [meId]
  );

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
        if (firebaseKey) {
          return { ...parsed, firebaseKey };
        }
        return parsed;
      });
      
      // If any message lacks plaintext, trigger history refresh to get full content immediately
      const needsRefresh = parsed.some((msg) => {
        const original = firebaseMessages.find((fm) => String(fm.id) === String(msg.id));
        // Check if message has only preview (truncated) or no contentPlain
        return original && (!original.contentPlain || (original.contentPreview && !original.contentPlain)) && original.messageId;
      });
      
      if (needsRefresh && meId) {
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
                  const updated = existing.map((msg) => {
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
                  
                  // Keep temp messages that aren't in history yet
                  existing.forEach((msg) => {
                    if (msg.id?.startsWith("temp-") && !historyIds.has(msg.id)) {
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
          unique.set(String(message.id), message);
        });
        parsed.forEach((message) => {
          unique.set(String(message.id), message);
        });

        const sorted = sortMessagesChronologically(Array.from(unique.values()));
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

        // Đếm tin nhắn chưa đọc từ Firebase messages
        // Chỉ đếm tin nhắn mới thực sự (không phải khi reload)
        const isInitialLoad = previous.length === 0;
        
        if (!isInitialLoad) {
          const previousIds = new Set(previous.map(m => String(m.id)));
          const previousBackendIds = new Set(
            previous
              .filter(m => m.backendId)
              .map(m => String(m.backendId))
          );
          
          // Tìm tin nhắn mới: không có trong previous (theo ID hoặc backendId)
          const newMessages = sorted.filter(m => {
            const hasId = previousIds.has(String(m.id));
            const hasBackendId = m.backendId && previousBackendIds.has(String(m.backendId));
            return !hasId && !hasBackendId;
          });
          
          // Chỉ đếm nếu không đang xem chat này
          const isViewingThisChat = activeTab === "chat" && selectedChat === friendKey;
          
          if (newMessages.length > 0 && !isViewingThisChat) {
            // Đếm tin nhắn chưa đọc từ người khác, tránh đếm trùng
            const unreadNewMessages = newMessages.filter(m => {
              const isFromOther = m.sender !== "You";
              // Kiểm tra read status nếu có (từ Firebase message)
              const isUnread = m.read === false || m.read === undefined;
              // Kiểm tra xem message này đã được đếm chưa
              const messageKey = m.id || (m.backendId ? String(m.backendId) : null);
              const alreadyCounted = messageKey ? countedMessageIdsRef.current.has(`${friendKey}:${messageKey}`) : false;
              return isFromOther && isUnread && !alreadyCounted;
            });

            if (unreadNewMessages.length > 0) {
              // Đánh dấu các message đã được đếm
              unreadNewMessages.forEach(m => {
                const messageKey = m.id || (m.backendId ? String(m.backendId) : null);
                if (messageKey) {
                  countedMessageIdsRef.current.add(`${friendKey}:${messageKey}`);
                }
              });
              
              console.log('[Social] New unread messages detected from Firebase:', { 
                friendKey, 
                count: unreadNewMessages.length,
                totalNew: newMessages.length,
                messages: unreadNewMessages.map(m => ({ 
                  id: m.id, 
                  backendId: m.backendId,
                  sender: m.sender, 
                  read: m.read,
                  sentAt: m.sentAt 
                }))
              });
              setUnreadByFriend((prev) => {
                const current = prev[friendKey] || 0;
                const newCount = current + unreadNewMessages.length;
                console.log('[Social] Updating unread count from Firebase:', { friendKey, current, newCount });
                return { ...prev, [friendKey]: newCount };
              });
            }
          }
        }

        return { ...prev, [friendKey]: sorted };
      });

      if (activeTab === "chat" && selectedChat === friendKey) {
        setUnreadByFriend((prev) => {
          if (!prev[friendKey] || prev[friendKey] === 0) return prev;
          // Xóa các message IDs đã đếm cho friend này khi reset unread count
          const keysToDelete: string[] = [];
          countedMessageIdsRef.current.forEach(key => {
            if (key.startsWith(`${friendKey}:`)) {
              keysToDelete.push(key);
            }
          });
          keysToDelete.forEach(key => countedMessageIdsRef.current.delete(key));
          return { ...prev, [friendKey]: 0 };
        });
        markConversationAsRead(friendKey);
      }
    },
    [activeTab, selectedChat, markConversationAsRead, friends, meId]
  );

  useEffect(() => {
    if (!selectedChat) return;
    const stillExists = friends.some((friend) => friend.id === selectedChat);
    if (!stillExists) {
      setSelectedChat(null);
    }
  }, [friends, selectedChat]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (selectedChat && friends.some((friend) => friend.id === selectedChat)) {
      return;
    }
    if (!friends.length) return;

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
    if (nextFriend && nextFriend.id !== selectedChat) {
      setSelectedChat(nextFriend.id);
    }
  }, [activeTab, friends, selectedChat, unreadByFriend, getLastActivityTimestamp]);

  useEffect(() => {
    if (activeTab !== "chat" || !selectedChat) return;
    setUnreadByFriend((prev) => {
      if (!prev[selectedChat] || prev[selectedChat] === 0) return prev;
      return { ...prev, [selectedChat]: 0 };
    });
    markConversationAsRead(selectedChat);
  }, [activeTab, selectedChat, markConversationAsRead]);

  useEffect(() => {
    if (activeTab !== "chat" || !selectedChat) return;
    emitChatTabOpened({ friendId: selectedChat });
  }, [activeTab, selectedChat]);

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
    const loadMe = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          setProfileName("");
          setProfileEmail("");
          setProfileAvatar(null);
          return;
        }
        const me = await authApi.me();
        setProfileName((me?.name || me?.username || '').trim());
        setProfileEmail((me?.email || '').trim());
        setProfileAvatar(toAbsoluteUrl(me?.avatar || null));
        if (typeof me?.id === 'number') {
          setProfileUserId(me.id);
        } else {
          const idRaw = localStorage.getItem('userId') || sessionStorage.getItem('userId');
          const idNum = idRaw ? Number(idRaw) : NaN;
          setProfileUserId(Number.isFinite(idNum) ? idNum : null);
        }
        const uname = (me?.username || (me?.email ? me.email.split('@')[0] : '') || '').trim();
        setProfileUsername(uname);
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          // Prefer sharing by numeric userId for robustness
          if (origin && (typeof me?.id === 'number' || profileUserId)) {
            const uid = typeof me?.id === 'number' ? me.id : profileUserId;
            setShareUrl(`${origin}/social?u=${encodeURIComponent(String(uid))}`);
          } else if (origin && uname) {
            setShareUrl(`${origin}/social?u=${encodeURIComponent(uname)}`);
          }
        } catch { /* noop */ }
      } catch (e) {
        // Non-fatal; keep fallbacks
        try { console.warn('[Social] Failed to load profile', e); } catch { /* noop */ }
      }
    };
    void loadMe();
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

  // Không cần khôi phục từ notifications nữa vì đã lưu vào localStorage

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

      if (!n.read) {
        setUnreadNotificationsCount(prev => prev + 1);
      }

      try {

        if (n?.type === 'MESSAGE') {
          // Không đếm unreadByFriend từ notification nữa
          // Unread count sẽ được đếm từ Firebase messages để tránh đếm trùng
          // Chỉ hiển thị bubble notification
          pushBubble(`${n.senderName || 'Someone'}: ${n.body || 'New message'}`, "info");

        } else if (n?.type === 'SHARE') {

          const title = n?.metadata?.playlistName || n?.metadata?.songName || n?.metadata?.albumName || n?.title || 'Shared content';

          pushBubble(`${n.senderName || 'Someone'} shared: ${title}`, "info");

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

          pushBubble(`${n.senderName || 'Someone'} invited you to collaborate on a playlist`, "info");

          loadCollabInvites().catch(() => { void 0; });

        } else if (n?.type === 'FRIEND_REQUEST') {

          pushBubble(`${n.senderName || 'Someone'} sent you a friend request`, "info");

          loadPending().catch(() => { void 0; });

        } else if (n?.type === 'FRIEND_REQUEST_ACCEPTED') {

          pushBubble(`${n.senderName || 'Someone'} accepted your friend request`, "success");

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
        mergeFirebaseMessages(friendId, messages);
      });
      chatWatchersRef.current[friendId] = unsubscribe;
    });

    return () => {
      Object.values(chatWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      chatWatchersRef.current = {};
    };
  }, [meId, firebaseReady, friendsIdsString, mergeFirebaseMessages]);

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

    const friendNumericId = Number(selectedChat);
    if (!Number.isFinite(friendNumericId)) return;
    const roomId = getChatRoomKey(meId, friendNumericId);
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

    if (trimmed.length > 0) {
      // Debounce 300ms before starting typing
      if (typingStartTimeoutRef.current) {
        clearTimeout(typingStartTimeoutRef.current);
      }
      typingStartTimeoutRef.current = window.setTimeout(() => {
        if (!typingStatusRef.current.active || typingStatusRef.current.roomId !== roomId) {
          typingStatusRef.current = { roomId, active: true };
          if (meId && firebaseReady) {
            console.log('[Social] Starting typing indicator:', { roomId, meId });
            void chatApi.typingStart(roomId, meId).catch((error) => {
              console.warn("[Social] Failed to start typing indicator", error?.message || error);
            });
          }
        }
        typingStartTimeoutRef.current = null;
      }, 300);
      
      // Clear stop timeout when user is typing
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      typingStopTimeoutRef.current = window.setTimeout(() => {
        stopTyping();
        typingStopTimeoutRef.current = null;
      }, 1000); // 1 giây sau khi ngưng nhập
    } else {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      stopTyping();
    }

    return () => {
      if (typingStartTimeoutRef.current) {
        clearTimeout(typingStartTimeoutRef.current);
        typingStartTimeoutRef.current = null;
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      stopTyping();
    };
  }, [meId, firebaseReady, selectedChat, newMessage]);

  // Watch messageIndex to map messageId -> firebaseKey
  useEffect(() => {
    if (!meId || !firebaseReady || !selectedChat) {
      setMessageIndexByRoom(prev => {
        const friendNumericId = Number(selectedChat);
        if (!Number.isFinite(friendNumericId)) return prev;
        const roomId = getChatRoomKey(meId, friendNumericId);
        const { [roomId]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const friendNumericId = Number(selectedChat);
    if (!Number.isFinite(friendNumericId)) return;
    const roomId = getChatRoomKey(meId, friendNumericId);
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

    const friendNumericId = Number(selectedChat);
    if (!Number.isFinite(friendNumericId)) return;
    const roomId = getChatRoomKey(meId, friendNumericId);
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
    const friendNumericId = Number(selectedChat);
    if (!Number.isFinite(friendNumericId)) return;
    const roomId = getChatRoomKey(meId, friendNumericId);
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
    async (message: Message) => {
      if (!meId) return;
      
      // Find messageId from message
      const messageIdFromBackend = message.backendId;
      const messageIdStr = message.id;
      const derivedMessageId =
        messageIdFromBackend ??
        (messageIdStr && !messageIdStr.startsWith('temp-') ? Number(messageIdStr) : null);
      
      if (!derivedMessageId || !Number.isFinite(derivedMessageId)) {
        console.warn('[Social] Cannot delete: message ID is invalid', {
          messageIdStr,
          backendId: messageIdFromBackend,
        });
        toast.error("Không thể xóa tin nhắn: ID không hợp lệ");
        return;
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
        
        toast.success("Đã xóa tin nhắn");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Không thể xóa tin nhắn";
        console.error('[Social] Failed to delete message:', error);
        toast.error(errorMsg);
      }
    },
    [meId, selectedChat]
  );

  const handleReact = useCallback(
    async (message: Message, emoji: string) => {
      if (!meId || !selectedChat) return;
      const friendNumericId = Number(selectedChat);
      if (!Number.isFinite(friendNumericId)) return;

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

  useEffect(() => {
    const total = Object.values(unreadByFriend).reduce((a, b) => a + (b || 0), 0);
    setUnreadMessagesCount(total);
  }, [unreadByFriend]);




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

      await playlistCollabInvitesApi.accept(inviteId);

      pushBubble('Collab invite accepted', 'success');

      setExpandedInviteId(prev => (prev === inviteId ? null : prev));

      await loadCollabInvites();

    } catch (e: unknown) {

      const msg = e instanceof Error ? e.message : String(e);

      pushBubble(msg || 'Unable to accept invite', 'error');

    }

  };



  const handleRejectCollabInvite = async (inviteId: number) => {

    try {

      await playlistCollabInvitesApi.reject(inviteId);

      pushBubble('Collab invite declined', 'info');

      setExpandedInviteId(prev => (prev === inviteId ? null : prev));

      await loadCollabInvites();

    } catch (e: unknown) {

      const msg = e instanceof Error ? e.message : String(e);

      pushBubble(msg || 'Unable to decline invite', 'error');

    }

  };



  // Poll chat history as a fallback when Firebase listeners lag
  useEffect(() => {
    if (!meId || !selectedChat) return;

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
        // Add temp messages that aren't in history
        existing.forEach(msg => {
          if (msg.id?.startsWith('temp-') && !historyIds.has(msg.id)) {
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

    const fetchHistory = async (reason: 'initial' | 'poll') => {
      try {
        const history = await chatApi.getHistory(meId, Number(selectedChat));
        const normalizedHistory = history.map((h) => ({
          ...h,
          contentPlain: h.contentPlain ?? (typeof h.content === "string" ? h.content : undefined),
        }));
        const mapped = sortMessagesChronologically(
          normalizedHistory.map(h => parseIncomingContent(h, friendsRef.current))
        );
        if (!cancelled) {
          mergeHistory(mapped);
          if (activeTab === 'chat') {
            markConversationAsRead(selectedChat);
          }
        }
      } catch (error) {
        if (reason === 'initial') {
          console.error('[Social] Failed to load chat history:', error);
        } else {
          console.warn('[Social] Chat history poll failed:', error);
        }
      }
    };

    void fetchHistory('initial');

    const intervalId = window.setInterval(() => {
      void fetchHistory('poll');
    }, CHAT_HISTORY_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [meId, selectedChat, activeTab, markConversationAsRead]);



  const handleSendMessage = async () => {

    const rawInput = newMessage.trim();
    if (!rawInput || !selectedChat || !meId) return;

    const receiverId = Number(selectedChat);

    const decodedContent = decodeUnicodeEscapes(rawInput);
    const messageContent = decodedContent || rawInput;

    

    // Optimistic update so the UI feels instant

    const now = Date.now();
    const optimisticMsg: Message = { 

      id: `temp-${now}`, 
      sender: 'You', 

      content: messageContent, 

      timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      sentAt: now,
      type: 'text' 

    };

    setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), optimisticMsg] }));

    setNewMessage('');

    

    try {

      const result = await chatApi.sendMessage(meId, receiverId, messageContent);

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

      pushBubble(e instanceof Error ? e.message : 'Failed to send message', 'error');

      setNewMessage(messageContent); // Restore message for retry

    }

  };

  const isSelectedFriendTyping = selectedChat ? !!typingByFriend[selectedChat] : false;
  
  // Debug typing status
  useEffect(() => {
    if (selectedChat) {
      console.log('[Social] Typing status check:', { 
        selectedChat, 
        isTyping: typingByFriend[selectedChat],
        allTyping: typingByFriend 
      });
    }
  }, [selectedChat, typingByFriend]);

  // Merge reactions into messages for selected chat
  const messagesWithReactions = useMemo(() => {
    if (!selectedChat) return chatByFriend;
    const messages = chatByFriend[selectedChat] || [];
    console.log('[Social] Merging reactions:', { 
      messagesCount: messages.length, 
      reactionsKeys: Object.keys(reactionsByMessage),
      reactionsByMessage 
    });
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
        
        if (reactions.length > 0) {
          console.log('[Social] Merged reactions for message:', { 
            msgId, 
            firebaseKey, 
            messageIdKey, 
            messageIdNum,
            reactions,
            sender: msg.sender,
            allReactionKeys: Object.keys(reactionsByMessage)
          });
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



  const handleCreateInviteLink = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        pushBubble('Please sign in to generate a share link', 'warning');
        navigate('/login');
        return;
      }
      let uid = profileUserId;
      let uname = profileUsername;
      if (!uid) {
        const idRaw = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const idNum = idRaw ? Number(idRaw) : NaN;
        if (Number.isFinite(idNum)) uid = idNum; else {
          try {
            const me = await authApi.me();
            if (typeof me?.id === 'number') uid = me.id;
            uname = (me?.username || (me?.email ? me.email.split('@')[0] : '') || '').trim();
            setProfileUsername(uname);
            setProfileUserId(typeof me?.id === 'number' ? me.id : null);
          } catch { /* ignore */ }
        }
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const linkUrl = (uid != null && origin)
        ? `${origin}/social?u=${encodeURIComponent(String(uid))}`
        : (uname && origin ? `${origin}/social?u=${encodeURIComponent(uname)}` : '');
      if (linkUrl) {
        setShareUrl(linkUrl);
        try { await navigator.clipboard.writeText(linkUrl); } catch { /* noop */ }
        pushBubble(`Copied invite link: ${linkUrl}`, 'success');
      } else {
        pushBubble('Unable to generate invite link', 'error');
      }
    } catch (e: unknown) {
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



  const handleUnfriend = async (friendId: string) => {
    try {
      const me = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (!me) throw new Error('Missing user id');
      const friend = friends.find(f => f.id === friendId);
      if (!friend) return;
      const ok = window.confirm(`Unfriend ${friend.name}?`);
      if (!ok) return;
      const friendUserId = friend.friendUserId ?? Number(friendId);
      await friendsApi.remove(Number(me), Number(friendUserId), {
        relationshipId: friend.relationshipId,
      });
      await loadFriends();
      if (selectedChat === friendId) setSelectedChat(null);
      pushBubble('Friend removed', 'info');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      pushBubble(msg || 'Failed to remove friend', 'error');
    }
  };



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
                <PublicProfileCard profile={inlineProfile} />
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
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFriendSelect={setSelectedChat}
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
                onToggleInvite={(id) => setExpandedInviteId(prev => (prev === id ? null : id))}
                onAcceptInvite={handleAcceptCollabInvite}
                onRejectInvite={handleRejectCollabInvite}
                onCreateInviteLink={handleCreateInviteLink}
                onUnfriend={handleUnfriend}
                onSelectChat={setSelectedChat}
              />
            </TabsContent>

          </Tabs>

        </div>

      </div>

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
