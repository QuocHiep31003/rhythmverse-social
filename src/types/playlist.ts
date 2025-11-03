/**
 * Playlist Permission System Types and Enums
 * Based on the Playlist Permission System Guide
 */

/**
 * Collaborator Role Enum
 * Defines the role of a user in a playlist collaboration
 */
export enum CollaboratorRole {
  VIEWER = 'VIEWER',        // Chỉ xem playlist, không thể chỉnh sửa
  EDITOR = 'EDITOR',        // Có thể thêm/xóa bài hát, nhưng không thể xóa playlist
}

/**
 * Playlist Visibility Enum
 * Defines who can view the playlist
 */
export enum PlaylistVisibility {
  PUBLIC = 'PUBLIC',         // Mọi người đều xem được
  PRIVATE = 'PRIVATE',       // Chỉ owner và collaborators xem được
  FRIENDS_ONLY = 'FRIENDS_ONLY' // Chỉ bạn bè xem được
}

// Export types for easier importing
export type { PlaylistCollaborator, PlaylistPermissions, PlaylistPermissionContext };

/**
 * Collaborator interface
 * Represents a user who has been invited to collaborate on a playlist
 */
export interface PlaylistCollaborator {
  userId: number;
  name: string;
  email?: string;
  role: CollaboratorRole;
}

/**
 * Permission result interface
 * Contains all permission checks for a user on a playlist
 */
export interface PlaylistPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageCollaborators: boolean;
  isOwner: boolean;
  userRole?: CollaboratorRole;
}

/**
 * Playlist context for permission checking
 */
export interface PlaylistPermissionContext {
  playlist: {
    ownerId?: number;
    visibility: PlaylistVisibility;
    collaborators?: PlaylistCollaborator[];
  };
  currentUser?: {
    id: number;
  };
  isFriend?: boolean; // Whether current user is a friend of the owner
}

