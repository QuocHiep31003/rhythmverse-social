import { CollaboratorRole, PlaylistVisibility } from "@/types/playlist";

export interface PlaylistItem {
  id: string;
  title: string;
  description: string;
  cover: string;
  songCount: number;
  totalDuration: string;
  isPublic?: boolean | null;
  visibility?: PlaylistVisibility | string | null;
  likes: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  ownerId?: number;
  ownerName?: string;
  ownerAvatar?: string | null;
  isOwner?: boolean;
  isCollaborator?: boolean;
  role?: CollaboratorRole;
}

export interface UserResponse {
  id?: number;
  userId?: number;
}

export interface SongDTO {
  duration?: number | string;
}

export interface FriendDTO {
  id?: number;
  userId?: number;
  friendId?: number;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string | null;
}

export interface PlaylistFormValues {
  name: string;
  description: string;
  coverUrl: string;
  isPublic: boolean;
  songLimit?: number;
  songIds?: number[];
}

