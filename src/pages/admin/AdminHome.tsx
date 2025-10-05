import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Music, ListMusic, TrendingUp } from "lucide-react";
import { mockSongs, mockUsers, mockPlaylists } from "@/data/mockData";

const AdminHome = () => {
  const stats = [
    {
      title: "Tổng người dùng",
      value: mockUsers.length.toString(),
      icon: Users,
      description: "+12% so với tháng trước",
      color: "text-blue-500"
    },
    {
      title: "Tổng bài hát",
      value: mockSongs.length.toString(),
      icon: Music,
      description: "+5 bài hát mới",
      color: "text-green-500"
    },
    {
      title: "Playlists",
      value: mockPlaylists.length.toString(),
      icon: ListMusic,
      description: "Đang hoạt động",
      color: "text-purple-500"
    },
    {
      title: "Lượt phát",
      value: "1.2M",
      icon: TrendingUp,
      description: "+18% tuần này",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống Echoverse</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bài hát phổ biến</CardTitle>
            <CardDescription>Top 5 bài hát được nghe nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSongs.slice(0, 5).map((song, index) => (
                <div key={song.id} className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground w-8">
                    {index + 1}
                  </span>
                  <img
                    src={song.cover}
                    alt={song.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {song.plays}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Người dùng mới</CardTitle>
            <CardDescription>Người dùng đăng ký gần đây</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
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