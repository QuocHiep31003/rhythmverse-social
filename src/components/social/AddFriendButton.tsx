import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { friendsApi, friendRequestsApi } from "@/services/api/friendsApi";
import { toast } from "@/hooks/use-toast";

interface AddFriendButtonProps {
  targetUserId: number;
}

export function AddFriendButton({ targetUserId }: AddFriendButtonProps) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [fList, outList, inList] = await Promise.all([
          friendsApi.getFriends(),
          friendRequestsApi.list(false),
          friendRequestsApi.list(true),
        ]);
        if (!active) return;
        setFriends(Array.isArray(fList) ? fList : []);
        setOutgoing(Array.isArray(outList) ? outList : []);
        setIncoming(Array.isArray(inList) ? inList : []);
      } catch {
        if (active) {
          setFriends([]);
          setOutgoing([]);
          setIncoming([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  const isFriend = useMemo(
    () => Array.isArray(friends) && friends.some((f: any) => Number(f.friendId) === Number(targetUserId)),
    [friends, targetUserId]
  );
  const hasOutgoingPending = useMemo(
    () => Array.isArray(outgoing) && outgoing.some((r: any) => Number(r.receiverId) === Number(targetUserId) && (r.status === 'PENDING' || !r.status)),
    [outgoing, targetUserId]
  );
  const incomingRequest = useMemo(
    () => Array.isArray(incoming) ? incoming.find((r: any) => Number(r.senderId) === Number(targetUserId) && (r.status === 'PENDING' || !r.status)) : null,
    [incoming, targetUserId]
  );

  const handleClick = async () => {
    if (!targetUserId) return;
    setSending(true);
    try {
      if (incomingRequest?.id) {
        console.log('👤 [DEBUG] Accepting friend request:', incomingRequest.id);
        await friendsApi.accept(Number(incomingRequest.id));
        toast({ title: 'Đã kết bạn' });
      } else {
        console.log('👤 [DEBUG] Sending friend request to user:', targetUserId);
        const result = await friendsApi.sendRequest(0, Number(targetUserId));
        console.log('👤 [DEBUG] Friend request sent, API response:', result);
        toast({ title: 'Đã gửi lời mời' });
        // Note: Backend should create notification for the receiver
        // Notification will be received via Firebase listener
      }
    } catch (e: any) {
      console.error('👤 [DEBUG] Failed to send/accept friend request:', e);
      toast({ title: 'Không thể xử lý', description: e?.message || 'Lỗi không xác định' });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Button disabled>Đang tải…</Button>;
  if (isFriend) return <Button variant="secondary" disabled>Đã là bạn</Button>;
  if (hasOutgoingPending) return <Button variant="outline" disabled>Đã gửi lời mời</Button>;

  return (
    <Button onClick={handleClick} disabled={sending}>
      {sending ? 'Đang xử lý…' : (incomingRequest ? 'Chấp nhận' : 'Thêm bạn')}
    </Button>
  );
}

