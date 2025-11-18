import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { toast } from "sonner";

import { friendsApi } from "@/services/api/friendsApi";
import { authApi } from "@/services/api/authApi";
import { API_BASE_URL } from "@/services/api/config";

import { playlistCollabInvitesApi } from "@/services/api/playlistApi";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";

import { chatApi, ChatMessageDTO } from "@/services/api/chatApi";
import { useMusic } from "@/contexts/MusicContext";
import type { Song } from "@/contexts/MusicContext";
import { watchChatMessages, type FirebaseMessage } from "@/services/firebase/chat";

import { NotificationDTO as FBNotificationDTO } from "@/services/firebase/notifications";
import {

  MessageCircle,

  Users,

} from "lucide-react";

import type { CollabInviteDTO, Message, Friend, ApiFriendDTO, ApiPendingDTO } from "@/types/social";
import { parseIncomingContent, DEFAULT_ARTIST_NAME } from "@/utils/socialUtils";
import { ChatArea } from "@/components/social/ChatArea";
import { FriendsPanel } from "@/components/social/FriendsPanel";
import { FriendRequestsList } from "@/components/social/FriendRequestsList";
import { PublicProfileCard } from "@/components/social/PublicProfileCard";
import { SocialInlineCard } from "@/components/social/SocialInlineCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";


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

