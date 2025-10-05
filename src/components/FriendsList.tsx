import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { UserPlus, Check, X, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Friend {
  id: string;
  friend_id: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export const FriendsList = () => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState("");

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id,
        status,
        profiles!friendships_friend_id_fkey(full_name, email)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (data) setFriends(data as any);
  };

  const loadRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        status,
        profiles!friendships_user_id_fkey(full_name, email)
      `)
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (data) setRequests(data as any);
  };

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const sendFriendRequest = async () => {
    if (!searchEmail) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find user by email
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', searchEmail)
        .single();

      if (!targetUser) {
        toast({
          title: "User not found",
          description: "No user with that email exists",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Friend request sent",
        description: "Your request has been sent",
      });
      setSearchEmail("");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send request",
        variant: "destructive",
      });
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Friend request accepted",
      });
      loadFriends();
      loadRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      loadRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Search by email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
        />
        <Button onClick={sendFriendRequest}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      </div>

      {requests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Friend Requests</h3>
          <div className="space-y-2">
            {requests.map((request) => (
              <Card key={request.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{request.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptRequest(request.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectRequest(request.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Friends</h3>
        <div className="space-y-2">
          {friends.map((friend) => (
            <Card key={friend.id} className="p-4">
              <p className="font-medium">{friend.profiles.full_name}</p>
              <p className="text-sm text-muted-foreground">{friend.profiles.email}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};