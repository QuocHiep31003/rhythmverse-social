import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, UserMinus, Search } from "lucide-react";
import { CollaboratorRole } from "@/types/playlist";

interface CollaboratorEntry {
  userId: number;
  name: string;
  avatar?: string | null;
  role?: CollaboratorRole | "OWNER";
  roleLabel: string;
  isOwner: boolean;
}

interface Friend {
  id: number;
  name: string;
  avatar?: string | null;
}

interface CollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  isOwner: boolean;
  collaborators: CollaboratorEntry[];
  friends: Friend[];
  loadingFriends: boolean;
  selectedFriendIds: number[];
  onToggleFriend: (id: number) => void;
  onRemoveCollaborator: (userId: number, name: string) => void;
  onSendInvites: () => void;
  sendingInvites: boolean;
  removingCollaboratorId?: number | null;
  inviteRole: CollaboratorRole;
  onRoleChange: (role: CollaboratorRole) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const renderAvatarImage = (src?: string | null, alt?: string) => {
  if (!src) return null;
  return (
    <AvatarImage
      src={src}
      alt={alt || "Avatar"}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
};

export const CollaboratorDialog = ({
  open,
  onOpenChange,
  canManage,
  isOwner,
  collaborators,
  friends,
  loadingFriends,
  selectedFriendIds,
  onToggleFriend,
  onRemoveCollaborator,
  onSendInvites,
  sendingInvites,
  removingCollaboratorId,
  inviteRole,
  onRoleChange,
  searchQuery,
  onSearchChange,
}: CollaboratorDialogProps) => {
  const filteredFriends = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((friend) => friend.name.toLowerCase().includes(query));
  }, [friends, searchQuery]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="sm:max-w-lg"
        aria-describedby="collab-dialog-description"
        aria-labelledby="collab-dialog-title"
      >
        <DialogHeader>
          <DialogTitle id="collab-dialog-title">Add Collaborators</DialogTitle>
          <DialogDescription id="collab-dialog-description">
            Select friends to collaborate on this playlist. Choose their role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {isOwner && collaborators.filter((m) => !m.isOwner).length > 0 && (
            <div className="rounded-xl border border-border/30 bg-background/40 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current collaborators
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {collaborators
                  .filter((m) => !m.isOwner)
                  .map((member) => (
                    <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {renderAvatarImage(member.avatar, member.name)}
                          <AvatarFallback delayMs={0} className="bg-gradient-primary text-white text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.roleLabel}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onRemoveCollaborator(member.userId, member.name)}
                        disabled={removingCollaboratorId === member.userId}
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        {removingCollaboratorId === member.userId ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {/* <div className="space-y-2">
            <Label htmlFor="collab-role" className="text-xs uppercase tracking-wider text-muted-foreground">
              Default role
            </Label>
            <Select value={inviteRole} onValueChange={(v) => onRoleChange(v as CollaboratorRole)}>
              <SelectTrigger id="collab-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CollaboratorRole.EDITOR}>✏️ Editor — add & remove songs</SelectItem>
                <SelectItem value={CollaboratorRole.VIEWER}>👁️ Viewer — view only</SelectItem>
              </SelectContent>
            </Select>
          </div> */}
          <div className="space-y-2">
            <Label htmlFor="collab-search" className="text-xs uppercase tracking-wider text-muted-foreground">
              Invite friends
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="collab-search"
                placeholder="Search friends..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto pr-1">
            {loadingFriends ? (
              <p className="text-sm text-muted-foreground">Loading friends...</p>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {friends.length === 0 ? "No friends found. Add friends to collaborate." : "No friends match your search."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredFriends.map((friend) => {
                  const selected = selectedFriendIds.includes(friend.id);
                  return (
                    <button
                      type="button"
                      key={friend.id}
                      onClick={() => onToggleFriend(friend.id)}
                      className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-background/40 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <Avatar className="h-9 w-9">
                        {renderAvatarImage(friend.avatar, friend.name)}
                        <AvatarFallback delayMs={0}>{getInitials(friend.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selected ? "Selected to invite" : "Tap to invite"}
                        </p>
                      </div>
                      {selected ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Selected
                        </span>
                      ) : (
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3">
            <p className="text-xs text-muted-foreground">
              {selectedFriendIds.length === 0
                ? "No collaborators selected"
                : `${selectedFriendIds.length} collaborator${selectedFriendIds.length > 1 ? "s" : ""} selected`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sendingInvites}
              >
                Cancel
              </Button>
              <Button onClick={onSendInvites} disabled={sendingInvites || selectedFriendIds.length === 0}>
                {sendingInvites ? "Sending..." : `Send invites (${selectedFriendIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

