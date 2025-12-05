import { useEffect, useRef, useMemo, useState } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { watchChatMessages, type FirebaseMessage } from "@/services/firebase/chat";
import { friendsApi } from "@/services/api/friendsApi";
import { emitChatBubble } from "@/utils/chatBubbleBus";
import type { Friend, ApiFriendDTO } from "@/types/social";
import { API_BASE_URL } from "@/services/api/config";

/**
 * Component lắng nghe tin nhắn mới từ Firebase và hiển thị ChatBubble
 * khi người dùng không ở trang social
 */
const ChatMessageWatcher = () => {
  const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const meId = useMemo(() => {
    try {
      const raw = userIdRaw;
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch { return undefined; }
  }, [userIdRaw]);

  const { firebaseReady } = useFirebaseAuth(meId);
  
  const chatWatchersRef = useRef<Record<string, () => void>>({});
  const friendsRef = useRef<Friend[]>([]);
  const lastMessageIdsRef = useRef<Record<string, string>>({});
  const isInitializedRef = useRef<Record<string, boolean>>({});
  const unreadCountRef = useRef<Record<string, number>>({});
  const [friendsReadyVersion, setFriendsReadyVersion] = useState(0);

  // Helper để convert URL relative thành absolute
  const toAbsoluteUrl = (u?: string | null): string | undefined => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    const base = API_BASE_URL.replace(/\/?$/, '');
    if (u.startsWith('/api/')) {
      if (base.endsWith('/api')) {
        return `${base.slice(0, -4)}${u}`;
      }
    }
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u}`;
  };

  // Load danh sách bạn bè
  useEffect(() => {
    if (!meId || !firebaseReady) return;
    
    let active = true;
    const loadFriends = async () => {
      try {
        const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(meId);
        if (active && Array.isArray(apiFriends)) {
          // Map ApiFriendDTO[] thành Friend[] giống như trong Social.tsx
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
          friendsRef.current = mapped;
          setFriendsReadyVersion((v) => v + 1);
        }
      } catch (error) {
        console.warn('[ChatMessageWatcher] Failed to load friends:', error);
      }
    };
    
    loadFriends();
    return () => {
      active = false;
    };
  }, [meId, firebaseReady]);

  // Lắng nghe tin nhắn mới từ Firebase
  useEffect(() => {
    if (!meId || !firebaseReady) {
      // Cleanup khi không có meId hoặc Firebase chưa sẵn sàng
      Object.values(chatWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      chatWatchersRef.current = {};
      unreadCountRef.current = {};
      return;
    }

    const allFriends = friendsRef.current;
    if (!Array.isArray(allFriends) || allFriends.length === 0) {
      return;
    }

    // Lắng nghe tin nhắn mới cho mỗi bạn
    allFriends.forEach((friend: Friend) => {
      const friendId = String(friend.id);
      if (!friendId || chatWatchersRef.current[friendId]) {
        return;
      }

      const friendNumericId = friend.friendUserId ? Number(friend.friendUserId) : Number(friendId);
      if (!Number.isFinite(friendNumericId)) {
        return;
      }

      // Lắng nghe tin nhắn mới
      const unsubscribe = watchChatMessages(meId, friendNumericId, (messages: FirebaseMessage[]) => {
        if (!Array.isArray(messages) || messages.length === 0) {
          return;
        }

        // Lấy tin nhắn mới nhất
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg?.id) {
          return;
        }

        const lastMsgId = String(lastMsg.id);
        const previousLastId = lastMessageIdsRef.current[friendId];

        // Nếu chưa khởi tạo, chỉ lưu ID tin nhắn cuối cùng, không hiển thị
        if (!isInitializedRef.current[friendId]) {
          isInitializedRef.current[friendId] = true;
          lastMessageIdsRef.current[friendId] = lastMsgId;
          return;
        }

        // Nếu có tin nhắn mới (khác với tin nhắn cuối cùng đã biết)
        if (previousLastId && lastMsgId !== previousLastId) {
          // Kiểm tra xem tin nhắn này có phải từ người khác không (không phải từ mình)
          const senderId = lastMsg.senderId ? String(lastMsg.senderId) : null;
          const myIdStr = String(meId);
          
          if (senderId && senderId !== myIdStr) {
            // Lấy thông tin bạn
            const friendInfo = friendsRef.current.find((f: Friend) => 
              String(f.id) === friendId
            );
            
            const friendName = friendInfo?.name || friendInfo?.username || 'Someone';
            const friendAvatar = friendInfo?.avatar || null;
            const nextUnread = (unreadCountRef.current[friendId] || 0) + 1;
            unreadCountRef.current[friendId] = nextUnread;
            
            // Lấy nội dung tin nhắn
            const messageContent = 
              lastMsg.contentPlain || 
              lastMsg.contentPreview || 
              (typeof lastMsg.content === 'string' ? lastMsg.content : '') ||
              (lastMsg.sharedContentType ? `[Shared ${lastMsg.sharedContentType}]` : 'New message');
            
            // Emit ChatBubble với friendId trong meta để có thể chuyển đến đúng chat
            emitChatBubble({
              from: friendName,
              message: messageContent,
              avatar: friendAvatar || undefined,
              variant: 'info',
              meta: {
                friendId: friendId,
                friendNumericId: friendNumericId,
                unreadCount: nextUnread,
              },
            });
          }
        }

        // Cập nhật ID tin nhắn cuối cùng
        lastMessageIdsRef.current[friendId] = lastMsgId;
      });

      chatWatchersRef.current[friendId] = unsubscribe;
    });

    return () => {
      Object.values(chatWatchersRef.current).forEach((unsubscribe) => unsubscribe());
      chatWatchersRef.current = {};
    };
  }, [meId, firebaseReady, friendsReadyVersion]);

  return null;
};

export default ChatMessageWatcher;

