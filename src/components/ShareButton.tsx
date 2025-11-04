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
import { Share2, Send, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { friendsApi } from "@/services/api/friendsApi";
import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";
import { sendMessage } from "@/services/firebase/chat";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  type: "song" | "album" | "playlist" | "quiz";
  url?: string;
  playlistId?: number; // when type === 'playlist'
  albumId?: number; // when type === 'album'
}

const ShareButton = ({ title, type, url, playlistId, albumId }: ShareButtonProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const meId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [typeof window !== 'undefined' ? localStorage.getItem('userId') : undefined]);

  useEffect(() => {
    const loadFriends = async () => {
      if (!meId) return;
      try {
        const apiFriends: any[] = await friendsApi.getFriends(meId);
        const mapped = apiFriends.map((f) => ({
          id: String(f.friendId || f.id),
          name: f.friendName || `User ${f.friendId}`,
          avatar: f.friendAvatar || null,
        }));
        setFriends(mapped);
      } catch (e) {
        // swallow
      }
    };
    loadFriends();
  }, [meId]);

  const filteredFriends = friends.filter(friend => friend.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    try {
      if (!meId) {
        toast.error("Unable to share", { description: "Missing sender information." });
        return;
      }
      if (!selectedFriends.length) {
        if (url) {
          try { await navigator.clipboard.writeText(url); } catch { void 0; }
        }
        return;
      }

      const extractIdFromUrl = (segment: "playlist" | "album" | "song"): number | undefined => {
        if (!url) return undefined;
        const match = url.match(new RegExp(`/${segment}/(\\d+)`, "i"));
        if (match && match[1]) {
          const parsed = Number(match[1]);
          return Number.isFinite(parsed) ? parsed : undefined;
        }
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

      const buildShareUrl = (receiverId: number): string => {
        const baseParams = new URLSearchParams({
          senderId: String(meId),
          receiverId: String(receiverId),
        });
        if (type === "playlist") {
          baseParams.append("playlistId", String(resourceId));
          return `${API_BASE_URL}/chat/share/playlist?${baseParams.toString()}`;
        }
        if (type === "album") {
          baseParams.append("albumId", String(resourceId));
          return `${API_BASE_URL}/chat/share/album?${baseParams.toString()}`;
        }
        baseParams.append("songId", String(resourceId));
        return `${API_BASE_URL}/chat/share/song?${baseParams.toString()}`;
      };

      // Share via chat endpoints for all supported content types
      for (const fid of selectedFriends) {
        const receiverId = Number(fid);
        const endpoint = buildShareUrl(receiverId);
        const response = await fetch(endpoint, { method: "POST", headers: buildJsonHeaders() });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response));
        }
        const payload = await response.json();
        const normalizedPayload = {
          ...payload,
          contentPlain: payload?.contentPlain ?? (typeof payload?.content === "string" ? payload.content : undefined),
        };
        window.dispatchEvent(
          new CustomEvent("app:chat-share-sent", {
            detail: { receiverId, message: normalizedPayload },
          })
        );
      }

      const note = message.trim();
      if (note) {
        for (const fid of selectedFriends) {
          const receiverId = Number(fid);
          try {
            await sendMessage(meId, receiverId, note);
          } catch (err) {
            console.error("Failed to send follow-up message", err);
          }
        }
      }

      setSelectedFriends([]);
      setMessage("");
      setSearchQuery("");
    } catch (e: any) {
      const messageText = e?.message || e;
      console.error("Share failed", messageText);
      toast.error("Share failed", { description: typeof messageText === "string" ? messageText : undefined });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); }}>
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-custom">
        <DialogHeader>
          <DialogTitle>Share {type}</DialogTitle>
          {/* Accessibility: provide description to avoid aria warning */}
          <DialogDescription className="sr-only">
            Select friends to share this {type} with. Optional message field is available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Share preview */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground capitalize">{type}</p>
          </div>

          {/* Search friends */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Friends list */}
          <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-custom">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedFriends.includes(friend.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                }`}
                onClick={() => toggleFriend(friend.id)}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
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

          {/* Message input */}
          <div>
            <Input
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Share button */}
          <Button 
            onClick={handleShare} 
            className="w-full" 
            disabled={selectedFriends.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            {type === 'playlist' ? 'Invite' : 'Share'} with {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareButton;
