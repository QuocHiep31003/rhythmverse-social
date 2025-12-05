import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Share2, Send, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { friendsApi } from "@/services/api/friendsApi";
import { chatApi, playlistChatApi } from "@/services/api/chatApi";
import { playlistsApi, type PlaylistLibraryItemDTO } from "@/services/api/playlistApi";
import { parseSlug } from "@/utils/playlistUtils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface ShareButtonProps {
  title: string;
  type: "song" | "album" | "playlist";
  url?: string;
  playlistId?: number; // when type === 'playlist'
  albumId?: number; // when type === 'album'
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Controlled open change handler
  triggerOpen?: boolean; // Trigger to open dialog programmatically
  isPrivate?: boolean; // If true, disable share button for private playlists
}

const ShareButton = ({ title, type, url, playlistId, albumId, open: controlledOpen, onOpenChange: controlledOnOpenChange, triggerOpen, isPrivate }: ShareButtonProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const [playlistGroups, setPlaylistGroups] = useState<Array<{ id: string; name: string; avatar?: string | null }>>([]);
  const [message, setMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const meId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [typeof window !== 'undefined' ? localStorage.getItem('userId') : undefined]);

  // Load friends and playlist groups when dialog opens or when meId changes
  useEffect(() => {
    const loadData = async () => {
      if (!meId) return;
      try {
        // Load friends
        const apiFriends: any[] = await friendsApi.getFriends(meId);
        const mappedFriends = apiFriends.map((f) => ({
          id: String(f.friendId || f.id),
          name: f.friendName || `User ${f.friendId}`,
          avatar: f.friendAvatar || null,
        }));
        setFriends(mappedFriends);

        // Load playlist groups (collab playlists)
        const playlists: PlaylistLibraryItemDTO[] = await playlistsApi.library();
        const mappedGroups = playlists
          .filter((p) => {
            const id = typeof p.playlistId === "number" ? p.playlistId : (typeof (p as any).id === "number" ? (p as any).id : 0);
            return id > 0;
          })
          .map((p) => {
            const id = typeof p.playlistId === "number" ? p.playlistId : (typeof (p as any).id === "number" ? (p as any).id : 0);
            return {
              id: String(id),
              name: p.name || `Playlist ${id}`,
              avatar: p.coverUrl || null,
            };
          });
        setPlaylistGroups(mappedGroups);
      } catch (e) {
        console.error("Failed to load friends/playlists:", e);
      }
    };
    
    if (open) {
      loadData();
    }
  }, [open, meId]);

  // Trigger open when triggerOpen prop changes
  useEffect(() => {
    if (triggerOpen) {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerOpen]);

  const filteredFriends = friends.filter(friend => friend.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredGroups = playlistGroups.filter(group => group.name.toLowerCase().includes(searchQuery.toLowerCase()));


  const resetForm = () => {
    setSelectedFriends([]);
    setSelectedGroups([]);
    setSearchQuery("");
    setMessage("");
  };
  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleShare = async () => {
    try {
      if (isPrivate && type === 'playlist') {
        toast.error("Không thể chia sẻ", { description: "Playlist này là private. Vui lòng đổi visibility sang Public hoặc Friends Only để chia sẻ." });
        return;
      }
      if (!meId) {
        toast.error("Unable to share", { description: "Missing sender information." });
        return;
      }
      if (!selectedFriends.length && !selectedGroups.length) {
        if (url) {
          try { await navigator.clipboard.writeText(url); } catch { void 0; }
        }
        return;
      }

      const extractIdFromUrl = (segment: "playlist" | "album" | "song"): number | undefined => {
        if (!url) return undefined;
        try {
          const u = new URL(url);
          const parts = u.pathname.split('/').filter(Boolean);
          const idx = parts.findIndex(p => p.toLowerCase() === segment);
          if (idx >= 0 && parts[idx + 1]) {
            const slugOrId = parts[idx + 1];
            if (segment === 'song') {
              const n = Number(slugOrId);
              return Number.isFinite(n) ? n : undefined;
            }
            // playlist/album: support SEO slug "name-123"
            const parsed = parseSlug(slugOrId).id;
            if (parsed && Number.isFinite(parsed)) return parsed;
            const digits = slugOrId.match(/(\d+)$/);
            if (digits && digits[1]) {
              const n = Number(digits[1]);
              return Number.isFinite(n) ? n : undefined;
            }
          }
        } catch { /* ignore */ }
        return undefined;
      };

      const resolveResourceId = (): number | undefined => {
        if (type === "playlist") {
          return playlistId ?? extractIdFromUrl("playlist");
        }
        if (type === "album") {
          return albumId ?? extractIdFromUrl("album");
        }
        if (type === "song") {
          return extractIdFromUrl("song");
        }
        return undefined;
      };

      const resourceId = resolveResourceId();
      if (!resourceId) {
        toast.error("Unable to share", { description: "Missing content identifier for this item." });
        return;
      }

      // Use chatApi to share via JSON body

      const receiverIds = selectedFriends
        .map((fid) => Number(fid))
        .filter((id) => Number.isFinite(id)) as number[];

      const groupIds = selectedGroups
        .map((gid) => Number(gid))
        .filter((id) => Number.isFinite(id)) as number[];

      if (!receiverIds.length && !groupIds.length) {
        toast.error("Unable to share", { description: "No valid receivers selected." });
        return;
      }

      setIsSharing(true);

      // Share to friends (1-1 chat)
      for (const receiverId of receiverIds) {
        let sharedOk = false;
        try {
          const payload =
            type === 'playlist'
              ? await chatApi.sharePlaylist(meId, receiverId, resourceId)
              : type === 'album'
              ? await chatApi.shareAlbum(meId, receiverId, resourceId)
              : await chatApi.shareSong(meId, receiverId, resourceId);

          window.dispatchEvent(
            new CustomEvent("app:chat-share-sent", {
              detail: { receiverId, message: payload },
            })
          );
          sharedOk = true;
        } catch (err: any) {
          // Fallback: send a plain link if the share API fails
          try {
            const link =
              type === 'playlist'
                ? (url || `${window.location.origin}/playlist/${resourceId}`)
                : type === 'album'
                ? (url || `${window.location.origin}/album/${resourceId}`)
                : (url || `${window.location.origin}/song/${resourceId}`);
            await chatApi.sendMessage(meId, receiverId, `${type.toUpperCase()}_LINK:${link}`);
            toast.warning("Sent link instead of direct share", {
              description: typeof err?.message === 'string' ? err.message : undefined,
            });
          } catch (fbErr) {
            throw err; // if link sending also fails, bubble up the original error
          }
        }

        const note = message.trim();
        if (note) {
          try {
            await chatApi.sendMessage(meId, receiverId, note);
          } catch (err) {
            console.error("Failed to send accompanying message", err);
            if (sharedOk) {
              toast.warning("Shared without message", {
                description: "We couldn't send your message. The share was delivered.",
              });
            }
          }
        }
      }

      // Share to playlist groups
      for (const groupId of groupIds) {
        try {
          if (type === 'playlist') {
            await playlistChatApi.sharePlaylist(groupId, meId, resourceId);
          } else if (type === 'album') {
            await playlistChatApi.shareAlbum(groupId, meId, resourceId);
          } else {
            await playlistChatApi.shareSong(groupId, meId, resourceId);
          }
        } catch (err: any) {
          console.error("Failed to share to playlist group:", err);
          toast.error("Failed to share to group", {
            description: typeof err?.message === 'string' ? err.message : undefined,
          });
        }
      }

      resetForm();
      setOpen(false);
    } catch (e: any) {
      const messageText = e?.message || e;
      console.error("Share failed", messageText);
      toast.error("Share failed", { description: typeof messageText === "string" ? messageText : undefined });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      {controlledOpen === undefined && (
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={isPrivate}
          onClick={(e) => {
            e.stopPropagation();
            if (isPrivate) {
              toast.error("Không thể chia sẻ", { description: "Playlist này là private. Vui lòng đổi visibility sang Public hoặc Friends Only để chia sẻ." });
              return;
            }
            setOpen(true);
          }}
        >
          <Share2 className={`w-4 h-4 ${isPrivate ? 'opacity-50' : ''}`} />
        </Button>
      </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-custom">
        <DialogHeader>
          <DialogTitle>Share {type}</DialogTitle>
          <DialogDescription className="sr-only">
            Select friends to share this {type} with.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground capitalize">{type}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends and groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3 scrollbar-custom">
            {/* Friends Section */}
            {filteredFriends.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                  Friends
                </div>
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={`friend-${friend.id}`}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFriends.includes(friend.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleFriend(friend.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar || undefined} alt={friend.name} />
                          <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <span className="font-medium text-sm flex-1">{friend.name}</span>
                      {selectedFriends.includes(friend.id) && (
                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playlist Groups Section */}
            {filteredGroups.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Playlist Groups
                </div>
                <div className="space-y-2">
                  {filteredGroups.map((group) => (
                    <div
                      key={`group-${group.id}`}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedGroups.includes(group.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={group.avatar || undefined} alt={group.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {group.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <span className="font-medium text-sm flex-1">{group.name}</span>
                      {selectedGroups.includes(group.id) && (
                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredFriends.length === 0 && filteredGroups.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                {searchQuery ? "No results found" : "No friends or groups available"}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="share-message" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Personal message (optional)
            </label>
            <Textarea
              id="share-message"
              placeholder="Add a short note…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleShare}
            className="w-full"
            disabled={isSharing}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSharing
              ? "Sharing…"
              : (() => {
                  const totalSelected = selectedFriends.length + selectedGroups.length;
                  if (totalSelected === 0) return "Share";
                  const parts: string[] = [];
                  if (selectedFriends.length > 0) {
                    parts.push(`${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`);
                  }
                  if (selectedGroups.length > 0) {
                    parts.push(`${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''}`);
                  }
                  return `Share with ${parts.join(' and ')}`;
                })()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareButton;
export { ShareButton };



