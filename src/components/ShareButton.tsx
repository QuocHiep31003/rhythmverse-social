import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Share2, Send, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { friendsApi } from "@/services/api/friendsApi";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";

interface ShareButtonProps {
  title: string;
  type: "song" | "album" | "playlist" | "quiz";
  url?: string;
  playlistId?: number; // when type === 'playlist'
}

const ShareButton = ({ title, type, url, playlistId }: ShareButtonProps) => {
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
      if (type === 'playlist' && playlistId && selectedFriends.length) {
        // Send collaborator invites via backend
        for (const fid of selectedFriends) {
          await playlistCollabInvitesApi.send(playlistId, Number(fid), 'VIEWER');
        }
        // reset
        setSelectedFriends([]);
        setMessage("");
        setSearchQuery("");
        return;
      }
      // Fallback: just copy URL if provided
      if (url) {
        try { await navigator.clipboard.writeText(url); } catch {}
      }
      setSelectedFriends([]);
      setMessage("");
      setSearchQuery("");
    } catch (e: any) {
      // show error toast through console to avoid circular deps
      console.error('Share failed', e?.message || e);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-custom">
        <DialogHeader>
          <DialogTitle>Share {type}</DialogTitle>
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
            Share with {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareButton;