const CHAT_HISTORY_POLL_INTERVAL_MS = 1200;

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

  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<SocialTab>(() => {
    if (typeof window === 'undefined') return 'chat';
    const search = new URLSearchParams(window.location.search || '');
    return normalizeSocialTab(search.get('tab'));
  });
  const [newMessage, setNewMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  

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

  // ChÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â° lÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°u invite URL ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ quay lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡i sau ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ng nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­p khi ngÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ng chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ng nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­p
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

  // ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿m sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ tin nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯n chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âc vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ thÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng bÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡o chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âc
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);



  // Music context (for sharing current song)

  const { currentSong, playSong } = useMusic();



  // Chat state: messages per friend id

  const [chatByFriend, setChatByFriend] = useState<Record<string, Message[]>>({});

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

        id: String(f.friendId || f.id),

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

    // ChÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â° gÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi API khi cÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ token
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
      toast.success('ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ chÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥p nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­n lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || 'KhÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng chÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥p nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­n ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£c lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi');
      toast.error(msg);
    }
  };

  const handleRejectFriendReq = async (id: number) => {
    try {
      await friendsApi.reject(id);
      await loadPending();
      toast.success('ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« chÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œi lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || 'KhÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« chÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œi ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£c lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi');
      toast.error(msg);
    }
  };



  const loadCollabInvites = useCallback(async () => {

    // ChÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â° gÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi API khi cÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ token (trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh 401 spam khi chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ng nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­p)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setCollabInvites([]);
      return;
    }

    setLoadingCollabInvites(true);

    try {

      const list = await playlistCollabInvitesApi.pending();

      setCollabInvites(Array.isArray(list) ? list : []);

      // ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥u ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ xem khi load invites (giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹nh rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±ng khi vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â o tab friends thÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ xem)
      // CÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ lÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°u vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â o localStorage ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ track invites ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ xem
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



  // Load dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ liÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡u chÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­nh ngay khi ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ng nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­p vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  cÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ userId
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

  // Memoize friendIds ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡o array mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Âºi mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âi lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§n render (trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh trigger presence watch khÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§n thiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿t)

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
      // CÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­p nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­t sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ thÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng bÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡o chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âc
      if (!n.read) {
        setUnreadNotificationsCount(prev => prev + 1);
      }

      try {

        if (n?.type === 'MESSAGE') {
          // TÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ng sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ tin nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯n chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âc theo tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â«ng bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡n
          if (!n.read) {
            const sid = n.senderId ? String(n.senderId) : undefined;
            if (sid) {
              setUnreadByFriend(prev => {
                const curr = prev[sid] || 0;
                // NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œang mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ chat vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Âºi user nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â y, khÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ng dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“n
                if (selectedChat && String(selectedChat) === sid) return { ...prev, [sid]: 0 };
                return { ...prev, [sid]: curr + 1 };
              });
            }
          }
          toast(`${n.senderName || 'Someone'}: ${n.body || ''}`);

        } else if (n?.type === 'SHARE') {

          const title = n?.metadata?.playlistName || n?.metadata?.songName || n?.metadata?.albumName || n?.title || 'Shared content';

          toast(`${n.senderName || 'Someone'} shared: ${title}`);

          // Also reflect the share inside the chat thread for the receiver

            const sid = n.senderId;

          if (sid && meId) {
              const friendKey = String(sid);

              const m = n.metadata as { playlistId?: number; songId?: number; albumId?: number } | undefined;

            
            // Load message tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« chat history ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥y sharedContent (async, khÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng await)
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
              
              // Fallback: tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡o message vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Âºi type ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºng tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« metadata
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

          toast(`${n.senderName || 'Someone'} invited you to collaborate on a playlist`);

          loadCollabInvites().catch(() => { void 0; });

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
  // Reset unread count khi chÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Ân chat
  useEffect(() => {
    if (selectedChat) {
      // ChÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â° clear unread cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§a cuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢c chat ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œang mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸
      setUnreadByFriend(prev => ({ ...prev, [selectedChat]: 0 }));
    }
  }, [selectedChat]);

  // Recompute tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ng unread tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« per-friend map
  useEffect(() => {
    const total = Object.values(unreadByFriend).reduce((a, b) => a + (b || 0), 0);
    setUnreadMessagesCount(total);
  }, [unreadByFriend]);

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

        // Merge vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Âºi messages hiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡n tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡i ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥t optimistic updates

        const existing = prev[selectedChat] || [];

        const existingIds = new Set(existing.map(m => m.id));

        const newParsed = parsed.filter(m => !existingIds.has(m.id));

        
        // TÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬m vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  thay thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ optimistic messages cÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ cÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ng content
        const replaced = existing.map(m => {
          // NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  optimistic message (temp ID), tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬m message thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­t tÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ng ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ng
          if (m.id.startsWith('temp-')) {
            const matching = parsed.find(p => 
              p.sender === m.sender &&
              p.type === m.type &&
              ((m.type === 'song' && p.songData?.id === m.songData?.id) ||
               (m.type === 'playlist' && p.playlistData?.id === m.playlistData?.id) ||
               (m.type === 'album' && p.albumData?.id === m.albumData?.id) ||
               (m.type === 'text' && p.content === m.content))
            );
            if (matching) return matching;
          }
          return m;
        });
        
        // Remove duplicates sau khi replace
        const unique = new Map<string, Message>();
        replaced.forEach(m => {
          if (!unique.has(m.id)) unique.set(m.id, m);
        });
        newParsed.forEach(m => {
          if (!unique.has(m.id)) unique.set(m.id, m);
        });
        
        return {
          ...prev,
          [selectedChat]: sortMessagesChronologically(Array.from(unique.values())),
        };
      });

    });



    return () => {

      console.log('[Social] Cleaning up Firebase watch');

      unsubscribe();

    };

  }, [meId, selectedChat, JSON.stringify(friends.map(f => f.id))]);



  // Initial presence fetch for all friends (fallback nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u Firebase chÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°a ready)
  useEffect(() => {

    (async () => {

      try {

        if (!friends.length || !meId) return;

        const ids = friends.map(f => f.id).join(',');

        const base = envVars.VITE_API_BASE_URL || '';

        const res = await fetch(`${base}/api/presence/status?userIds=${encodeURIComponent(ids)}`, { headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } });

        const map = await res.json();

        setFriends(prev => prev.map(f => ({ ...f, isOnline: !!map[String(f.id)] })));

        // Firebase realtime sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ override sau ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
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



  // Poll chat history as a fallback when Firebase listeners lag
  useEffect(() => {
    if (!meId || !selectedChat) return;

    let cancelled = false;

    const mergeHistory = (historyMessages: Message[]) => {
      setChatByFriend(prev => {
        const existing = prev[selectedChat] || [];
        const historyIds = new Set(historyMessages.map(m => m.id));
        const merged = [...historyMessages];
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
  }, [meId, selectedChat]);



  const handleSendMessage = async () => {

    if (!newMessage.trim() || !selectedChat || !meId) return;

    const receiverId = Number(selectedChat);

    const messageContent = newMessage.trim();

    

    // Optimistic update - hiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢n thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ message ngay

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
      const result = await sendMessage(meId, receiverId, content);

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
      toast.error('Failed to share song');
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

      await sendMessage(meId, receiverId, `PLAYLIST_LINK:${url}`);

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

    } catch { toast.error('Failed to share link'); }

  };





  // Poll friends list so new friendship reflects without manual reload

  // ChÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â° update nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u friends list thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±c sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± thay ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢i (trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh trigger presence watch khÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§n thiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿t)

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

        

        // ChÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â° update nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u friends list thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±c sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± thay ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢i (so sÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh IDs)

        setFriends(prev => {

          const prevIds = prev.map(f => f.id).sort().join(',');

          const newIds = mapped.map(f => f.id).sort().join(',');

          

          // NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u IDs giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œng nhau, giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡i isOnline tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« prev (trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nh reset presence)

          if (prevIds === newIds) {

            // Map lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡i ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ isOnline tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â« prev

            const updated = mapped.map(newF => {

              const existing = prev.find(p => p.id === newF.id);

              return existing ? { ...newF, isOnline: existing.isOnline } : newF;

            });

            return updated;

          }

          

          // NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿u IDs khÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡c nhau (thÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªm/bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Âºt friends), update bÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬nh thÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âng

          return mapped;

        });

      } catch { void 0; }

    };

    // TÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ng interval lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªn 30 giÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢y ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£m polling

    const iv = setInterval(tick, 30000);

    tick();

    return () => { active = false; clearInterval(iv); };

  }, [meId]);



  const handleCreateInviteLink = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        toast.error('Please login to copy your profile link');
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
        toast.success('Profile link copied!', { description: linkUrl });
      } else {
        toast.error('Could not build profile link');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Failed to copy profile link');
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
      await friendsApi.remove(Number(me), Number(friendId));
      await loadFriends();
      if (selectedChat === friendId) setSelectedChat(null);
      toast.success('Unfriended');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Failed to unfriend');
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
                      <DialogTitle>KhÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬m thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥y profile</DialogTitle>
                      <DialogDescription>
                        KhÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ng tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬m thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥y profile / Vui lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²ng kiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢m tra lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡i username hoÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·c ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âng dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â«n.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex justify-center">
                      <Button variant="outline" onClick={closeProfileModal}>
                        Quay lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡i
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
                {/* Per-user unread shown in list; hide tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ng here */}
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
                messages={chatByFriend}
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

