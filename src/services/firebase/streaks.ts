import { firebaseDb } from "@/config/firebase-config";
import { onChildAdded, onChildChanged, onChildRemoved, ref } from "firebase/database";

export interface FirebaseStreakPayload {
  event?: "updated" | "ended" | string;
  streak?: number;
  expireAt?: number | null;
  lastInteraction?: string | null;
  friendId?: number;
  updatedAt?: number;
}

export const watchStreakUpdates = (
  userId: number,
  callback: (friendId: number, payload: FirebaseStreakPayload | null) => void
) => {
  const streakRef = ref(firebaseDb, `streaks/${userId}`);

  const unsubAdded = onChildAdded(streakRef, (snapshot) => {
    const friendId = snapshot.key ? Number(snapshot.key) : NaN;
    if (!Number.isFinite(friendId)) return;
    const payload = snapshot.val() as FirebaseStreakPayload;
    callback(friendId, payload);
  });

  const unsubChanged = onChildChanged(streakRef, (snapshot) => {
    const friendId = snapshot.key ? Number(snapshot.key) : NaN;
    if (!Number.isFinite(friendId)) return;
    const payload = snapshot.val() as FirebaseStreakPayload;
    callback(friendId, payload);
  });

  const unsubRemoved = onChildRemoved(streakRef, (snapshot) => {
    const friendId = snapshot.key ? Number(snapshot.key) : NaN;
    if (!Number.isFinite(friendId)) return;
    callback(friendId, null);
  });

  return () => {
    unsubAdded();
    unsubChanged();
    unsubRemoved();
  };
};

