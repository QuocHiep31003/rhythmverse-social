import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { toast } from "sonner";

import { friendsApi, inviteLinksApi } from "@/services/api/friendsApi";
import { authApi } from "@/services/api/authApi";
import { API_BASE_URL } from "@/services/api/config";

import { playlistCollabInvitesApi } from "@/services/api/playlistApi";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Badge } from "@/components/ui/badge";

import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";

import { chatApi, ChatMessageDTO } from "@/services/api/chatApi";
import { useMusic } from "@/contexts/MusicContext";
import { watchChatMessages, type FirebaseMessage } from "@/services/firebase/chat";

import { NotificationDTO as FBNotificationDTO } from "@/services/firebase/notifications";
import {

  MessageCircle,

  Users,

} from "lucide-react";

import type { CollabInviteDTO, Message, Friend, ApiFriendDTO, ApiPendingDTO } from "@/types/social";
import { parseIncomingContent } from "@/utils/socialUtils";
import { ChatArea } from "@/components/social/ChatArea";
import { FriendsPanel } from "@/components/social/FriendsPanel";


// Realtime notification DTO from /user/queue/notifications

const envVars = ((import.meta as unknown) as { env?: Record<string, string | undefined> }).env || {};



const Social = () => {

  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(((new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')).get('tab') || 'chat'));
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

  // Note: do not memoize userId; always read latest from localStorage
  const meId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [localStorage.getItem('userId')]);

  // Chỉ lưu invite URL để quay lại sau đăng nhập khi người dùng chưa đăng nhập
  useEffect(() => {
    if (inviteCode && !hasToken) {
      try {
        localStorage.setItem('pendingInviteUrl', window.location.pathname + window.location.search);
      } catch { void 0; }
    }
  }, [inviteCode, hasToken]);

  // Load invite preview when inviteCode is present
  useEffect(() => {
    if (inviteCode && meId) {
      setLoadingInvitePreview(true);
      (async () => {
        try {
          const preview = await inviteLinksApi.preview(inviteCode);
          setInvitePreview({
            inviterId: preview.inviterId,
            inviterName: preview.inviterName || 'Ai đó',
            inviterAvatar: preview.inviterAvatar || null,
            message: preview.message || `${preview.inviterName} mời bạn kết bạn`,
          });
        } catch (e: any) {
          console.error('Failed to load invite preview:', e);
          setInvitePreview(null);
        } finally {
          setLoadingInvitePreview(false);
        }
      })();
    } else if (inviteCode) {
      // Chưa đăng nhập, lưu URL để sau khi login quay lại
      try {
        localStorage.setItem('pendingInviteUrl', window.location.pathname + window.location.search);
      } catch { void 0; }
      setInvitePreview(null);
    } else {
      setInvitePreview(null);
    }
  }, [inviteCode, meId]);



  // Do not auto-accept on link open; user must click Accept/Decline.

  const [pending, setPending] = useState<ApiPendingDTO[]>([]);

  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  const [profileName, setProfileName] = useState<string>("");

  const [profileEmail, setProfileEmail] = useState<string>("");

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string>("");

  const [collabInvites, setCollabInvites] = useState<CollabInviteDTO[]>([]);

  const [loadingCollabInvites, setLoadingCollabInvites] = useState<boolean>(false);

  const [expandedInviteId, setExpandedInviteId] = useState<number | null>(null);

  // Invite link preview state
  const [invitePreview, setInvitePreview] = useState<{
    inviterId?: number;
    inviterName: string;
    inviterAvatar?: string | null;
    message: string;
  } | null>(null);
  const [loadingInvitePreview, setLoadingInvitePreview] = useState(false);

  // Đếm số tin nhắn chưa đọc và số thông báo chưa đọc
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);



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
      } catch (e) {
        // Non-fatal; keep fallbacks
        try { console.warn('[Social] Failed to load profile', e); } catch { /* noop */ }
      }
    };
    void loadMe();
  }, []);



  // Safety: auto-clear inviteCode from URL if it's invalid or you're already friends
  useEffect(() => {
    if (!inviteCode || !meId || !invitePreview) return;

    const inviterId = invitePreview.inviterId;
    const isSelf = inviterId && Number(inviterId) === Number(meId);
    const isFriend = inviterId
      ? friends.some(f => Number(f.id) === Number(inviterId))
      : false;
    const hasPending = inviterId
      ? pending.some(p =>
          (Number(p.senderId) === Number(meId) && Number(p.receiverId) === Number(inviterId)) ||
          (Number(p.senderId) === Number(inviterId) && Number(p.receiverId) === Number(meId))
        )
      : false;

    if (isSelf || isFriend || hasPending) {
      try {
        const p = new URLSearchParams(searchParams);
        p.delete('inviteCode');
        const newUrl = p.toString()
          ? `${window.location.pathname}?${p.toString()}`
          : window.location.pathname;
        navigate(newUrl, { replace: true });
      } catch { /* ignore */ }
      setInvitePreview(null);
    }
  }, [inviteCode, invitePreview, meId, friends, pending, navigate, searchParams]);

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

    // Chỉ gọi API khi có token
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



  const loadCollabInvites = async () => {

    // Chỉ gọi API khi có token (tránh 401 spam khi chưa đăng nhập)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setCollabInvites([]);
      return;
    }

    setLoadingCollabInvites(true);

    try {

      const list = await playlistCollabInvitesApi.pending();

      setCollabInvites(Array.isArray(list) ? list : []);

      // Đánh dấu đã xem khi load invites (giả định rằng khi vào tab friends thì đã xem)
      // Có thể lưu vào localStorage để track invites đã xem
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

  };



  // Load dữ liệu chính ngay khi đã đăng nhập và có userId
  useEffect(() => {
    if (!hasToken || !meId) return;
    void loadFriends();
    void loadPending();
    void loadCollabInvites();
  }, [hasToken, meId]);



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
      // Cập nhật số thông báo chưa đọc
      if (!n.read) {
        setUnreadNotificationsCount(prev => prev + 1);
      }

      try {

        if (n?.type === 'MESSAGE') {
          // Tăng số tin nhắn chưa đọc
          if (!n.read) {
            setUnreadMessagesCount(prev => prev + 1);
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

            
            // Load message từ chat history để lấy sharedContent (async, không await)
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
              
              // Fallback: tạo message với type đúng từ metadata
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

          // Hiển thị trong Social → chuyển sang tab Friends
          try { setActiveTab('friends'); } catch { void 0; }
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
  // Reset unread count khi chọn chat
  useEffect(() => {
    if (selectedChat) {
      setUnreadMessagesCount(0);
    }
  }, [selectedChat]);

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

        
        // Tìm và thay thế optimistic messages có cùng content
        const replaced = existing.map(m => {
          // Nếu là optimistic message (temp ID), tìm message thật tương ứng
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
        
        const toSortKey = (msg: Message): number => {
          if (typeof msg.sentAt === 'number' && Number.isFinite(msg.sentAt)) {
            return msg.sentAt;
          }
          if (typeof msg.id === 'string') {
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
        return {
          ...prev,
          [selectedChat]: Array.from(unique.values()).sort((a, b) => {
            const diff = toSortKey(a) - toSortKey(b);
            if (diff !== 0) return diff;
            return String(a.id).localeCompare(String(b.id));
          }),
        };
      });

    });



    return () => {

      console.log('[Social] Cleaning up Firebase watch');

      unsubscribe();

    };

  }, [meId, selectedChat, JSON.stringify(friends.map(f => f.id))]);



  // Initial presence fetch for all friends (fallback nếu Firebase chưa ready)
  useEffect(() => {

    (async () => {

      try {

        if (!friends.length || !meId) return;

        const ids = friends.map(f => f.id).join(',');

        const base = envVars.VITE_API_BASE_URL || '';

        const res = await fetch(`${base}/api/presence/status?userIds=${encodeURIComponent(ids)}`, { headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } });

        const map = await res.json();

        setFriends(prev => prev.map(f => ({ ...f, isOnline: !!map[String(f.id)] })));

        // Firebase realtime sẽ override sau đó
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

        const mapped = normalizedHistory
          .map(h => parseIncomingContent(h, friends))
          .sort((a, b) => {
            const aKey = typeof a.sentAt === 'number' && Number.isFinite(a.sentAt) ? a.sentAt : Number(a.id) || 0;
            const bKey = typeof b.sentAt === 'number' && Number.isFinite(b.sentAt) ? b.sentAt : Number(b.id) || 0;
            return aKey - bKey;
          });
        setChatByFriend(prev => ({ ...prev, [selectedChat]: mapped }));

      } catch { void 0; }

    })();

  }, [meId, selectedChat]);



  const handleSendMessage = async () => {

    if (!newMessage.trim() || !selectedChat || !meId) return;

    const receiverId = Number(selectedChat);

    const messageContent = newMessage.trim();

    

    // Optimistic update - hiển thị message ngay

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

    const content = `SONG:${JSON.stringify({ id: currentSong.id, title: currentSong.title || '', artist: currentSong.artist || '' })}`;

    try {

      const result = await sendMessage(meId, receiverId, content);
      // Optimistic update với ID tạm, sẽ được thay thế khi Firebase broadcast message thật
      const now = Date.now();
      const tempId = `temp-share-${now}`;
      const optimisticMsg: Message = { 
        id: tempId, 
        sender: 'You', 
        content: 'Shared a song', 
        timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        sentAt: now,
        type: 'song', 
        songData: { id: currentSong.id, title: currentSong.title || '', artist: currentSong.artist || '' } 
      };
      setChatByFriend(prev => {
        const existing = prev[selectedChat] || [];
        // Check xem đã có message này chưa (tránh duplicate)
        const alreadyExists = existing.some(m => 
          m.type === 'song' && 
          m.songData?.id === currentSong.id && 
          m.sender === 'You' &&
          m.timestamp === optimisticMsg.timestamp
        );
        if (alreadyExists) return prev;
        return { ...prev, [selectedChat]: [...existing, optimisticMsg] };
      });
      
      // Nếu sendMessage trả về message thật, thay thế optimistic message
      if (result && typeof result === "object" && "id" in result) {
        const normalizedResult = {
          ...result,
          contentPlain: result.contentPlain ?? (typeof result.content === "string" ? result.content : undefined),
        };
        const parsed = parseIncomingContent(normalizedResult as ChatMessageDTO, friends);
        setChatByFriend(prev => ({
          ...prev,
          [selectedChat]: prev[selectedChat]?.map(m => 
            m.id === tempId ? parsed : m
          ).filter((m, idx, arr) => {
            // Remove duplicate nếu có
            return idx === arr.findIndex(ms => ms.id === m.id);
          }) || []
        }));
      }
    } catch (e) {

      toast.error('Failed to share song');

      // Remove optimistic message on error
      setChatByFriend(prev => ({
        ...prev,
        [selectedChat]: prev[selectedChat]?.filter(m => !m.id.startsWith('temp-share-')) || []
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

          avatar: toAbsoluteUrl(f.friendAvatar) || undefined,

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

      const linkUrl = result?.shareUrl || result?.inviteUrl;

      if (linkUrl) {

        setShareUrl(linkUrl);

        try { await navigator.clipboard.writeText(linkUrl); } catch { void 0; }

        toast.success('Invite link created and copied!', { description: linkUrl });

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

            avatar: toAbsoluteUrl(f.friendAvatar) || undefined,

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

      // Xóa inviteCode khỏi URL sau khi accept
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('inviteCode');
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      navigate(newUrl, { replace: true });
      setInvitePreview(null);

      // Reload friends list
      await loadFriends();

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
    // Chỉ xóa inviteCode khỏi URL, không xóa thông báo
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('inviteCode');
    const newUrl = newSearchParams.toString() 
      ? `${window.location.pathname}?${newSearchParams.toString()}`
      : window.location.pathname;
    navigate(newUrl, { replace: true });
    setInvitePreview(null);
    toast('Đã từ chối lời mời');
  };



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

          {inviteCode && (
            <div className="mb-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Lời mời kết bạn
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingInvitePreview ? (
                    <p className="text-sm text-muted-foreground">Đang tải thông tin...</p>
                  ) : invitePreview ? (
                    <>
                      <div className="flex items-center gap-3">
                        {invitePreview.inviterAvatar ? (
                          <img 
                            src={invitePreview.inviterAvatar} 
                            alt={invitePreview.inviterName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                            {invitePreview.inviterName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {invitePreview.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Chấp nhận để kết bạn trực tiếp với {invitePreview.inviterName || 'người mời'}. Lời mời sẽ giữ nguyên cho đến khi bạn quyết định.
                          </p>
                        </div>
                      </div>
                  <div className="flex gap-2">
                        <Button 
                          variant="hero" 
                          onClick={handleAcceptInviteFromQuery}
                          className="flex-1"
                        >
                          Chấp nhận
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleDeclineInviteFromQuery}
                          className="flex-1"
                        >
                          Từ chối
                        </Button>
                  </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Bạn đã nhận được lời mời kết bạn. Chấp nhận để kết nối ngay với người mời, hoặc từ chối nếu chưa sẵn sàng.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="hero" 
                          onClick={handleAcceptInviteFromQuery}
                          className="flex-1"
                        >
                          Chấp nhận
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleDeclineInviteFromQuery}
                          className="flex-1"
                        >
                          Từ chối
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}



          <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); if (tab === 'friends') loadCollabInvites(); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">

              <TabsTrigger value="chat" className="gap-2 relative">
                <MessageCircle className="w-4 h-4" />
                Chat
                {unreadMessagesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 py-0 flex items-center justify-center text-[10px]"
                  >
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Badge>
                )}
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
