import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Share2, MessageCircle, Flame, Headphones } from "lucide-react";
import type { Friend, CollabInviteDTO } from "@/types/social";
import { CollabInviteCard } from "@/components/social/CollabInviteCard";

interface FriendsPanelProps {
  friends: Friend[];
  collabInvites: CollabInviteDTO[];
  loadingCollabInvites: boolean;
  expandedInviteId: number | null;
  profileName: string;
  profileEmail: string;
  profileAvatar?: string | null;
  shareUrl: string;
  onToggleInvite: (id: number) => void;
  onAcceptInvite: (id: number) => Promise<void>;
  onRejectInvite: (id: number) => Promise<void>;
  onCreateInviteLink: () => Promise<void>;
  onUnfriend: (friendId: string) => Promise<void>;
  onSelectChat: (friendId: string) => void;
}

export const FriendsPanel = ({
  friends,
  collabInvites,
  loadingCollabInvites,
  expandedInviteId,
  profileName,
  profileEmail,
  profileAvatar,
  shareUrl,
  onToggleInvite,
  onAcceptInvite,
  onRejectInvite,
  onCreateInviteLink,
  onUnfriend,
  onSelectChat,
}: FriendsPanelProps) => {
  return (
    <>
      {/* Collaboration Invites - chỉ hiện khi có invites */}
      {collabInvites.length > 0 && (
        <div className="mb-6">
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Collaboration Invites ({collabInvites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingCollabInvites ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                collabInvites.map((inv: CollabInviteDTO) => (
                  <CollabInviteCard
                    key={inv.id}
                    invite={inv}
                    expanded={expandedInviteId === inv.id}
                    onToggle={(id) => onToggleInvite(id)}
                    onAccept={onAcceptInvite}
                    onReject={onRejectInvite}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Profile */}
      <div className="mb-6">
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-lg">
              <Avatar className="w-16 h-16">
                {profileAvatar ? (
                  <AvatarImage src={profileAvatar || undefined} alt={profileName || profileEmail || 'Me'} />
                ) : null}
                <AvatarFallback className="bg-gradient-primary text-white text-lg">
                  {(() => {
                    const name = profileName && profileName.trim().length > 0 ? profileName : (profileEmail.split('@')[0] || 'U');
                    const parts = name.trim().split(' ').filter(Boolean);
                    const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : name[0];
                    return (initials || 'U').toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{profileName || (profileEmail ? profileEmail.split('@')[0] : 'Your Username')}</h3>
                <p className="text-muted-foreground">
                  @{profileEmail ? profileEmail.split('@')[0] : (profileName ? profileName.toLowerCase().replace(/\s+/g, '') : 'yourusername')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{friends.length} friends</Badge>
                  <Badge variant="outline">Premium</Badge>
                </div>
              </div>
              <div className="text-right">
                <Button variant="hero" size="sm" className="mb-2" onClick={onCreateInviteLink}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Profile
                </Button>
                <p className="text-xs text-muted-foreground break-all">
                  {shareUrl
                    ? (
                      <a href={shareUrl} target="_blank" rel="noreferrer" className="underline">
                        {shareUrl}
                      </a>
                    ) : (
                      <>
                        Share: Click "Share Profile" to copy your profile link
                      </>
                    )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Friends List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {friends.map((friend) => (
          <Card key={friend.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    {friend.avatar ? (
                      <AvatarImage src={friend.avatar || undefined} alt={friend.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {friend.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {friend.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{friend.name}</h3>
                  <p className="text-sm text-muted-foreground">{friend.username}</p>
                </div>
                {friend.streak >= 7 && (
                  <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-500">{friend.streak}</span>
                  </div>
                )}
              </div>

              {friend.currentlyListening && (
                <div className="bg-muted/10 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Headphones className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">Currently listening</span>
                  </div>
                  <p className="text-sm font-medium">{friend.currentlyListening.title}</p>
                  <p className="text-xs text-muted-foreground">{friend.currentlyListening.artist}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onSelectChat(friend.id)}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" size="sm" onClick={() => onUnfriend(friend.id)}>
                  Unfriend
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};
