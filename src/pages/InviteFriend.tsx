import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { inviteLinksApi } from "@/services/api/friendsApi";
import { UserPlus, Ban, Link as LinkIcon } from "lucide-react";

const InviteFriend = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [inviter, setInviter] = useState<{ name: string; avatar?: string | null } | null>(null);
  const inviteCode = useMemo(() => (code || "").trim(), [code]);

  const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const userId = userIdRaw ? Number(userIdRaw) : undefined;

  useEffect(() => {
    if (!inviteCode) {
      toast.error("Invalid invite link");
      return;
    }
    (async () => {
      try {
        const data = await inviteLinksApi.preview(inviteCode);
        if (data) setInviter({ name: data.inviterName || data.name || 'Unknown', avatar: data.inviterAvatar || data.avatar || null });
      } catch {
        // ignore preview failure
      }
    })();
  }, [inviteCode]);

  const handleAccept = async () => {
    if (!inviteCode) return;
    if (!userId) {
      toast.error("Please login to accept the invite");
      navigate("/login");
      return;
    }
    try {
      setSubmitting(true);
      const res = await inviteLinksApi.accept(inviteCode);
      const msg = typeof res === 'string' ? res : (res?.message || 'Invite accepted');
      toast.success(msg);
      navigate('/social');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to accept invite');
      // stay on page for retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast("Invite dismissed");
    navigate('/social');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-center">Friend Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!inviteCode ? (
            <p className="text-center text-muted-foreground">This invite link is invalid.</p>
          ) : (
            <>
              <p className="text-center text-muted-foreground">
                {inviter ? (
                  <span>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 rounded-full overflow-hidden align-middle">
                        {/* simple avatar preview */}
                        {inviter.avatar ? (
                          <img src={inviter.avatar} alt={inviter.name} className="h-6 w-6 object-cover" />
                        ) : (
                          <span className="h-6 w-6 flex items-center justify-center bg-muted rounded-full text-[10px]">
                            {inviter.name.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{inviter.name}</span>
                    </span>{' '}invited you to be friends.
                  </span>
                ) : (
                  'Someone invited you to connect as friends. Accept to send a friend request back to the inviter.'
                )}
              </p>
              {!userId && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-3 rounded-md text-sm text-center">
                  You need to login to continue.
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" variant="hero" onClick={handleAccept} disabled={submitting || !inviteCode}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button className="flex-1" variant="outline" onClick={handleDecline} disabled={submitting}>
                  <Ban className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={handleCopy}>
                <LinkIcon className="w-4 h-4 mr-2" /> Copy Invite Link
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteFriend;
