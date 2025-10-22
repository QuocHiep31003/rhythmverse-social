import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Music, ListMusic, TrendingUp } from "lucide-react";
import { mockSongs, mockUsers, mockPlaylists } from "@/data/mockData";

const DEFAULT_AVATAR_URL = "https://res-console.cloudinary.com/dhylbhwvb/thumbnails/v1/image/upload/v1759805930/eG5vYjR5cHBjbGhzY2VrY3NzNWU";

const AdminHome = () => {
  const stats = [
    {
      title: "Tổng người dùng",
      value: mockUsers.length.toString(),
      icon: Users,
      description: "+12% so với tháng trước",
      color: "text-[hsl(var(--admin-secondary))]"
    },
    {
      title: "Tổng bài hát",
      value: mockSongs.length.toString(),
      icon: Music,
      description: "+5 bài hát mới",
      color: "text-[hsl(var(--admin-primary))]"
    },
    {
      title: "Playlists",
      value: mockPlaylists.length.toString(),
      icon: ListMusic,
      description: "Đang hoạt động",
      color: "text-[hsl(var(--primary))]"
    },
    {
      title: "Lượt phát",
      value: "1.2M",
      icon: TrendingUp,
      description: "+18% tuần này",
      color: "text-[hsl(var(--admin-accent))]"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-admin bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống Echoverse</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] hover:shadow-lg transition-all duration-300 hover:border-[hsl(var(--admin-primary))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-foreground">Bài hát phổ biến</CardTitle>
            <CardDescription>Top 5 bài hát được nghe nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSongs.slice(0, 5).map((song, index) => (
                <div key={song.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-[hsl(var(--admin-border))] transition-colors duration-200 cursor-pointer">
                  <span className="text-2xl font-bold text-[hsl(var(--admin-primary))] w-8">
                    {index + 1}
                  </span>
                  <img
                    src={song.cover}
                    alt={song.title}
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR_URL; }}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">
                    {song.plays}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-foreground">Người dùng mới</CardTitle>
            <CardDescription>Người dùng đăng ký gần đây</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-[hsl(var(--admin-border))] transition-colors duration-200 cursor-pointer">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR_URL; }}
                    className="w-10 h-10 rounded-full ring-2 ring-[hsl(var(--admin-border))]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gradient-admin text-white font-medium">
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminHome;