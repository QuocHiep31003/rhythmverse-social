import SockJS from "sockjs-client";
import { over } from "stompjs";
import { useEffect, useRef, useState } from "react";

export default function useChatSocket(userId: number, onMessage: (msg: any) => void) {
  const stompClient = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const token = (localStorage.getItem("token") || localStorage.getItem("adminToken") || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null)) as string | null;
    const socket = new SockJS(`${(import.meta as any).env?.DEV ? "" : ((import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8080")}/ws-chat`);
    const client = over(socket);

    client.connect(
      { Authorization: `Bearer ${token}` },
      () => {
        setIsConnected(true);
        client.subscribe(`/user/queue/messages`, (payload: any) => {
          try {
            const msg = JSON.parse(payload.body);
            onMessage(msg);
          } catch {}
        });
      },
      (error: any) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      }
    );

    stompClient.current = client;
    return () => {
      if (stompClient.current)
        stompClient.current.disconnect(() => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
        });
    };
  }, [userId]);

  const sendMessage = (msg: any) => {
    if (!stompClient.current || !stompClient.current.connected) return;
    stompClient.current.send("/app/chat.send", {}, JSON.stringify(msg));
  };

  return { sendMessage, isConnected };
}