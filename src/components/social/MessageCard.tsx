import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { playlistsApi, PlaylistDTO } from "@/services/api/playlistApi";
import { albumsApi } from "@/services/api/albumApi";
import { songsApi } from "@/services/api/songApi";
import { useMusic, Song } from "@/contexts/MusicContext";
import type { Message, SharedPlaylistMessageData, SharedAlbumMessageData, SharedSongMessageData } from "@/types/social";
import { SharedPlaylistCard, SharedAlbumCard, SharedSongCard } from "./SharedContentCards";
import { extractArtistNames, formatDurationLabel, normalizeArtistName, DEFAULT_ARTIST_NAME } from "@/utils/socialUtils";

export const MessageCard = ({ message, playSong }: { message: Message; playSong: (song: Song) => void }) => {
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistDTO | null>(null);
  const [albumInfo, setAlbumInfo] = useState<{ id: number; name: string; coverUrl?: string | null; artist?: unknown; releaseYear?: number; songs?: unknown[] } | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const isSentByMe = message.sender === "You";

  useEffect(() => {
    if (message.type !== "playlist") return;
    if (message.sharedPlaylist) return;
    const playlistId = message.playlistData?.id;
    if (!playlistId || playlistInfo) return;
    setLoadingPlaylist(true);
    playlistsApi
      .getById(playlistId)
      .then((data) => setPlaylistInfo(data))
      .catch(() => void 0)
      .finally(() => setLoadingPlaylist(false));
  }, [message.type, message.sharedPlaylist, message.playlistData?.id, playlistInfo]);

  useEffect(() => {
    if (message.type !== "album") return;
    if (message.sharedAlbum) return;
    const albumId = message.albumData?.id;
    if (!albumId || albumInfo) return;
    setLoadingAlbum(true);
    albumsApi
      .getById(albumId)
      .then((data) => setAlbumInfo(data))
      .catch(() => void 0)
      .finally(() => setLoadingAlbum(false));
  }, [message.type, message.sharedAlbum, message.albumData?.id, albumInfo]);

  const playlistPreview = useMemo<SharedPlaylistMessageData | null>(() => {
    if (message.sharedPlaylist) {
      return {
        ...message.sharedPlaylist,
        songs: Array.isArray(message.sharedPlaylist.songs)
          ? message.sharedPlaylist.songs
          : [],
      };
    }
    if (playlistInfo) {
      const songs = Array.isArray(playlistInfo.songs)
        ? playlistInfo.songs.map((song: { id?: number; songId?: number; name?: string; title?: string; artists?: unknown; artistNames?: unknown; urlImageAlbum?: string; coverUrl?: string; cover?: string; duration?: unknown; length?: unknown; durationMs?: unknown }) => ({
            id: song?.id ?? song?.songId,
            name: song?.name || song?.title || "",
            artists: extractArtistNames(song?.artists ?? song?.artistNames),
            coverUrl: song?.urlImageAlbum ?? song?.coverUrl ?? song?.cover ?? playlistInfo.coverUrl ?? undefined,
            durationLabel: formatDurationLabel(song?.duration ?? song?.length ?? song?.durationMs),
          }))
        : [];
      return {
        id: playlistInfo.id,
        name: playlistInfo.name,
        description: playlistInfo.description ?? null,
        coverUrl: playlistInfo.coverUrl ?? null,
        visibility: playlistInfo.visibility ?? null,
        songLimit: playlistInfo.songLimit ?? null,
        songs,
        ownerName: playlistInfo.owner?.name ?? null,
        totalSongs: Array.isArray(playlistInfo.songs)
          ? playlistInfo.songs.length
          : Array.isArray(playlistInfo.songIds)
          ? playlistInfo.songIds.length
          : null,
      };
    }
    if (message.playlistData) {
      return {
        id: message.playlistData.id,
        name: message.playlistData.name,
        description: null,
        coverUrl: message.playlistData.coverUrl ?? null,
        visibility: null,
        songLimit: null,
        songs: [],
        ownerName: message.playlistData.owner ?? null,
        totalSongs: message.playlistData.songCount ?? null,
      };
    }
    return null;
  }, [message.sharedPlaylist, playlistInfo, message.playlistData]);

  const albumPreview = useMemo<SharedAlbumMessageData | null>(() => {
    if (message.sharedAlbum) {
      return message.sharedAlbum;
    }
    if (albumInfo) {
      return {
        id: albumInfo.id,
        name: albumInfo.name,
        coverUrl: albumInfo.coverUrl ?? null,
        artistName: normalizeArtistName((albumInfo as { artist?: unknown }).artist),
        releaseYear: albumInfo.releaseYear ?? null,
        releaseDateLabel: null,
      };
    }
    if (message.albumData) {
      return {
        id: message.albumData.id,
        name: message.albumData.name,
        coverUrl: message.albumData.coverUrl ?? null,
        artistName: message.albumData.artist ?? null,
        releaseYear: message.albumData.releaseYear ?? null,
        releaseDateLabel: null,
      };
    }
    return null;
  }, [message.sharedAlbum, albumInfo, message.albumData]);

  const songPreview = useMemo<SharedSongMessageData | null>(() => {
    if (message.sharedSong) {
      return {
        ...message.sharedSong,
        artists: Array.isArray(message.sharedSong.artists)
          ? message.sharedSong.artists
          : [],
      };
    }
    if (message.songData) {
      const rawId = message.songData.id;
      const numericId = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : undefined;
      const parsedId = typeof numericId === "number" && Number.isFinite(numericId) ? numericId : undefined;
      return {
        id: parsedId,
        name: message.songData.title,
        artists: message.songData.artist ? [message.songData.artist] : [],
        coverUrl: undefined,
        audioUrl: undefined,
        durationLabel: null,
      };
    }
    return null;
  }, [message.sharedSong, message.songData]);

  const linkFromContent = useMemo(() => {
    const raw = String(message.content || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : undefined;
  }, [message.content]);

  const playlistLink = useMemo(() => {
    if (linkFromContent) return linkFromContent;
    const id =
      message.sharedPlaylist?.id ??
      playlistPreview?.id ??
      message.playlistData?.id;
    return typeof id === "number" && Number.isFinite(id) ? `/playlist/${id}` : undefined;
  }, [linkFromContent, message.sharedPlaylist?.id, playlistPreview?.id, message.playlistData?.id]);

  const albumLink = useMemo(() => {
    if (linkFromContent) return linkFromContent;
    const id =
      message.sharedAlbum?.id ?? albumPreview?.id ?? message.albumData?.id;
    return typeof id === "number" && Number.isFinite(id) ? `/album/${id}` : undefined;
  }, [linkFromContent, message.sharedAlbum?.id, albumPreview?.id, message.albumData?.id]);

  const songLink = useMemo(() => {
    if (linkFromContent) return linkFromContent;
    const rawId =
      message.sharedSong?.id ??
      songPreview?.id ??
      (typeof message.songData?.id === "number"
        ? message.songData.id
        : typeof message.songData?.id === "string"
        ? Number(message.songData.id)
        : undefined);
    return typeof rawId === "number" && Number.isFinite(rawId) ? `/song/${rawId}` : undefined;
  }, [linkFromContent, message.sharedSong?.id, songPreview?.id, message.songData?.id]);

  const handlePlaySong = async () => {
    if (!songPreview) return;
    try {
      if (songPreview.audioUrl) {
        const playable: Song = {
          id: String(songPreview.id ?? songPreview.name ?? Date.now()),
          title: songPreview.name || "Shared song",
          artist: songPreview.artists.join(", ") || DEFAULT_ARTIST_NAME,
          album: "",
          duration: 0,
          cover: songPreview.coverUrl ?? "",
          audioUrl: songPreview.audioUrl,
        };
        playSong(playable);
        return;
      }
      const songId =
        songPreview.id ??
        (typeof message.songData?.id === "number"
          ? message.songData.id
          : typeof message.songData?.id === "string"
          ? Number(message.songData.id)
          : undefined);
      if (!songId) {
        toast.error("Song not playable");
        return;
      }
      const detail = await songsApi.getById(String(songId));
      if (!detail || !detail.audioUrl) {
        toast.error("Song not playable");
        return;
      }
      const playable: Song = {
        id: String(detail.id),
        title: detail.title || detail.name,
        artist:
          (Array.isArray(detail.artistNames) && detail.artistNames.length
            ? detail.artistNames.join(", ")
            : Array.isArray(detail.artists) && detail.artists[0]?.name) ||
          songPreview.artists.join(", ") ||
          DEFAULT_ARTIST_NAME,
        album:
          typeof detail.album === "string"
            ? detail.album
            : detail.album?.name || "",
        duration: typeof detail.duration === "number" ? detail.duration : 0,
        cover: detail.cover || songPreview.coverUrl || "",
        audioUrl: detail.audioUrl || "",
      };
      playSong(playable);
    } catch {
      toast.error("Failed to play song");
    }
  };

  const contentNode: React.ReactNode = (() => {
    if (message.type === "song" && songPreview) {
      return (
        <SharedSongCard
          song={songPreview}
          onPlay={handlePlaySong}
          _link={songLink}
          isSentByMe={isSentByMe}
        />
      );
    }
    if (message.type === "playlist") {
      return (
        <SharedPlaylistCard
          playlist={playlistPreview}
          _link={playlistLink}
          isSentByMe={isSentByMe}
          loading={loadingPlaylist}
        />
      );
    }
    if (message.type === "album") {
      return (
        <SharedAlbumCard
          album={albumPreview}
          _link={albumLink}
          isSentByMe={isSentByMe}
        />
      );
    }

    return (
      <div
        className={`px-4 py-2 rounded-lg ${
          isSentByMe ? "bg-primary text-primary-foreground" : "bg-muted/20"
        }`}
      >
        {(() => {
          const txt = String(message.content || "");
          const isUrl = /^https?:\/\//i.test(txt);
          return isUrl ? (
            <a href={txt} target="_blank" rel="noreferrer" className="text-sm underline break-all">
              {txt}
            </a>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap">{txt}</p>
          );
        })()}
      </div>
    );
  })();

  if (!contentNode) return null;

  return (
    <div className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}>
      <div className="max-w-xs lg:max-w-md space-y-1">
        {contentNode}
        <p
          className={`text-xs text-muted-foreground/80 ${
            isSentByMe ? "text-right" : ""
          }`}
        >
          {message.timestamp}
        </p>
      </div>
    </div>
  );
};

