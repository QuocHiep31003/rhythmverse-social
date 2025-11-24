import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Users, Eye } from "lucide-react";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";
import { toast } from "sonner";
import { userApi } from "@/services/api/userApi";
import { premiumSubscriptionApi, PremiumSubscriptionDTO } from "@/services/api/premiumSubscriptionApi";

interface InvitePlaylistSongDTO {
  id?: number;
  name?: string;
  artists?: Array<string | { id?: number; name?: string }>;
  urlImageAlbum?: string | null;
  coverUrl?: string | null;
  duration?: string | number | null;
}

interface InvitePlaylistDTO {
  id?: number;
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: string | null;
  songLimit?: number | null;
  ownerId?: number | null;
  songs?: InvitePlaylistSongDTO[];
}

interface CollabInviteDTO {
  id: number;
  playlistId?: number;
  playlist?: InvitePlaylistDTO | null;
  senderId?: number;
  senderName?: string;
  receiverId?: number;
  receiverName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  inviteCode?: string;
}

const formatDuration = (d?: string | number | null) => {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (typeof d === "number" && Number.isFinite(d)) {
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
  return "";
};

const artistNames = (artists?: InvitePlaylistSongDTO["artists"]) => {
  if (!Array.isArray(artists)) return [] as string[];
  return artists
    .map((a) => (typeof a === "string" ? a : a?.name))
    .filter((x): x is string => !!x && x.trim().length > 0);
};

const PlaylistInvites = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<CollabInviteDTO[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await playlistCollabInvitesApi.pending();
      setInvites(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error("Failed to load invites");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      try {
        const user = await userApi.getCurrentProfile();
        let isPremiumFromUser =
          (user as any)?.isPremium ??
          (user as any)?.premium ??
          user?.roleName?.toUpperCase() === "PREMIUM";

        if (!isPremiumFromUser && user?.id) {
          try {
            const subscription: PremiumSubscriptionDTO | null =
              await premiumSubscriptionApi.getMySubscription(user.id);
            if (subscription) {
              const status =
                subscription.status ||
                subscription.subscriptionStatus ||
                "";
              const normalizedStatus = status.toUpperCase();
              isPremiumFromUser =
                normalizedStatus === "ACTIVE" ||
                normalizedStatus === "TRIALING" ||
                subscription?.isActive ||
                subscription?.active ||
                false;
            }
          } catch (e) {
            console.warn("Failed to check premium subscription", e);
          }
        }
        setIsPremium(Boolean(isPremiumFromUser));
      } catch (e) {
        console.warn("Failed to check premium status", e);
      }
    };
    checkPremium();
  }, []);

  // Auto-refresh on interval and when window regains focus
  useEffect(() => {
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    const id = setInterval(() => { void load(); }, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter((inv) => {
      const name = inv.playlist?.name || "";
      const sender = inv.senderName || "";
      return name.toLowerCase().includes(q) || sender.toLowerCase().includes(q);
    });
  }, [invites, search]);

  const handleAccept = async (inviteId: number) => {
    try {
      await playlistCollabInvitesApi.accept(inviteId);
      toast.success("✅ Invite accepted!");
      setExpandedId((prev) => (prev === inviteId ? null : prev));
      await load();
    } catch (e) {
      toast.error("Failed to accept invite");
    }
  };

  const handleReject = async (inviteId: number) => {
    try {
      await playlistCollabInvitesApi.reject(inviteId);
      toast.success("❌ Invite rejected!");
      setExpandedId((prev) => (prev === inviteId ? null : prev));
      await load();
    } catch (e) {
      toast.error("Failed to reject invite");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8 pb-28">
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Playlist Collaboration Invites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Input
                placeholder="Search invites by playlist or sender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites</p>
            ) : (
              filtered.map((invite) => {
                const p = invite.playlist;
                const cover = p?.coverUrl || p?.songs?.find((s) => s.coverUrl || s.urlImageAlbum)?.coverUrl || p?.songs?.find((s) => s.urlImageAlbum)?.urlImageAlbum || undefined;
                const total = p?.songs?.length || 0;
                const expanded = expandedId === invite.id;
                return (
                  <div key={invite.id} className="rounded-2xl border border-border/20 bg-muted/10 p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                          {cover ? (
                            <img src={cover} alt={p?.name || "Playlist cover"} className="h-full w-full object-cover" />
                          ) : (
                            <Music className="w-6 h-6 text-muted-foreground/70" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm sm:text-base">{p?.name || `Playlist #${invite.playlistId}`}</h4>
                          <p className="text-xs text-muted-foreground">
                            {invite.senderName ? `${invite.senderName} invited you to collaborate` : "Collaboration invite"}
                          </p>
                          <p className="text-xs text-muted-foreground">Role: {invite.role || "EDITOR"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setExpandedId((prev) => (prev === invite.id ? null : invite.id))}>
                          {expanded ? "Hide preview" : (
                            <span className="inline-flex items-center gap-1"><Eye className="w-4 h-4" /> View</span>
                          )}
                        </Button>
                        <Button size="sm" variant="hero" onClick={() => handleAccept(invite.id)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(invite.id)}>
                          Reject
                        </Button>
                      </div>
                    </div>

                    {expanded && p && (
                      <div className="rounded-2xl border border-border/20 bg-background/60 p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="h-28 w-28 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {cover ? (
                              <img src={cover} alt={p.name || "Playlist cover"} className="h-full w-full object-cover" />
                            ) : (
                              <Music className="w-8 h-8 text-muted-foreground/70" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="text-lg font-semibold truncate">{p.name || "Playlist"}</h3>
                            {p.description && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>Visibility: {p.visibility || "Unknown"}</span>
                              <span>{total} {total === 1 ? "song" : "songs"}</span>
                              {p.songLimit != null && (
                                <span>Limit {isPremium ? "Unlimited" : p.songLimit}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Songs ({total})</p>
                          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {total ? (
                              p.songs!.map((s, idx) => (
                                <div key={s.id ?? idx} className="flex items-center gap-3 rounded-lg border border-border/10 bg-muted/15 p-3">
                                  <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                                  <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                                    {s.urlImageAlbum || s.coverUrl ? (
                                      <img src={(s.urlImageAlbum || s.coverUrl) as string} alt={s.name || `Track ${idx + 1}`} className="h-full w-full object-cover" />
                                    ) : (
                                      <Music className="w-5 h-5 text-muted-foreground/70" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{s.name || `Track ${idx + 1}`}</p>
                                    <p className="text-xs text-muted-foreground truncate">{artistNames(s.artists).join(", ")}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDuration(s.duration)}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">No songs in this playlist yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlaylistInvites;
