import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicProfileApi } from "@/services/api/friendsApi";
import { toast } from "@/hooks/use-toast";
import { SocialInlineCard } from "@/components/social/SocialInlineCard";
import { PublicProfileCard } from "@/components/social/PublicProfileCard";

const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id?: number; username?: string; name?: string | null; avatar?: string | null; bio?: string | null } | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const p = await publicProfileApi.get(username || "");
        setProfile(p);
      } catch (e: any) {
        if (String(e?.message || '').match(/404|not\s*found/i)) {
          setProfile(null);
        } else {
          toast({ title: "Không tải được profile", description: e?.message || "Lỗi không xác định" });
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [username]);

  return (
    <div className="container mx-auto max-w-2xl p-4">
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : profile ? (
        <PublicProfileCard profile={profile} />
      ) : (
        <SocialInlineCard type="not-found" message="Vui lòng kiểm tra lại username hoặc đường dẫn." />
      )}
    </div>
  );
};

export default PublicProfilePage;


