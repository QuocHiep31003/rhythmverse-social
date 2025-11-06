import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { inviteLinksApi, type InvitePreviewDTO } from "@/services/api/friendsApi";
import { UserPlus, Ban } from "lucide-react";

const InviteFriend = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<InvitePreviewDTO | null>(null);
  const [accepted, setAccepted] = useState(false);
  const inviteCode = useMemo(() => (code || "").trim(), [code]);

  const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const userId = userIdRaw ? Number(userIdRaw) : undefined;

  useEffect(() => {
    if (!inviteCode) {
      setLoading(false);
      toast.error("Invalid invite link");
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await inviteLinksApi.preview(inviteCode);
        setPreview(data);
      } catch (e: any) {
        const msg = e?.message || 'Failed to load invite preview';
        toast.error(msg);
        setPreview(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteCode]);

  const handleAccept = async () => {
    if (!inviteCode) return;
    if (!userId) {
      toast.error("Vui lòng đăng nhập để chấp nhận lời mời");
      const returnUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    try {
      setSubmitting(true);
      const res = await inviteLinksApi.accept(inviteCode);
      const msg = typeof res === 'string' ? res : 'Đã chấp nhận lời mời';
      toast.success(msg);
      setAccepted(true);
      // Redirect sau 2 giây
      setTimeout(() => {
        navigate('/social');
      }, 2000);
    } catch (e: any) {
      const msg = e?.message || 'Không thể chấp nhận lời mời';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast("Đã từ chối lời mời");
    navigate('/social');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Đang tải...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteCode || !preview) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-center">Lời mời không hợp lệ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Link mời không hợp lệ hoặc đã hết hạn.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-semibold">Bạn đã trở thành bạn bè!</p>
              <p className="text-sm text-muted-foreground">Đang chuyển hướng...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-center">Lời mời kết bạn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={preview.inviterAvatar || undefined} alt={preview.inviterName} />
              <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                {preview.inviterName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{preview.message}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tham gia EchoVerse cùng {preview.inviterName}
              </p>
            </div>
          </div>

          {!userId && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-3 rounded-md text-sm text-center">
              Bạn cần đăng nhập để tiếp tục.
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              variant="hero" 
              onClick={handleAccept} 
              disabled={submitting || !inviteCode}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Chấp nhận
            </Button>
            <Button 
              className="flex-1" 
              variant="outline" 
              onClick={handleDecline} 
              disabled={submitting}
            >
              <Ban className="w-4 h-4 mr-2" />
              Hủy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteFriend;
