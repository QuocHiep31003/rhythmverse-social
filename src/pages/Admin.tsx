import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
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
  TrendingUp,
  ListMusic,
  DollarSign,
  Play
} from "lucide-react";
import {
  mockAdminUsers,
  mockAdminSongs,
  mockAdminPlaylists,
  mockAdminReports,
  mockAnalytics
} from "@/data/mockData";

const Admin = () => {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = {
    totalUsers: 72000,
    activeUsers: 52340,
    premiumUsers: 16800,
    totalSongs: 45892,
    totalPlaylists: 78945,
    reportsToday: 12,
    newUsersToday: 234,
    streamingHours: 89567,
    monthlyRevenue: 168000
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
          <TabsList className="grid w-full grid-cols-6 mb-6">
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
              Songs
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2">
              <ListMusic className="w-4 h-4" />
              Playlists
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
                  <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">${(stats.monthlyRevenue / 1000).toFixed(0)}k</div>
                  <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                  <div className="text-xs text-green-500 mt-1">+12% vs last month</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>Monthly user statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      users: {
                        label: "Total Users",
                        color: "hsl(var(--primary))",
                      },
                      premium: {
                        label: "Premium Users",
                        color: "hsl(var(--accent))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockAnalytics.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="users" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="premium" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--accent))", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Top Songs This Week</CardTitle>
                  <CardDescription>Most played tracks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      plays: {
                        label: "Plays",
                        color: "hsl(var(--neon-pink))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockAnalytics.topSongs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="title" 
                          stroke="hsl(var(--muted-foreground))" 
                          angle={-15}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="plays" 
                          fill="hsl(var(--neon-pink))"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Genre Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockAnalytics.topGenres.map((genre, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{genre.genre}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted/20 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-primary h-1.5 rounded-full"
                              style={{ width: `${genre.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {genre.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Platform Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Now</span>
                    <span className="font-bold text-green-500">8,432</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Streaming Hours</span>
                    <span className="font-bold">{stats.streamingHours.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Playlists Created</span>
                    <span className="font-bold">124</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Songs Uploaded</span>
                    <span className="font-bold">45</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Server Status</span>
                    <Badge className="bg-green-500/10 text-green-500">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Response</span>
                    <span className="font-bold">42ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <span className="font-bold">99.9%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Storage Used</span>
                    <span className="font-bold">67%</span>
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
                  {mockAdminUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
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
                          <span>Last: {user.lastActive}</span>
                          <span>{user.playlists} playlists</span>
                          <span>{user.followers} followers</span>
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
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive">
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-green-500">
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
                  <CardTitle>Song Management</CardTitle>
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
                  {mockAdminSongs.map((song) => (
                    <div key={song.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
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
                          {song.artist} • {song.album || "Single"} • {song.duration}
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            {song.plays.toLocaleString()} plays
                          </span>
                          <span>Genre: {song.genre}</span>
                          <span>Uploaded: {new Date(song.uploadDate).toLocaleDateString()}</span>
                        </div>
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

          <TabsContent value="playlists" className="space-y-6">
            {/* Playlist Management */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Playlist Management</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search playlists..."
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAdminPlaylists.map((playlist) => (
                    <div key={playlist.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center">
                        <ListMusic className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{playlist.name}</h3>
                          <Badge variant={playlist.isPublic ? "default" : "secondary"}>
                            {playlist.isPublic ? "Public" : "Private"}
                          </Badge>
                          <Badge className={getStatusColor(playlist.status)}>
                            {playlist.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          By {playlist.creator}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>{playlist.songs} songs</span>
                          <span>{playlist.followers.toLocaleString()} followers</span>
                          <span>Created: {new Date(playlist.createdDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {playlist.status === "reported" ? (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive">
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Content Reports</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAdminReports.map((report) => (
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
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Configure system-wide settings</CardDescription>
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
                  <CardDescription>Configure security and authentication</CardDescription>
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

            {/* Roles & Permissions */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Manage user roles and their permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Admin Role */}
                  <div className="p-4 rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">Admin</h3>
                          <p className="text-xs text-muted-foreground">Full system access</p>
                        </div>
                      </div>
                      <Badge className="bg-red-500/10 text-red-500">Highest</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Manage Users</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Manage Content</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Handle Reports</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>System Settings</span>
                      </div>
                    </div>
                  </div>

                  {/* Moderator Role */}
                  <div className="p-4 rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">Moderator</h3>
                          <p className="text-xs text-muted-foreground">Content moderation access</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-500/10 text-orange-500">High</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Review Content</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Handle Reports</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Ban Users</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="w-3 h-3 text-red-500" />
                        <span>System Settings</span>
                      </div>
                    </div>
                  </div>

                  {/* Premium Role */}
                  <div className="p-4 rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <h3 className="font-medium">Premium</h3>
                          <p className="text-xs text-muted-foreground">Enhanced features for paying users</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500/10 text-yellow-500">Standard</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Unlimited Playlists</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>HD Streaming</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>No Ads</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Offline Downloads</span>
                      </div>
                    </div>
                  </div>

                  {/* User Role */}
                  <div className="p-4 rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">User</h3>
                          <p className="text-xs text-muted-foreground">Basic access</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Basic</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Browse Music</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Create Playlists</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="w-3 h-3 text-red-500" />
                        <span>HD Streaming</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="w-3 h-3 text-red-500" />
                        <span>Offline Downloads</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;