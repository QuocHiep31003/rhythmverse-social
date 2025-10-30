import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Footer from "@/components/Footer";
import { 
  Edit, 
  Music, 
  Heart, 
  Users, 
  Calendar, 
  Mail,
  Crown,
  Play,
  Clock,
  TrendingUp,
  Settings,
  Shield,
  Bell,
  Palette,
  Volume2
} from "lucide-react";
import { Trash2 } from "lucide-react";
import { listeningHistoryApi, ListeningHistoryDTO } from "@/services/api/listeningHistoryApi";
import { toast } from "@/hooks/use-toast";
import { songsApi } from "@/services/api/songApi";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = 1; // TODO: Get from auth context
  
  useEffect(() => {
    fetchListeningHistory();
  }, []);

  const fetchListeningHistory = async () => {
    try {
      setLoading(true);
      const data = await listeningHistoryApi.getByUser(userId);
      
      // Sort by listenedAt date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.listenedAt || 0).getTime();
        const dateB = new Date(b.listenedAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
      // Enrich EVERY entry with canonical song details to avoid stale/incorrect names from backend DTO
      const enriched = await Promise.all(
        sortedData.map(async (item) => {
          try {
            const songDetail = await songsApi.getById(String(item.songId));
            if (songDetail) {
              return { ...item, song: {
                id: Number((songDetail as any).id ?? item.songId),
                name: (songDetail as any).name || (songDetail as any).title,
                title: (songDetail as any).title || (songDetail as any).name,
                duration: typeof (songDetail as any).duration === 'number' ? (songDetail as any).duration : undefined,
                cover: (songDetail as any).cover,
                audioUrl: (songDetail as any).audioUrl,
                audio: (songDetail as any).audio,
                playCount: (songDetail as any).playCount,
                artistNames: (songDetail as any).artistNames,
                artists: (songDetail as any).artists,
                album: typeof (songDetail as any).album === 'string' ? { name: (songDetail as any).album } : (songDetail as any).album,
              } } as any;
            }
          } catch {}
          return item;
        })
      );

      setListeningHistory(enriched);
      // Debug: show song IDs from history to verify with player logs
      try {
        // eslint-disable-next-line no-console
        console.log(
          "🧾 History songIds:",
          enriched.map((i) => (i as any).songId ?? (i as any).song?.id)
        );
      } catch {}
    } catch (error: any) {
      console.error("Failed to fetch listening history:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load listening history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await listeningHistoryApi.delete(id);
      setListeningHistory((prev) => prev.filter((h) => h.id !== id));
      toast({ title: "Deleted", description: "Removed from listening history" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  };

  const handleClearAllHistory = async () => {
    if (!listeningHistory.length) return;
    try {
      // Delete sequentially to avoid server overload
      for (const item of listeningHistory) {
        if (item.id) {
          // best-effort; ignore single failures
          try { await listeningHistoryApi.delete(item.id); } catch {}
        }
      }
      setListeningHistory([]);
      toast({ title: "Cleared", description: "All listening history removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear history", variant: "destructive" });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  
  const [profileData, setProfileData] = useState({
    name: "Alex Johnson",
    username: "@alexjohnson",
    email: "alex@example.com",
    bio: "Music enthusiast | Always discovering new sounds | Premium member since 2023",
    joinDate: "January 2023",
    location: "New York, NY"
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    socialSharing: true,
    publicProfile: true,
    showListeningActivity: true,
    autoplay: true,
    crossfade: false,
    normalizeVolume: true
  });

  const stats = {
    totalListeningTime: "1,247 hours",
    songsPlayed: listeningHistory.length.toString(),
    playlistsCreated: 24,
    followersCount: 156,
    followingCount: 89,
    streakDays: 47
  };

  const topGenres = [
    { name: "Electronic", percentage: 35 },
    { name: "Indie Rock", percentage: 28 },
    { name: "Chill", percentage: 20 },
    { name: "Pop", percentage: 12 },
    { name: "Jazz", percentage: 5 }
  ];

  const monthlyStats = [
    { month: "Oct", hours: 45 },
    { month: "Nov", hours: 67 },
    { month: "Dec", hours: 89 },
    { month: "Jan", hours: 112 }
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
    // Save profile logic here
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback className="text-2xl bg-gradient-primary text-white">
                      {profileData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="hero" 
                    size="icon" 
                    className="absolute -bottom-2 -right-2 h-8 w-8"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 text-center md:text-left">
                  {isEditing ? (
                    <div className="space-y-4">
                      <Input
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="text-xl font-bold"
                      />
                      <Textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button variant="hero" onClick={handleSaveProfile}>Save</Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                        <h1 className="text-3xl font-bold">{profileData.name}</h1>
                        <Badge variant="default" className="gap-1">
                          <Crown className="w-3 h-3" />
                          Premium
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-1">{profileData.username}</p>
                      <p className="text-sm mb-4 max-w-md">{profileData.bio}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center md:justify-start">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {profileData.joinDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {profileData.email}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.followersCount}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.followingCount}</div>
                    <div className="text-xs text-muted-foreground">Following</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.streakDays}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.totalListeningTime}</div>
                    <div className="text-xs text-muted-foreground">Total Listening</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Play className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.songsPlayed}</div>
                    <div className="text-xs text-muted-foreground">Songs Played</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Music className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.playlistsCreated}</div>
                    <div className="text-xs text-muted-foreground">Playlists Created</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold">{stats.streakDays}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Genres */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Your Top Genres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topGenres.map((genre, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 text-center text-sm font-medium">#{index + 1}</div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{genre.name}</span>
                          <span className="text-sm text-muted-foreground">{genre.percentage}%</span>
                        </div>
                        <div className="w-full bg-muted/20 rounded-full h-2">
                          <div 
                            className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${genre.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Listening History
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleClearAllHistory} disabled={!listeningHistory.length}>
                      Clear Alloo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading listening history...
                      </div>
                    ) : listeningHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No listening history yet</p>
                        <p className="text-sm">Start playing songs to see your history here</p>
                      </div>
                    ) : (
                      listeningHistory.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <Music className="w-10 h-10 text-primary" />
                          <div className="flex-1">
                            <p
                              className="font-medium"
                              title={`songId: ${(item as any).songId ?? (item as any).song?.id ?? 'unknown'}`}
                            >
                              {item.song?.name || item.song?.title || item.songName || "Unknown Song"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.song?.artistNames?.join(", ") ||
                                item.song?.artists?.map((a: any) => a.name).join(", ") ||
                                item.artistNames?.join(", ") ||
                                "Unknown Artist"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">{formatDate(item.listenedAt)}</p>
                              <p className="text-xs text-muted-foreground">played</p>
                            </div>
                            {item.id && (
                              <Button variant="outline" size="icon" onClick={() => handleDeleteHistory(item.id!)} aria-label="Delete entry">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Listening Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Monthly Listening Hours</h3>
                      <div className="flex items-end gap-2 h-32">
                        {monthlyStats.map((stat, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-full bg-gradient-primary rounded-t"
                              style={{ height: `${(stat.hours / 120) * 100}%` }}
                            />
                            <div className="text-xs mt-2 font-medium">{stat.month}</div>
                            <div className="text-xs text-muted-foreground">{stat.hours}h</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Privacy Settings */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Privacy Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="public-profile">Public Profile</Label>
                      <Switch 
                        id="public-profile"
                        checked={preferences.publicProfile}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, publicProfile: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-activity">Show Listening Activity</Label>
                      <Switch 
                        id="show-activity"
                        checked={preferences.showListeningActivity}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, showListeningActivity: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="social-sharing">Social Sharing</Label>
                      <Switch 
                        id="social-sharing"
                        checked={preferences.socialSharing}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, socialSharing: checked})
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <Switch 
                        id="email-notifications"
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, emailNotifications: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <Switch 
                        id="push-notifications"
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, pushNotifications: checked})
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Playback Settings */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      Playback Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoplay">Autoplay</Label>
                      <Switch 
                        id="autoplay"
                        checked={preferences.autoplay}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, autoplay: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="crossfade">Crossfade</Label>
                      <Switch 
                        id="crossfade"
                        checked={preferences.crossfade}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, crossfade: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="normalize-volume">Normalize Volume</Label>
                      <Switch 
                        id="normalize-volume"
                        checked={preferences.normalizeVolume}
                        onCheckedChange={(checked) => 
                          setPreferences({...preferences, normalizeVolume: checked})
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Account Actions */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Account Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      Export My Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Deactivate Account
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;