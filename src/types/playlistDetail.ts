import { PlaylistDTO } from "@/services/api/playlistApi";
import { Song } from "@/contexts/MusicContext";

export interface SearchSongResult {
  id: number;
  name: string;
  artists?: Array<{ id?: number; name: string }>;
  album?: { id?: number; name: string } | null;
  urlImageAlbum?: string;
  audioUrl?: string;
  duration?: number | string;
  coverUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  artworkUrl?: string | null;
  posterUrl?: string | null;
  image?: string | null;
  addedAt?: string | null;
  added_at?: string | null;
  addedDate?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  addedBy?: string | null;
  addedByName?: string | null;
  createdByName?: string | null;
  addedByUser?: { 
    id?: number; 
    name?: string | null; 
    avatar?: string | null;
  } | null;
  addedByUserName?: string | null;
  addedById?: number;
  addedByAvatar?: string | null;
}

export interface PlaylistOwner {
  id?: number;
  name?: string;
}

export interface ExtendedPlaylistDTO extends Omit<PlaylistDTO, 'owner'> {
  urlImagePlaylist?: string;
  ownerId?: number;
  dateUpdate?: string | null;
  songLimit?: number;
  owner?: PlaylistOwner | null;
}

export interface FriendResponse {
  id?: number;
  userId?: number;
  friendId?: number;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string | null;
}

export interface PendingInvite {
  id?: number;
  playlistId?: number;
  senderId?: number;
  receiverId: number;
  role?: string;
  status?: string;
  inviteCode?: string;
  createdAt?: string;
}

export interface PlaylistState {
  id: number;
  title: string;
  description: string;
  cover: string | null;
  ownerName?: string;
  ownerAvatar?: string | null;
  ownerId?: number;
  visibility: import("@/types/playlist").PlaylistVisibility;
  updatedAt?: string | null;
  totalSongs?: number | null;
  songs: (Song & { 
    addedBy?: string; 
    addedAt?: string; 
    addedById?: number;
    addedByAvatar?: string | null;
  })[];
}

