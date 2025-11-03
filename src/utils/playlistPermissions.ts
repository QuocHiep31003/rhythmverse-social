/**
 * Playlist Permission Utilities
 * Based on the Playlist Permission System Guide
 */

import {
  CollaboratorRole,
  PlaylistVisibility,
  PlaylistPermissions,
  PlaylistPermissionContext,
  PlaylistCollaborator,
} from '@/types/playlist';

/**
 * Check if user can VIEW a playlist based on visibility rules
 */
export function canViewPlaylist(context: PlaylistPermissionContext): boolean {
  const { playlist, currentUser, isFriend } = context;
  const { ownerId, visibility, collaborators = [] } = playlist;
  
  // Owner can always view
  if (currentUser && ownerId === currentUser.id) {
    return true;
  }
  
  // Collaborators can always view (even if visibility is PRIVATE)
  if (currentUser && collaborators.some(c => c.userId === currentUser.id)) {
    return true;
  }
  
  // Visibility-based rules
  switch (visibility) {
    case PlaylistVisibility.PUBLIC:
      // Anyone can view PUBLIC playlists
      return true;
    
    case PlaylistVisibility.PRIVATE:
      // Only owner and collaborators can view PRIVATE
      return false; // Already handled above
    
    case PlaylistVisibility.FRIENDS_ONLY:
      // Owner + collaborators + friends can view FRIENDS_ONLY
      if (currentUser && ownerId) {
        return isFriend === true;
      }
      return false;
    
    default:
      return false;
  }
}

/**
 * Check if user can EDIT songs in a playlist
 */
export function canEditPlaylistSongs(context: PlaylistPermissionContext): boolean {
  const { playlist, currentUser } = context;
  const { ownerId, collaborators = [] } = playlist;
  
  // Owner can always edit
  if (currentUser && ownerId === currentUser.id) {
    return true;
  }
  
  // Check if user is an EDITOR
  if (currentUser) {
    const userCollab = collaborators.find(c => c.userId === currentUser.id);
    if (userCollab) {
      return userCollab.role === CollaboratorRole.EDITOR;
    }
  }
  
  return false;
}

/**
 * Check if user can DELETE a playlist
 * Only OWNER can delete
 */
export function canDeletePlaylist(context: PlaylistPermissionContext): boolean {
  const { playlist, currentUser } = context;
  const { ownerId } = playlist;
  
  return !!(currentUser && ownerId === currentUser.id);
}

/**
 * Check if user can MANAGE collaborators (invite/remove)
 * Only OWNER can manage collaborators
 */
export function canManageCollaborators(context: PlaylistPermissionContext): boolean {
  const { playlist, currentUser } = context;
  const { ownerId } = playlist;
  
  return !!(currentUser && ownerId === currentUser.id);
}

/**
 * Check if user can UPDATE playlist metadata (name, description, visibility)
 * Only OWNER can update metadata
 */
export function canUpdatePlaylistInfo(context: PlaylistPermissionContext): boolean {
  const { playlist, currentUser } = context;
  const { ownerId } = playlist;
  
  return !!(currentUser && ownerId === currentUser.id);
}

/**
 * Get user's collaborator role in a playlist
 */
export function getUserCollaboratorRole(
  playlist: { collaborators?: PlaylistCollaborator[] },
  userId?: number
): CollaboratorRole | undefined {
  if (!userId) return undefined;
  
  const collab = playlist.collaborators?.find(c => c.userId === userId);
  return collab?.role;
}

/**
 * Get all permissions for a user on a playlist
 */
export function getPlaylistPermissions(context: PlaylistPermissionContext): PlaylistPermissions {
  const { playlist, currentUser } = context;
  const { ownerId } = playlist;
  
  const isOwner = !!(currentUser && ownerId === currentUser.id);
  const userRole = getUserCollaboratorRole(playlist, currentUser?.id);
  
  return {
    canView: canViewPlaylist(context),
    canEdit: canEditPlaylistSongs(context),
    canDelete: canDeletePlaylist(context),
    canManageCollaborators: canManageCollaborators(context),
    isOwner,
    userRole,
  };
}

/**
 * Check if two users are friends
 * This is a placeholder - implement based on your friends API
 */
export async function checkIfFriends(
  userId1: number | undefined,
  userId2: number | undefined
): Promise<boolean> {
  if (!userId1 || !userId2 || userId1 === userId2) return false;
  
  try {
    // Import friends API dynamically to avoid circular dependencies
    const { friendsApi } = await import('@/services/api/friendsApi');
    const friends = await friendsApi.getFriends(userId1);
    return Array.isArray(friends) && friends.some(
      (f: any) => f.friendId === userId2 || f.userId === userId2 || f.id === userId2
    );
  } catch {
    return false;
  }
}

