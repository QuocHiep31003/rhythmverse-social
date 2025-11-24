import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { firebaseAuth } from "@/config/firebase-config";
import { authApi } from "@/services/api/authApi";

type FirebaseAuthStatus = "idle" | "loading" | "ready" | "error";

export function useFirebaseAuth(userId?: number) {
  const [status, setStatus] = useState<FirebaseAuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const signedInUserIdRef = useRef<number | null>(null); // ✅ Track đã sign in cho userId nào

  useEffect(() => {
    if (!userId) {
      setStatus("idle");
      setFirebaseUid(null);
      signedInUserIdRef.current = null;
      return;
    }

    // ✅ Check nếu đã sign in cho userId này rồi thì không sign in lại
    if (signedInUserIdRef.current === userId) {
      const currentUser = firebaseAuth.currentUser;
      if (currentUser && currentUser.uid === String(userId)) {
        console.log(`[useFirebaseAuth] Already signed in for user ${userId}, skipping`);
        return;
      }
    }

    setStatus("loading");
    setError(null);

    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;

    const ensureSignedIn = async () => {
      try {
        // ✅ Double check: nếu đã sign in rồi thì không sign in lại
        const currentUser = firebaseAuth.currentUser;
        if (currentUser && currentUser.uid === String(userId) && signedInUserIdRef.current === userId) {
          console.log(`[useFirebaseAuth] Already signed in, skipping sign in for user ${userId}`);
          setFirebaseUid(currentUser.uid);
          setStatus("ready");
          return;
        }

        const { token, userId: firebaseUserId } = await authApi.getFirebaseToken();
        if (cancelled) return;
        
        // ✅ Check lại trước khi sign in
        if (firebaseAuth.currentUser?.uid === String(userId)) {
          console.log(`[useFirebaseAuth] Already signed in before token call, skipping sign in for user ${userId}`);
          setFirebaseUid(firebaseAuth.currentUser.uid);
          setStatus("ready");
          signedInUserIdRef.current = userId;
          return;
        }

        await signInWithCustomToken(firebaseAuth, token);
        signedInUserIdRef.current = userId; // ✅ Mark đã sign in
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
            signedInUserIdRef.current = null; // ✅ Reset khi sign out
          }
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useFirebaseAuth] Failed to sign in with custom token", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
        signedInUserIdRef.current = null; // ✅ Reset khi lỗi
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


