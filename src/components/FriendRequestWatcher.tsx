import { useEffect, useRef, useState } from "react";
import { friendRequestsApi } from "@/services/api/friendsApi";
import { toast } from "@/hooks/use-toast";

const FriendRequestWatcher = () => {
  const [enabled, setEnabled] = useState(false);
  const lastCountRef = useRef<number>(0);
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
        const count = Array.isArray(incoming) ? incoming.length : 0;
        if (count > lastCountRef.current && lastCountRef.current !== 0) {
          const delta = count - lastCountRef.current;
          toast({
            title: "Bạn có lời mời kết bạn mới",
            description: delta === 1 ? "1 lời mời mới" : `${delta} lời mời mới`,
          });
        }
        lastCountRef.current = count;
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


