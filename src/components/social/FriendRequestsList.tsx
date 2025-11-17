import { FriendRequestsCard } from "@/components/social/FriendRequestsCard";
import type { ApiPendingDTO } from "@/types/social";

export function FriendRequestsList({
  items,
  loading,
  onAccept,
  onReject,
}: {
  items: ApiPendingDTO[];
  loading?: boolean;
  onAccept: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}) {
  return (
    <FriendRequestsCard
      items={items}
      loading={loading}
      onAccept={onAccept}
      onReject={onReject}
    />
  );
}

