import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type PlaylistChatHeadProps = {
  name: string;
  coverUrl?: string | null;
  unreadCount?: number;
  onClick: () => void;
};

export const PlaylistChatHead = ({
  name,
  coverUrl,
  unreadCount = 0,
  onClick,
}: PlaylistChatHeadProps) => {
  const badge =
    typeof unreadCount === "number" && unreadCount > 0
      ? unreadCount > 99
        ? "99+"
        : String(unreadCount)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-28 right-6 z-40 flex items-center justify-center",
        "h-14 w-14 rounded-full shadow-2xl border border-border/60",
        "bg-background/90 backdrop-blur-md hover:bg-background/100 transition-colors"
      )}
      aria-label={`Open chat for playlist ${name}`}
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border border-border/70 shadow-md">
          {coverUrl ? (
            <AvatarImage src={coverUrl || undefined} alt={name} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        {badge && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center shadow-lg">
            {badge}
          </div>
        )}
      </div>
    </button>
  );
};


