import { CollaboratorRole } from "@/types/playlist";

export const parseCollaboratorRole = (value: unknown): CollaboratorRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.toUpperCase();
  if (
    normalized === CollaboratorRole.EDITOR ||
    normalized === "COLLABORATOR" ||
    normalized === "EDITORIAL" ||
    normalized === "OWNER"
  ) {
    return CollaboratorRole.EDITOR;
  }
  if (
    normalized === CollaboratorRole.VIEWER ||
    normalized === "VIEW" ||
    normalized === "VIEW_ONLY" ||
    normalized === "READONLY" ||
    normalized === "READ_ONLY"
  ) {
    return CollaboratorRole.VIEWER;
  }
  return undefined;
};

export const normalizeCollaborators = (
  raw: unknown,
): Array<{ userId: number; name: string; email?: string; role?: CollaboratorRole }> => {
  const sourceArray = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { collaborators?: unknown[] }).collaborators)
    ? (raw as { collaborators?: unknown[] }).collaborators
    : [];

  const dedup = new Map<number, { userId: number; name: string; email?: string; role?: CollaboratorRole }>();

  for (const entry of sourceArray) {
    if (!entry || typeof entry !== "object") continue;
    const candidateIds = [
      (entry as { userId?: number }).userId,
      (entry as { id?: number }).id,
      (entry as { collaboratorId?: number }).collaboratorId,
      (entry as { memberId?: number }).memberId,
      (entry as { friendId?: number }).friendId,
      (entry as { receiverId?: number }).receiverId,
    ];
    const userIdValue = candidateIds.find((val) => typeof val === "number" && Number.isFinite(val));
    if (userIdValue == null) continue;

    const roleCandidate =
      (entry as { role?: unknown }).role ??
      (entry as { collaboratorRole?: unknown }).collaboratorRole ??
      (entry as { permission?: unknown }).permission ??
      (entry as { accessLevel?: unknown }).accessLevel ??
      (entry as { userRole?: unknown }).userRole ??
      (entry as { type?: unknown }).type;
    const parsedRole = parseCollaboratorRole(roleCandidate);

    const name =
      (entry as { name?: string }).name ??
      (entry as { username?: string }).username ??
      (entry as { fullName?: string }).fullName ??
      (entry as { displayName?: string }).displayName ??
      (entry as { userName?: string }).userName ??
      (entry as { email?: string }).email ??
      `User ${userIdValue}`;
    const email = typeof (entry as { email?: unknown }).email === "string" ? (entry as { email?: string }).email : undefined;

    const existing = dedup.get(Number(userIdValue));
    const nextRecord = {
      userId: Number(userIdValue),
      name,
      email: email ?? existing?.email,
      role: parsedRole ?? existing?.role,
    };
    dedup.set(Number(userIdValue), nextRecord);
  }

  return Array.from(dedup.values());
};

