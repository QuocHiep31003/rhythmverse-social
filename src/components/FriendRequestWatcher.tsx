import { useEffect, useRef, useState } from "react";
import { friendRequestsApi } from "@/services/api/friendsApi";
import { emitChatBubble } from "@/utils/chatBubbleBus";
import { emitTempNotification } from "@/utils/notificationBus";
import type { NotificationDTO } from "@/services/firebase/notifications";

const FriendRequestWatcher = () => {
  const [enabled, setEnabled] = useState(false);
  const lastCountRef = useRef<number>(0);
  const lastRequestIdsRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Chỉ bật khi đã đăng nhập user (không phải admin)
    try {
      const userToken = localStorage.getItem("token") || sessionStorage.getItem("token");
      // Không chặn theo adminToken nữa để tránh disable nhầm
      setEnabled(Boolean(userToken));
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const loadOnce = async () => {
      try {
        const incoming = await friendRequestsApi.list(true);
        const requests = Array.isArray(incoming) ? incoming : [];
        const count = requests.length;
        
        // Lấy danh sách ID của các friend request hiện tại
        const currentRequestIds = new Set(
          requests
            .map((r: any) => r.id)
            .filter((id: any): id is number => typeof id === 'number' && Number.isFinite(id))
        );
        
        // Tìm các friend request mới (có ID không nằm trong lastRequestIdsRef)
        const newRequests = requests.filter((r: any) => {
          const id = r.id;
          return typeof id === 'number' && Number.isFinite(id) && !lastRequestIdsRef.current.has(id);
        });
        
        if (newRequests.length > 0 && lastRequestIdsRef.current.size > 0) {
          // Có friend request mới - tạo notification tạm thời cho mỗi request mới
          newRequests.forEach((request: any) => {
            const senderId = typeof request.senderId === 'number' ? request.senderId : 0;
            const senderName = request.senderName || `Người dùng ${senderId}`;
            const senderAvatar = request.senderAvatar || null;
            
            const notification: NotificationDTO = {
              id: `temp-friend-request-${request.id}-${Date.now()}`,
              type: 'FRIEND_REQUEST',
              title: 'Lời mời kết bạn',
              body: `${senderName} đã gửi lời mời kết bạn`,
              senderId: senderId,
              senderName: senderName,
              senderAvatar: senderAvatar,
              createdAt: Date.now(),
              read: false,
            };
            
            // Emit notification tạm thời để các component notifications có thể hiển thị
            emitTempNotification(notification);
          });
          
          const delta = newRequests.length;
          emitChatBubble({
            from: "EchoVerse",
            message: delta === 1 ? "Bạn có 1 lời mời kết bạn mới" : `Bạn có ${delta} lời mời kết bạn mới`,
            variant: "info",
          });
        }
        
        // Cập nhật lastCountRef và lastRequestIdsRef
        lastCountRef.current = count;
        lastRequestIdsRef.current = currentRequestIds;
      } catch {
        // bỏ qua lỗi lặp
      }
    };

    // chạy ngay lần đầu và set polling
    loadOnce();
    timerRef.current = window.setInterval(loadOnce, 10000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled]);

  return null;
};

export default FriendRequestWatcher;


