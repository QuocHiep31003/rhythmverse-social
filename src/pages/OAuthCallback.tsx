import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { authApi } from "@/services/api";
import { setTokens, startTokenRefreshInterval } from "@/services/api/config";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Xử lý đăng nhập với Google...");
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const resolveRedirectTarget = useCallback(() => {
    try {
      const explicitRedirect = searchParams.get("redirect");
      const stateRedirect = searchParams.get("state")
        ? decodeURIComponent(searchParams.get("state") as string)
        : null;
      const storedRedirect =
        sessionStorage.getItem("postLoginRedirect") ||
        localStorage.getItem("postLoginRedirect");
      const pendingInvite =
        localStorage.getItem("pendingInviteUrl") || sessionStorage.getItem("pendingInviteUrl");

      const target =
        explicitRedirect ||
        stateRedirect ||
        storedRedirect ||
        pendingInvite ||
        "/";

      // Cleanup hint once resolved
      try {
        sessionStorage.removeItem("postLoginRedirect");
        localStorage.removeItem("postLoginRedirect");
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem("pendingInviteUrl");
        sessionStorage.removeItem("pendingInviteUrl");
      } catch {
        /* ignore */
      }

      return target;
    } catch {
      return "/";
    }
  }, [searchParams]);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh") || searchParams.get("refreshToken");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(errorParam);
      setStatus("Đăng nhập bằng Google thất bại.");
      return;
    }

    if (!token) {
      setError("Thiếu token trong callback từ Google.");
      setStatus("Không thể đăng nhập.");
      return;
    }

    setStatus("Đang lưu phiên đăng nhập...");
    setTokens(token, refreshToken || undefined);
    startTokenRefreshInterval();

    const completeLogin = async () => {
      try {
        setStatus("Đang lấy thông tin người dùng...");
        const me = await authApi.me().catch(() => undefined);
        const userId =
          me && (me.id || me.userId || me.userID || me.user_id)
            ? String(me.id || me.userId || me.userID || me.user_id)
            : null;

        if (userId) {
          try {
            localStorage.setItem("userId", userId);
            sessionStorage.setItem("userId", userId);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.warn("[OAuthCallback] Failed to fetch /me after OAuth:", err);
      } finally {
        const target = resolveRedirectTarget();
        // Force full page reload after OAuth2 login to ensure Firebase recognizes top-level origin
        // This fixes the issue where "Share Profile" doesn't work until manual reload
        // OAuth2 redirect flow doesn't trigger a true top-level navigation, so Firebase
        // treats the page as "outside of the top-level site" and blocks sensitive APIs
        window.location.replace(target);
      }
    };

    completeLogin();
  }, [navigate, resolveRedirectTarget, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-gradient-glass border-white/10 backdrop-blur-sm">
        <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
          {!error ? (
            <>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <h1 className="text-xl font-semibold text-white">Đang hoàn tất đăng nhập...</h1>
              <p className="text-sm text-muted-foreground">{status}</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold text-white">Đăng nhập thất bại</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="hero" className="w-full" onClick={() => navigate("/login")}>
                Quay về trang đăng nhập
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;
