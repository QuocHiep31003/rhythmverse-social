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
import { useState } from "react";

interface ShareButtonProps {
  title: string;
  type: "song" | "album" | "playlist" | "quiz";
  url?: string;
}

const ShareButton = ({ title, type, url }: ShareButtonProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const friends = [
    { id: "1", name: "Alex M.", avatar: "", online: true },
    { id: "2", name: "Sarah K.", avatar: "", online: false },
    { id: "3", name: "Mike R.", avatar: "", online: true },
    { id: "4", name: "Emma L.", avatar: "", online: true },
    { id: "5", name: "David S.", avatar: "", online: false },
  ];

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = () => {
    // Handle sharing logic
    console.log("Sharing:", { title, type, selectedFriends, message });
    // Reset form
    setSelectedFriends([]);
    setMessage("");
    setSearchQuery("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
          <div className="max-h-48 overflow-y-auto space-y-2">
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
                  {friend.online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
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