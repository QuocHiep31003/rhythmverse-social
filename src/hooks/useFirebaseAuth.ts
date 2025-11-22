import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { firebaseAuth } from "@/config/firebase-config";
import { authApi } from "@/services/api/authApi";

type FirebaseAuthStatus = "idle" | "loading" | "ready" | "error";

export function useFirebaseAuth(userId?: number) {
  const [status, setStatus] = useState<FirebaseAuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setStatus("idle");
      setFirebaseUid(null);
      return;
    }

    setStatus("loading");
    setError(null);

    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;

    const ensureSignedIn = async () => {
      try {
        const { token, userId: firebaseUserId } = await authApi.getFirebaseToken();
        if (cancelled) return;
        await signInWithCustomToken(firebaseAuth, token);
        console.log(`[useFirebaseAuth] Signed in Firebase as user ${firebaseUserId}`);
        if (cancelled) return;
        unsubscribeAuth = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
          if (firebaseUser) {
            setFirebaseUid(firebaseUser.uid);
            setStatus("ready");
          } else {
            setFirebaseUid(null);
            setStatus("error");
            setError("Firebase user signed out unexpectedly");
          }
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useFirebaseAuth] Failed to sign in with custom token", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    void ensureSignedIn();

    return () => {
      cancelled = true;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [userId]);

  return {
    firebaseStatus: status,
    firebaseUid,
    firebaseReady: status === "ready",
    firebaseError: error,
  };
}


