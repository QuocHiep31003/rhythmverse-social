import { SharedContentType } from "@/services/api/chatApi";

export interface CollabInviteDTO {
  id: number;
  playlistId?: number;
  playlistName?: string;
  senderId?: number;
  senderName?: string;
  role?: string;
  playlist?: {
    id?: number;
    name?: string;
    description?: string | null;
    coverUrl?: string | null;
    visibility?: string | null;
    songLimit?: number | null;
    songs?: Array<{
      id?: number;
      name?: string;
      artists?: unknown;
      urlImageAlbum?: string | null;
      coverUrl?: string | null;
      duration?: number | string | null;
    }>;
  } | null;
}

export interface Message {
  id: string;
  firebaseKey?: string;
  backendId?: number;
  sender: string;
  content: string;
  timestamp: string;
  sentAt?: number;
  type: "text" | "song" | "playlist" | "album";
  songData?: {
    id?: string | number;
    title: string;
    artist: string;
  };
  playlistData?: {
    id: number;
    name: string;
    coverUrl?: string | null;
    songCount?: number;
    owner?: string;
  };
  albumData?: {
    id: number;
    name: string;
    coverUrl?: string | null;
    artist?: string;
    releaseYear?: number;
  };
  sharedContentType?: SharedContentType;
  sharedPlaylist?: SharedPlaylistMessageData;
  sharedAlbum?: SharedAlbumMessageData;
  sharedSong?: SharedSongMessageData;
  reactions?: MessageReactionSummary[];
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface SharedPlaylistSongMessageData {
  id?: number;
  name?: string;
  artists: string[];
  coverUrl?: string | null;
  durationLabel?: string | null;
}

export interface SharedPlaylistMessageData {
  id?: number;
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: string | null;
  songLimit?: number | null;
  songs: SharedPlaylistSongMessageData[];
  ownerName?: string | null;
  totalSongs?: number | null;
}

export interface SharedAlbumMessageData {
  id?: number;
  name?: string;
  coverUrl?: string | null;
  artistName?: string | null;
  releaseYear?: number | null;
  releaseDateLabel?: string | null;
}

export interface SharedSongMessageData {
  id?: number;
  name?: string;
  artists: string[];
  coverUrl?: string | null;
  audioUrl?: string | null;
  durationLabel?: string | null;
}

export interface Friend {
  id: string;
  friendUserId?: number;
  relationshipId?: number;
  name: string;
  username: string;
  avatar?: string | null;
  isOnline: boolean;
  currentlyListening?: {
    title: string;
    artist: string;
  };
  streak: number;
}

export interface ApiFriendDTO {
  id: number; // relationship id
  friendId: number;
  friendName: string;
  friendEmail: string;
  friendAvatar: string | null;
  createdAt: string;
}

export interface ApiPendingDTO {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string | null;
  receiverId: number;
  receiverName?: string;
  status: string;
  createdAt: string;
}

