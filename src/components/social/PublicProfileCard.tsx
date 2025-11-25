import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddFriendButton } from "@/components/social/AddFriendButton";
import { API_BASE_URL } from "@/services/api/config";

export interface PublicProfileDTO {
  id?: number;
  username?: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

const toAbsoluteUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  const base = API_BASE_URL.replace(/\/?$/, "");
  if (u.startsWith("/")) return `${base}${u}`;
  return `${base}/${u}`;
};

export function PublicProfileCard({ profile, onAddFriendSuccess }: { profile: PublicProfileDTO; onAddFriendSuccess?: () => void }) {
  const isLoggedIn = (() => {
    try { return !!(localStorage.getItem('token') || sessionStorage.getItem('token')); } catch { return false; }
  })();
  const isSelf = (() => {
    try {
      const me = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      return !!(me && profile?.id && Number(me) === Number(profile.id));
    } catch { return false; }
  })();

  const rawUsername = (profile.username || "").toString().trim();
  const displayName = (profile.name || rawUsername || "Ẩn danh").toString().trim();
  const usernameTag = rawUsername ? `@${rawUsername}` : null;
  const bio = (profile.bio || "").trim();
  const avatarUrl = toAbsoluteUrl(profile.avatar);
  const initialSource = displayName || rawUsername || "?";
  const initial = initialSource.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 p-8 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(129,140,248,0.25),transparent_70%)]" />
      </div>
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
          <Avatar className="relative h-28 w-28 border-4 border-white/20 shadow-xl">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="text-2xl font-semibold">{initial}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">{displayName}</h2>
            {usernameTag ? <p className="text-sm font-medium text-primary/80">{usernameTag}</p> : null}
          </div>
          {bio ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground opacity-80">Người dùng này chưa cập nhật tiểu sử.</p>
          )}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            {isLoggedIn && !isSelf && profile?.id ? (
              <AddFriendButton targetUserId={Number(profile.id)} onSuccess={onAddFriendSuccess} />
            ) : (
              <span className="text-xs uppercase tracking-wide text-muted-foreground opacity-70">
                {isSelf ? "Đây là profile của bạn" : "Đăng nhập để kết nối với người dùng này"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

