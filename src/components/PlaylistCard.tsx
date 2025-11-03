/**
 * PlaylistCard Component
 * Displays a playlist card with visibility-based filtering
 * Based on the Playlist Permission System Guide
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaylistDTO } from "@/services/api/playlistApi";
import { PlaylistVisibility, PlaylistCollaborator } from "@/types/playlist";
import { canViewPlaylist, checkIfFriends } from "@/utils/playlistPermissions";
import { useEffect, useState } from "react";

interface PlaylistCardProps {
  playlist: PlaylistDTO & {
    ownerId?: number;
    collaborators?: PlaylistCollaborator[];
  };
  currentUserId?: number;
  onPlay?: (playlistId: number) => void;
  onLike?: (playlistId: number) => void;
  className?: string;
}

/**
 * PlaylistCard component that checks visibility before displaying
 * Only shows playlists that the current user can view
 */
export const PlaylistCard = ({ 
  playlist, 
  currentUserId, 
  onPlay, 
  onLike,
  className 
}: PlaylistCardProps) => {
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [canView, setCanView] = useState<boolean>(true);

  // Check friend status for FRIENDS_ONLY visibility
  useEffect(() => {
    const checkFriendStatus = async () => {
      const visibility = (playlist.visibility as PlaylistVisibility) || PlaylistVisibility.PUBLIC;
      const ownerId = playlist.ownerId ?? playlist.owner?.id;

      if (
        visibility === PlaylistVisibility.FRIENDS_ONLY &&
        currentUserId &&
        ownerId &&
        currentUserId !== ownerId
      ) {
        const friendCheck = await checkIfFriends(currentUserId, ownerId);
        setIsFriend(friendCheck);
      } else {
        setIsFriend(false);
      }
    };

    checkFriendStatus();
  }, [playlist, currentUserId]);

  // Check view permissions
  useEffect(() => {
    const visibility = (playlist.visibility as PlaylistVisibility) || PlaylistVisibility.PUBLIC;
    const ownerId = playlist.ownerId ?? playlist.owner?.id;
    const collaborators = playlist.collaborators || [];

    const viewCheck = canViewPlaylist({
      playlist: {
        ownerId,
        visibility,
        collaborators,
      },
      currentUser: currentUserId ? { id: currentUserId } : undefined,
      isFriend,
    });

    setCanView(viewCheck);
  }, [playlist, currentUserId, isFriend]);

  // Don't render if user cannot view
  if (!canView) {
    return null;
  }

  const visibility = (playlist.visibility as PlaylistVisibility) || PlaylistVisibility.PUBLIC;
  const songCount = Array.isArray(playlist.songs) ? playlist.songs.length : 0;

  return (
    <Card className={`group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10 ${className || ''}`}>
      <CardContent className="p-0">
        <Link to={`/playlist/${playlist.id}`}>
          {/* Cover Image */}
          <div className="aspect-square rounded-lg bg-gradient-primary mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 relative">
            {playlist.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary-glow rounded-lg" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onPlay?.(playlist.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary hover:bg-primary/90 rounded-full p-3"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="p-4">
          <Link to={`/playlist/${playlist.id}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg hover:text-primary transition-colors truncate">
                {playlist.name}
              </h3>
              <div className="flex items-center gap-1">
                {visibility === PlaylistVisibility.PRIVATE && (
                  <Badge variant="secondary" className="text-xs">
                     Private
                  </Badge>
                )}
                {visibility === PlaylistVisibility.FRIENDS_ONLY && (
                  <Badge variant="outline" className="text-xs">
                     Friends Only
                  </Badge>
                )}
              </div>
            </div>
          </Link>

          {playlist.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {playlist.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{songCount} songs</span>
            </div>
            {playlist.owner && (
              <span className="truncate">by {playlist.owner.name}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaylistCard;

