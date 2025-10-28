import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/services/api";
import { friendsApi, inviteLinksApi } from "@/services/api/friendsApi";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Footer from "@/components/Footer";
import useChatSocket from "@/hooks/useChatSocket";
import { chatApi, ChatMessageDTO } from "@/services/api/chatApi";
import { useMusic } from "@/contexts/MusicContext";

import {
  MessageCircle,
  Users,
  Heart,
  Share2,
  Send,
  Search,
  UserPlus,
  Music,
  Flame,
  Headphones,
  Play
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: "text" | "song";
  songData?: {
    title: string;
    artist: string;
  };
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  isOnline: boolean;
  currentlyListening?: {
    title: string;
    artist: string;
  };
  streak: number;
}

interface ApiFriendDTO {
  id: number; // relationship id
  friendId: number;
  friendName: string;
  friendEmail: string;
  friendAvatar: string | null;
  createdAt: string;
}
interface ApiPendingDTO {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string | null;
  receiverId: number;
  receiverName?: string;
  status: string;
  createdAt: string;
}

const Social = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const inviteCode = (searchParams.get('inviteCode') || '').trim();

  // Token presence helper
  const hasToken = useMemo(() => {
    try {
      return !!(
        localStorage.getItem('token') ||
        localStorage.getItem('adminToken') ||
        ((): string | null => { try { return sessionStorage.getItem('token'); } catch { return null; } })()
      );
    } catch {
      try { return !!(localStorage.getItem('token') || localStorage.getItem('adminToken')); } catch { return false; }
    }
  }, []);

  // Preserve invite URL so after login we can return
  useEffect(() => {
    if (inviteCode) {
      try {
        localStorage.setItem('pendingInviteUrl', window.location.pathname + window.location.search);
      } catch {}
    }
  }, [inviteCode]);

  // Auto-accept once when returning with a valid token
  const inviteAutoTried = useRef(false);
  useEffect(() => {
    if (!inviteCode || !hasToken || inviteAutoTried.current) return;
    inviteAutoTried.current = true;
    // try accept silently
    handleAcceptInviteFromQuery();
  }, [inviteCode, hasToken]);
  const [pending, setPending] = useState<ApiPendingDTO[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [collabInvites, setCollabInvites] = useState<any[]>([]);
  const [loadingCollabInvites, setLoadingCollabInvites] = useState<boolean>(false);

  // Note: do not memoize userId; always read latest from localStorage
  const meId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [localStorage.getItem('userId')]);

  // Music context (for sharing current song)
  const { currentSong, playSong } = useMusic();

  // Chat state: messages per friend id
  const [chatByFriend, setChatByFriend] = useState<Record<string, Message[]>>({});

  // WebSocket send and onMessage handler
  const { sendMessage } = useChatSocket(meId || 0, (rawMsg: any) => {
    try {
      const friendId = String(rawMsg.senderId === meId ? rawMsg.receiverId : rawMsg.senderId);
      const parsed = parseIncomingContent(rawMsg as ChatMessageDTO, friends);
      setChatByFriend(prev => ({ ...prev, [friendId]: [...(prev[friendId] || []), parsed] }));
    } catch (e) {
      console.error('WS message parse error', e);
    }
  });

  const loadFriends = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const idNum = raw ? Number(raw) : NaN;
    if (!Number.isFinite(idNum)) return;
    setLoadingFriends(true);
    try {
      const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(idNum);
      const mapped: Friend[] = apiFriends.map((f) => ({
        id: String(f.friendId || f.id),
        name: f.friendName || `User ${f.friendId}`,
        username: f.friendEmail ? `@${(f.friendEmail.split('@')[0] || '').toLowerCase()}` : `@user${f.friendId}`,
        avatar: f.friendAvatar || undefined,
        isOnline: false,
        streak: 0,
      }));
      setFriends(mapped);
      if (mapped.length > 0) setSelectedChat((prev) => prev ?? mapped[0].id);
    } catch (e) {
      console.error('Failed to load friends', e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadPending = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const idNum = raw ? Number(raw) : NaN;
    if (!Number.isFinite(idNum)) return;
    setLoadingPending(true);
    try {
      const data: ApiPendingDTO[] = await friendsApi.getPending(idNum);
      setPending(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load pending requests', e);
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadFriends(), loadPending(), loadCollabInvites()]);
      // Load current profile for "My Profile" section
      try {
        const me = await authApi.me();
        setProfileName(me?.name || me?.username || "");
        setProfileEmail(me?.email || "");
      } catch { }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCollabInvites = async () => {
    setLoadingCollabInvites(true);
    try {
      const list = await playlistCollabInvitesApi.pending();
      setCollabInvites(Array.isArray(list) ? list : []);
    } catch { setCollabInvites([]); }
    finally { setLoadingCollabInvites(false); }
  };

  const handleAcceptCollabInvite = async (inviteId: number) => {
    try { await playlistCollabInvitesApi.accept(inviteId); toast.success('Invite accepted'); await loadCollabInvites(); }
    catch (e: any) { toast.error(e?.message || 'Failed to accept'); }
  };

  const handleRejectCollabInvite = async (inviteId: number) => {
    try { await playlistCollabInvitesApi.reject(inviteId); toast.success('Invite rejected'); await loadCollabInvites(); }
    catch (e: any) { toast.error(e?.message || 'Failed to reject'); }
  };

/* messages moved to state */

  // Load chat history for selected friend
  useEffect(() => {
    (async () => {
      if (!meId || !selectedChat) return;
      try {
        const history = await chatApi.getHistory(meId, Number(selectedChat));
        const mapped = history.map(h => parseIncomingContent(h, friends));
        setChatByFriend(prev => ({ ...prev, [selectedChat]: mapped }));
      } catch {}
    })();
  }, [meId, selectedChat]);

  const suggestedFriends = [
    { id: "5", name: "Jordan Kim", username: "@jordank", mutualFriends: 3 },
    { id: "6", name: "Taylor Swift", username: "@taylor", mutualFriends: 8 },
    { id: "7", name: "David Wilson", username: "@davidw", mutualFriends: 1 }
  ];

  const friendRequests = [
    { id: "8", name: "Chris Brown", username: "@chrisb", mutualFriends: 2 },
    { id: "9", name: "Amy Wilson", username: "@amyw", mutualFriends: 5 },
    { id: "10", name: "Jake Thompson", username: "@jaket", mutualFriends: 1 }
  ];

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const idNum = Number(requestId);
      if (!Number.isFinite(idNum)) throw new Error("Invalid request id");
      const msg = await friendsApi.accept(idNum);
      toast.success(msg || "Friend request accepted");
      await Promise.all([loadPending(), loadFriends()]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to accept request");
      console.error(e);
    }
  };

  const handleRejectFriendRequest = (requestId: string) => {
    toast('Decline is not supported by API');
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const me = localStorage.getItem('userId');
      if (!me) {
        toast.error('Please login to add friends');
        navigate('/login');
        return;
      }
      const senderId = Number(me);
      const receiverId = Number(userId);
      if (!Number.isFinite(senderId) || !Number.isFinite(receiverId)) {
        throw new Error('Invalid user id');
      }
      const msg = await friendsApi.sendRequest(senderId, receiverId);
      toast.success(msg || 'Friend request sent');
      setRequestedIds((prev) => Array.from(new Set([...prev, userId])));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send request');
      console.error(e);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !meId) return;
    const receiverId = Number(selectedChat);
    const payload = { senderId: meId, receiverId, content: newMessage.trim() };
    sendMessage(payload);
    const msg: Message = { id: `${Date.now()}`, sender: 'You', content: newMessage.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'text' };
    setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }));
    setNewMessage('');
  };

  const handleShareCurrentSong = () => {
    if (!currentSong || !selectedChat || !meId) return;
    const receiverId = Number(selectedChat);
    const content = `SONG:${JSON.stringify({ id: currentSong.id, title: currentSong.title || currentSong.name, artist: currentSong.artist || '' })}`;
    sendMessage({ senderId: meId, receiverId, content });
    const msg: Message = { id: `${Date.now()}`, sender: 'You', content: 'Shared a song', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'song', songData: { title: currentSong.title || currentSong.name, artist: currentSong.artist || '' } };
    setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }));
  };

  const handleSharePlaylistLink = async () => {
    if (!selectedChat || !meId) return;
    try {
      const input = window.prompt('Enter playlist URL (or ID):');
      if (!input) return;
      const url = /^(http|https):/i.test(input) ? input : `${window.location.origin}/playlist/${String(input).trim()}`;
      const receiverId = Number(selectedChat);
      sendMessage({ senderId: meId, receiverId, content: `PLAYLIST_LINK:${url}` });
      const msg: Message = { id: `${Date.now()}`, sender: 'You', content: url, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'text' };
      setChatByFriend(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }));
    } catch {}
  };

  const handleSendPlaylistCollabInvite = async () => {
    if (!selectedChat || !meId) return;
    try {
      const pid = window.prompt('Enter your playlist ID to invite collaborator:');
      if (!pid) return;
      const role = (window.prompt('Role? VIEWER or EDITOR (default VIEWER):') || 'VIEWER').toUpperCase();
      const receiverId = Number(selectedChat);
      await playlistCollabInvitesApi.send(Number(pid), receiverId, role as any);
      toast.success('Collaboration invite sent');
      // Inform via chat
      sendMessage({ senderId: meId, receiverId, content: `COLLAB_INVITE:${JSON.stringify({ playlistId: Number(pid), role })}` });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send invite');
    }
  };

  const messages = chatByFriend;

  const handleCreateInviteLink = async () => {
    try {
      const me = localStorage.getItem('userId');
      if (!me) {
        toast.error('Please login to create invite link');
        navigate('/login');
        return;
      }
      const result = await inviteLinksApi.create(Number(me));
      if (result?.shareUrl) {
        setShareUrl(result.shareUrl);
        try { await navigator.clipboard.writeText(result.shareUrl); } catch { }
        toast.success('Invite link created and copied!', { description: result.shareUrl });
      } else {
        toast.success('Invite link created');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create invite link');
      console.error(e);
    }
  };

  const handleAcceptInviteFromQuery = async () => {
    if (!inviteCode) return;
    try {
      const prevCount = friends.length;
      const res = await inviteLinksApi.accept(inviteCode);
      // After accepting, try to refresh friends immediately
      if (meId) {
        try {
          const apiFriends: ApiFriendDTO[] = await friendsApi.getFriends(meId);
          const mapped: Friend[] = apiFriends.map((f) => ({
            id: String(f.friendId || f.id),
            name: f.friendName || `User ${f.friendId}`,
            username: f.friendEmail ? `@${(f.friendEmail.split('@')[0] || '').toLowerCase()}` : `@user${f.friendId}`,
            avatar: f.friendAvatar || undefined,
            isOnline: false,
            streak: 0,
          }));
          setFriends(mapped);
          if (mapped.length > 0) setSelectedChat((prev) => prev ?? mapped[0].id);
          const becameFriends = mapped.length > prevCount;
          const msg = typeof res === 'string' ? res : (res?.message || (becameFriends ? 'You are now friends!' : 'Request sent to inviter'));
          toast.success(msg);
        } catch {
          const msg = typeof res === 'string' ? res : (res?.message || 'Request sent to inviter');
          toast.success(msg);
        }
      } else {
        const msg = typeof res === 'string' ? res : (res?.message || 'Request sent to inviter');
        toast.success(msg);
      }
      navigate('/social');
    } catch (e: any) {
      const raw = String(e?.message || 'Failed to accept invite');
      if (/401|unauthorized/i.test(raw)) {
        toast.error('Please login to accept the invite');
        try {
          const ret = window.location.pathname + window.location.search;
          localStorage.setItem('pendingInviteUrl', ret);
          navigate(`/login?redirect=${encodeURIComponent(ret)}`);
        } catch {}
        return;
      }
      // Surface clearer messages for common domain errors
      if (/already\s*friend/i.test(raw)) {
        toast.error('Already friends');
      } else if (/already\s*sent|duplicate/i.test(raw)) {
        toast.error('Friend request already sent');
      } else if (/expired|invalid\s*invite/i.test(raw)) {
        toast.error('Invalid or expired invite link');
      } else {
        toast.error(raw);
      }
    }
  };

  const handleDeclineInviteFromQuery = () => {
    toast('Invite dismissed');
    navigate('/social');
  };

  const renderFriendsList = () => (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedChat === friend.id
            ? "bg-primary/20 border border-primary/40"
            : "bg-muted/10 hover:bg-muted/20"
            }`}
          onClick={() => setSelectedChat(friend.id)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-primary text-white text-sm">
                  {friend.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {friend.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{friend.name}</p>
                {friend.streak >= 7 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-500">{friend.streak}</span>
                  </div>
                )}
              </div>
              {friend.currentlyListening ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Headphones className="w-3 h-3" />
                  <span className="truncate">
                    {friend.currentlyListening.title} Ã¢â‚¬Â¢ {friend.currentlyListening.artist}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{friend.username}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMessages = () => {
    const currentMessages = selectedChat ? messages[selectedChat] || [] : [];

    return (
      <div className="space-y-4">
        {currentMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "You" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === "You"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/20"
                }`}
            >
              {message.type === "song" && message.songData ? (
                <div className="space-y-2">
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center gap-2 p-2 rounded bg-black/10">
                    <div className="w-8 h-8 bg-gradient-primary rounded flex items-center justify-center">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{message.songData.title}</p>
                      <p className="text-xs opacity-80 truncate">{message.songData.artist}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
              <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Social Hub
            </h1>
            <p className="text-muted-foreground">
              Connect with friends, share music, and discover new sounds together
            </p>
          </div>

          {inviteCode && (
            <div className="mb-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Friend Invite</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-2">
                  <p className="text-sm text-muted-foreground flex-1">You received a friend invite. Accept to send a request to the inviter.</p>
                  <div className="flex gap-2">
                    <Button variant="hero" onClick={handleAcceptInviteFromQuery}>Accept</Button>
                    <Button variant="outline" onClick={handleDeclineInviteFromQuery}>Decline</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users className="w-4 h-4" />
                Friends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
                {/* Friends List */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Messages
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto">
                    {loadingFriends ? (
                      <p className="text-sm text-muted-foreground">Loading friends...</p>
                    ) : friends.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{meId ? 'No friends yet.' : 'Login to see your friends.'}</p>
                    ) : (
                      renderFriendsList()
                    )}
                  </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 lg:col-span-2 flex flex-col">
                  {selectedChat ? (
                    <>
                      <CardHeader className="border-b border-border/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {friends.find(f => f.id === selectedChat)?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {friends.find(f => f.id === selectedChat)?.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {friends.find(f => f.id === selectedChat)?.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 p-4 overflow-y-auto">
                        {renderMessages()}
                      </CardContent>

                      <div className="p-4 border-t border-border/20">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button variant="hero" size="icon" onClick={handleSendMessage}>
                            <Send className="w-4 h-4" />
                          </Button>
                          {currentSong && (
                            <Button variant="outline" size="sm" className="ml-2" onClick={handleShareCurrentSong}>
                              <Music className="w-4 h-4 mr-2" /> Share current song
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="ml-2" onClick={handleSharePlaylistLink}>
                            Share playlist link
                          </Button>
                          <Button variant="outline" size="sm" className="ml-2" onClick={handleSendPlaylistCollabInvite}>
                            Invite to collaborate
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                        <p className="text-muted-foreground">Choose a friend to start messaging</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="friends">
              {/* Friend Requests */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Friend Requests{!loadingPending ? ` (${pending.length})` : ''}
                      </CardTitle>
                      <Button size="sm" variant="outline" onClick={loadPending}>
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loadingPending ? (
                      <p className="text-sm text-muted-foreground">Loading pending requests...</p>
                    ) : pending.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending requests</p>
                    ) : (
                      pending.map((request) => (
                        <div key={request.id} className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-accent text-white">
                              {request.senderName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium">{request.senderName}</h4>
                            <p className="text-xs text-muted-foreground">Requested at {request.createdAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={() => handleAcceptFriendRequest(String(request.id))}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectFriendRequest(String(request.id))}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pending Collaboration Invites */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Collaboration Invites
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loadingCollabInvites ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : collabInvites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending collaboration invites</p>
                    ) : (
                      collabInvites.map((inv: any) => (
                        <div key={inv.id} className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">Playlist: {inv.playlistName || inv.playlistId}</h4>
                            <p className="text-xs text-muted-foreground">From: {inv.senderName || inv.senderId} â€¢ Role: {inv.role}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="hero" onClick={() => handleAcceptCollabInvite(inv.id)}>Accept</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectCollabInvite(inv.id)}>Reject</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
              {/* My Profile */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      My Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-lg">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-primary text-white text-lg">
                          {(() => {
                            const name = profileName && profileName.trim().length > 0 ? profileName : (profileEmail.split('@')[0] || 'U');
                            const parts = name.trim().split(' ').filter(Boolean);
                            const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : name[0];
                            return (initials || 'U').toUpperCase();
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{profileName || (profileEmail ? profileEmail.split('@')[0] : 'Your Username')}</h3>
                        <p className="text-muted-foreground">
                          @{profileEmail ? profileEmail.split('@')[0] : (profileName ? profileName.toLowerCase().replace(/\s+/g, '') : 'yourusername')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{friends.length} friends</Badge>
                          <Badge variant="outline">Premium</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button variant="hero" size="sm" className="mb-2" onClick={handleCreateInviteLink}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Profile
                        </Button>
                        <p className="text-xs text-muted-foreground break-all">
                          {shareUrl
                            ? (
                              <a href={shareUrl} target="_blank" rel="noreferrer" className="underline">
                                {shareUrl}
                              </a>
                            ) : (
                              <>
                                Share: Click "Share Profile" to generate an invite link
                              </>
                            )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Suggested Friends */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Suggested Friends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggestedFriends.map((person) => (
                      <div key={person.id} className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-neon text-white">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{person.name}</h4>
                          <p className="text-sm text-muted-foreground">{person.username}</p>
                          <p className="text-xs text-muted-foreground">{person.mutualFriends} mutual friends</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendFriendRequest(person.id)}
                          disabled={requestedIds.includes(person.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          {requestedIds.includes(person.id) ? 'Requested' : 'Add Friend'}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Friends List */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {friend.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{friend.name}</h3>
                          <p className="text-sm text-muted-foreground">{friend.username}</p>
                        </div>
                        {friend.streak >= 7 && (
                          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-500">{friend.streak}</span>
                          </div>
                        )}
                      </div>

                      {friend.currentlyListening && (
                        <div className="bg-muted/10 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Headphones className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">Currently listening</span>
                          </div>
                          <p className="text-sm font-medium">{friend.currentlyListening.title}</p>
                          <p className="text-xs text-muted-foreground">{friend.currentlyListening.artist}</p>
                        </div>
                      )}

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedChat(friend.id)}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              const me = localStorage.getItem('userId') || sessionStorage.getItem('userId');
                              if (!me) throw new Error('Missing user id');
                              const ok = window.confirm(`Unfriend ${friend.name}?`);
                              if (!ok) return;
                              await friendsApi.remove(Number(me), Number(friend.id));
                              await loadFriends();
                              if (selectedChat === friend.id) setSelectedChat(null);
                              toast.success('Unfriended');
                            } catch (e: any) { toast.error(e?.message || 'Failed to unfriend'); }
                          }}>
                            Unfriend
                          </Button>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Social;


function parseIncomingContent(m: ChatMessageDTO, friends: any[]): Message {
  let type: "text" | "song" = "text";
  let songData: any = undefined;
  let content = m.content || "";
  if (content.startsWith("SONG:")) {
    type = "song";
    try { const data = JSON.parse(content.slice(5)); songData = { title: data.title, artist: data.artist }; } catch {}
  }
  const sender = ((): string => {
    try {
      const me = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : NaN;
      if (Number.isFinite(me) && m.senderId === me) return 'You';
    } catch {}
    const f = friends?.find((x: any) => Number(x.id) === m.senderId);
    return f?.name || `User ${m.senderId}`;
  })();
  const timestamp = new Date(m.sentAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (content.startsWith("PLAYLIST_LINK:")) { content = content.slice(14); } else if (content.startsWith("COLLAB_INVITE:")) { try { const data = JSON.parse(content.slice(14)); content = `Collab invite for playlist #${data.playlistId} (role: ${data.role})`; } catch {} } return { id: String(m.id), sender, content, timestamp, type, songData };
}
