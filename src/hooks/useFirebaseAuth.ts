import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { firebaseAuth } from "@/config/firebase-config";
import { authApi } from "@/services/api/authApi";
import { getAuthToken, isTokenExpiringSoon } from "@/services/api/config";

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
    let retryTimeout: NodeJS.Timeout | undefined;

    const ensureSignedIn = async (retryCount = 0) => {
      try {
        // ✅ Double check: nếu đã sign in rồi thì không sign in lại
        const currentUser = firebaseAuth.currentUser;
        if (currentUser && currentUser.uid === String(userId) && signedInUserIdRef.current === userId) {
          console.log(`[useFirebaseAuth] Already signed in, skipping sign in for user ${userId}`);
          setFirebaseUid(currentUser.uid);
          setStatus("ready");
          return;
        }

        // ✅ Kiểm tra JWT token trước khi gọi getFirebaseToken
        // ✅ Nếu tab mới mở, đợi một chút để token có thể được share từ tab khác
        let jwtToken = getAuthToken();
        if (!jwtToken && retryCount < 3) {
          // Đợi token được share từ tab khác (MusicContext sẽ share token qua BroadcastChannel)
          const waitTime = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
          console.log(`[useFirebaseAuth] No JWT token found, waiting ${waitTime}ms for token from other tabs... (retry ${retryCount + 1}/3)`);
          // Clear timeout cũ nếu có
          if (retryTimeout) {
            clearTimeout(retryTimeout);
          }
          retryTimeout = setTimeout(() => {
            if (!cancelled) {
              ensureSignedIn(retryCount + 1);
            }
          }, waitTime);
          return;
        }

        if (!jwtToken) {
          // Sau 3 lần retry vẫn không có token, chỉ log info (không phải warning)
          console.log(`[useFirebaseAuth] No JWT token found after retries, skipping Firebase auth for user ${userId}. This is normal for new tabs.`);
          setStatus("error");
          setError("No JWT token available");
          return;
        }

        // ✅ Kiểm tra token có hết hạn không
        if (isTokenExpiringSoon(jwtToken, 0)) {
          console.warn(`[useFirebaseAuth] JWT token expired, skipping Firebase auth for user ${userId}`);
          setStatus("error");
          setError("JWT token expired");
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
        
        // ✅ Xử lý lỗi tốt hơn - không throw error nếu chỉ là lỗi Firebase auth
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn("[useFirebaseAuth] Failed to sign in with custom token", errorMessage);
        
        // ✅ Nếu là lỗi "User not authenticated" hoặc 401, chỉ log warning, không throw
        // Firebase auth là optional cho chat/social features, không nên block user
        if (errorMessage.includes("not authenticated") || errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
          console.warn("[useFirebaseAuth] Firebase auth failed but user is still logged in. Chat/social features may not work.");
          setStatus("error");
          setError("Firebase authentication unavailable");
          signedInUserIdRef.current = null;
          return; // ✅ Không throw error, chỉ set status
        }
        
        setStatus("error");
        setError(errorMessage);
        signedInUserIdRef.current = null; // ✅ Reset khi lỗi
      }
    };

    void ensureSignedIn();

    return () => {
      cancelled = true;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
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


