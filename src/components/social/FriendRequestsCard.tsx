import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ApiPendingDTO } from "@/types/social";

export const FriendRequestsCard = ({
  items,
  onAccept,
  onReject,
  loading,
}: {
  items: ApiPendingDTO[];
  loading?: boolean;
  onAccept: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}) => {
  if (loading) {
    return (
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Lời mời kết bạn</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    );
  }

  if (!items?.length) return null;

  return (
    <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Lời mời kết bạn ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((req) => (
          <div key={req.id} className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              {req.senderAvatar ? (
                <AvatarImage src={req.senderAvatar || undefined} alt={req.senderName} />
              ) : null}
              <AvatarFallback>
                {(req.senderName || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {req.senderName || `User ${req.senderId}`}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(req.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="hero" onClick={() => onAccept(req.id)}>
                Chấp nhận
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(req.id)}>
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

