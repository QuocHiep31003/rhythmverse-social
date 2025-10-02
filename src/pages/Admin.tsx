import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Shield,
  Users,
  Music,
  BarChart3,
  AlertTriangle,
  Settings,
  Search,
  Filter,
  Download,
  RefreshCw,
  Ban,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Crown,
  Calendar,
  TrendingUp
} from "lucide-react";

const Admin = () => {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = {
    totalUsers: 15678,
    activeUsers: 12456,
    premiumUsers: 3421,
    totalSongs: 45892,
    totalPlaylists: 78945,
    reportsToday: 12,
    newUsersToday: 234,
    streamingHours: 89567
  };

  const users = [
    {
      id: 1,
      name: "Alex Johnson",
      email: "alex@example.com",
      role: "Premium",
      status: "active",
      joinDate: "2023-12-15",
      lastActive: "2 hours ago",
      reportsCount: 0
    },
    {
      id: 2,
      name: "Sarah Chen",
      email: "sarah@example.com",
      role: "Free",
      status: "active",
      joinDate: "2024-01-10",
      lastActive: "30 minutes ago",
      reportsCount: 0
    },
    {
      id: 3,
      name: "Mike Rodriguez",
      email: "mike@example.com",
      role: "Moderator",
      status: "active",
      joinDate: "2023-11-20",
      lastActive: "1 hour ago",
      reportsCount: 0
    },
    {
      id: 4,
      name: "Emma Davis",
      email: "emma@example.com",
      role: "Free",
      status: "suspended",
      joinDate: "2024-01-08",
      lastActive: "3 days ago",
      reportsCount: 3
    }
  ];

  const songs = [
    {
      id: 1,
      title: "Cosmic Dreams",
      artist: "StarGazer",
      album: "Galaxy Sounds",
      duration: "3:45",
      uploadDate: "2024-01-15",
      plays: 12567,
      status: "approved",
      reports: 0
    },
    {
      id: 2,
      title: "Night Vibes",
      artist: "Chill Collective",
      duration: "4:12",
      uploadDate: "2024-01-14",
      plays: 8934,
      status: "pending",
      reports: 2
    },
    {
      id: 3,
      title: "Electronic Pulse",
      artist: "TechBeats",
      duration: "5:23",
      uploadDate: "2024-01-13",
      plays: 15432,
      status: "approved",
      reports: 0
    }
  ];

  const reports = [
    {
      id: 1,
      type: "Inappropriate Content",
      targetType: "song",
      targetTitle: "Night Vibes",
      reporter: "User123",
      reason: "Contains explicit lyrics not marked as such",
      date: "2024-01-15 14:30",
      status: "pending"
    },
    {
      id: 2,
      type: "Copyright Violation",
      targetType: "song",
      targetTitle: "Popular Hit Copy",
      reporter: "MusicLover456",
      reason: "This appears to be a copyrighted song",
      date: "2024-01-15 12:15",
      status: "under_review"
    },
    {
      id: 3,
      type: "Spam",
      targetType: "user",
      targetTitle: "SpamUser99",
      reporter: "CleanMusic",
      reason: "User is spamming playlists with promotional content",
      date: "2024-01-14 18:45",
      status: "resolved"
    }
  ];

  const analytics = {
    dailyActiveUsers: [
      { day: "Mon", users: 8500 },
      { day: "Tue", users: 9200 },
      { day: "Wed", users: 8800 },
      { day: "Thu", users: 9600 },
      { day: "Fri", users: 10200 },
      { day: "Sat", users: 12100 },
      { day: "Sun", users: 11800 }
    ],
    topGenres: [
      { genre: "Electronic", percentage: 28 },
      { genre: "Pop", percentage: 24 },
      { genre: "Rock", percentage: 18 },
      { genre: "Hip Hop", percentage: 15 },
      { genre: "Other", percentage: 15 }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": case "approved": case "resolved": return "bg-green-500/10 text-green-500";
      case "pending": case "under_review": return "bg-yellow-500/10 text-yellow-500";
      case "suspended": case "rejected": return "bg-red-500/10 text-red-500";
      default: return "bg-muted-foreground/10 text-muted-foreground";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Premium": return <Crown className="w-4 h-4" />;
      case "Moderator": return <Shield className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark pt-20 pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, content, and system settings for EchoVerse platform
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <Music className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                  <div className="text-xs text-green-500 mt-1">+{stats.newUsersToday} today</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4 text-center">
                  <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.premiumUsers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Premium Users</div>
                  <div className="text-xs text-primary mt-1">
                    {Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% conversion
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4 text-center">
                  <Music className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.totalSongs.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Songs</div>
                  <div className="text-xs text-blue-500 mt-1">{stats.streamingHours.toLocaleString()}h streamed</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.reportsToday}</div>
                  <div className="text-xs text-muted-foreground">Reports Today</div>
                  <div className="text-xs text-orange-500 mt-1">Needs attention</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Daily Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.dailyActiveUsers.map((day, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-12 text-sm">{day.day}</div>
                        <div className="flex-1">
                          <div className="w-full bg-muted/20 rounded-full h-2">
                            <div 
                              className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(day.users / 12100) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground w-16 text-right">
                          {day.users.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Popular Genres</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topGenres.map((genre, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-20 text-sm">{genre.genre}</div>
                        <div className="flex-1">
                          <div className="w-full bg-muted/20 rounded-full h-2">
                            <div 
                              className="bg-gradient-secondary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${genre.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground w-12 text-right">
                          {genre.percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Users Management */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-10 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/10">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{user.name}</h3>
                          <Badge variant="outline" className="gap-1">
                            {getRoleIcon(user.role)}
                            {user.role}
                          </Badge>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Joined: {new Date(user.joinDate).toLocaleDateString()}</span>
                          <span>Last active: {user.lastActive}</span>
                          {user.reportsCount > 0 && (
                            <span className="text-red-500">{user.reportsCount} reports</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.status === "active" ? (
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {/* Content Management */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Content Management</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="hero" size="sm">
                      <Music className="w-4 h-4 mr-2" />
                      Add Song
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {songs.map((song) => (
                    <div key={song.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/10">
                      <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{song.title}</h3>
                          <Badge className={getStatusColor(song.status)}>
                            {song.status}
                          </Badge>
                          {song.reports > 0 && (
                            <Badge variant="destructive">
                              {song.reports} reports
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {song.artist} • {song.duration} • {song.plays.toLocaleString()} plays
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(song.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {song.status === "pending" && (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-green-500">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-500">
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Reports Management */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle>Content Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4 rounded-lg bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{report.type}</Badge>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{report.date}</span>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-1">
                          {report.targetType}: {report.targetTitle}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Reported by: {report.reporter}
                        </p>
                        <p className="text-sm">{report.reason}</p>
                      </div>
                      
                      {report.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-green-500">
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500">
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* System Settings */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Upload Size (MB)</label>
                    <Input type="number" defaultValue={50} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Daily Upload Limit</label>
                    <Input type="number" defaultValue={10} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maintenance Mode</label>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="maintenance" className="rounded" />
                      <label htmlFor="maintenance" className="text-sm">Enable maintenance mode</label>
                    </div>
                  </div>
                  <Button variant="hero" className="w-full">
                    Save Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Timeout (minutes)</label>
                    <Input type="number" defaultValue={30} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Login Attempts</label>
                    <Input type="number" defaultValue={5} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Two-Factor Authentication</label>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="2fa" className="rounded" defaultChecked />
                      <label htmlFor="2fa" className="text-sm">Require 2FA for admin accounts</label>
                    </div>
                  </div>
                  <Button variant="hero" className="w-full">
                    Update Security
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;