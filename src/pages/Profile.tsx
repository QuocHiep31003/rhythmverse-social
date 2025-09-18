import { useState } from "react";
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

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
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
    songsPlayed: "15,678",
    playlistsCreated: 24,
    followersCount: 156,
    followingCount: 89,
    streakDays: 47
  };

  const recentActivity = [
    { type: "played", item: "Cosmic Dreams", artist: "StarGazer", time: "2 hours ago" },
    { type: "liked", item: "Night Vibes", artist: "Chill Collective", time: "5 hours ago" },
    { type: "playlist", item: "Created 'Road Trip 2024'", time: "Yesterday" },
    { type: "followed", item: "Followed DJ ElectroFlow", time: "2 days ago" }
  ];

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
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10">
                      <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                        {activity.type === "played" && <Play className="w-4 h-4 text-white" />}
                        {activity.type === "liked" && <Heart className="w-4 h-4 text-white" />}
                        {activity.type === "playlist" && <Music className="w-4 h-4 text-white" />}
                        {activity.type === "followed" && <Users className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.item}</p>
                        {activity.artist && (
                          <p className="text-sm text-muted-foreground">by {activity.artist}</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                  ))}
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