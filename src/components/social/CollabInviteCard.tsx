import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import type { CollabInviteDTO } from "@/types/social";
import { extractArtistNames, formatDurationLabel, DEFAULT_ARTIST_NAME } from "@/utils/socialUtils";

export const CollabPlaylistPreview = ({ playlist }: { playlist?: CollabInviteDTO["playlist"] }) => {
  if (!playlist) {
    return <p className="text-sm text-muted-foreground">Playlist details unavailable.</p>;
  }
  const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
  const totalSongs = songs.length;

  return (
    <div className="rounded-2xl border border-border/20 bg-background/70 p-4 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-24 w-24 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name || "Playlist cover"} className="h-full w-full object-cover" />
          ) : (
            <Music className="w-10 h-10 text-muted-foreground/70" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-lg font-semibold truncate">{playlist.name || "Playlist"}</h3>
          {playlist.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{playlist.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Visibility: {playlist.visibility || "Unknown"}</span>
            <span>{totalSongs} {totalSongs === 1 ? "song" : "songs"}</span>
            {playlist.songLimit != null && (
              <span>Limit {playlist.songLimit}</span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">Songs ({totalSongs})</p>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {songs.length ? (
            songs.map((song, idx) => {
              const artists = extractArtistNames(song?.artists);
              const durationLabel = formatDurationLabel(song?.duration);
              return (
                <div
                  key={song?.id ?? idx}
                  className="flex items-center gap-3 rounded-lg border border-border/10 bg-muted/15 p-3"
                >
                  <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {song?.urlImageAlbum ? (
                      <img src={song.urlImageAlbum} alt={song?.name || `Track ${idx + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-muted-foreground/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song?.name || `Track ${idx + 1}`}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {artists.length ? artists.join(", ") : DEFAULT_ARTIST_NAME}
                    </p>
                  </div>
                  {durationLabel && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{durationLabel}</span>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">No songs in this playlist yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const CollabInviteCard = ({
  invite,
  expanded,
  onToggle,
  onAccept,
  onReject,
}: {
  invite: CollabInviteDTO;
  expanded: boolean;
  onToggle: (id: number) => void;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
}) => {
  const playlistName = invite.playlist?.name || invite.playlistName || `Playlist #${invite.playlistId}`;
  return (
    <div className="rounded-2xl border border-border/20 bg-muted/10 p-4 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
            {invite.playlist?.coverUrl ? (
              <img src={invite.playlist.coverUrl} alt={playlistName || "Playlist cover"} className="h-full w-full object-cover" />
            ) : (
              <Music className="w-6 h-6 text-muted-foreground/70" />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm sm:text-base">{playlistName}</h4>
            <p className="text-xs text-muted-foreground">
              {invite.senderName ? `${invite.senderName} invited you to collaborate` : "Collaboration invite"}
            </p>
            <p className="text-xs text-muted-foreground">Role: {invite.role || "EDITOR"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onToggle(invite.id)}>
            {expanded ? "Hide preview" : "View playlist"}
          </Button>
          <Button size="sm" variant="hero" onClick={() => onAccept(invite.id)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(invite.id)}>
            Reject
          </Button>
        </div>
      </div>
      {expanded && <CollabPlaylistPreview playlist={invite.playlist} />}
    </div>
  );
};

