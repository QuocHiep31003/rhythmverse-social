import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Music, ListMusic, TrendingUp } from "lucide-react";
import { mockSongs, mockUsers } from "@/data/mockData";
import { dashboardApi } from "@/services/api/dashboardApi";
import type { DashboardStatsResponse, DashboardMetricDTO, TimeSeriesPointDTO } from "@/types/dashboard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Skeleton } from "@/components/ui/skeleton";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler);

const DEFAULT_AVATAR_URL =
  "https://res-console.cloudinary.com/dhylbhwvb/thumbnails/v1/image/upload/v1759805930/eG5vYjR5cHBjbGhzY2VrY3NzNWU";

const todayIso = new Date().toISOString().split("T")[0];
const last30Iso = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return "0";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
};

const AdminHome = () => {
  const [summary, setSummary] = useState<DashboardStatsResponse | null>(null);
  const [startDate, setStartDate] = useState(last30Iso);
  const [endDate, setEndDate] = useState(todayIso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (start: string, end: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getSummary({ startDate: start, endDate: end });
        setSummary(data);
      } catch (err) {
        console.error("[Dashboard] load failed", err);
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu dashboard");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSummary(last30Iso, todayIso);
  }, [fetchSummary]);

  const metricCards = useMemo(
    () => [
      {
        title: "Bài hát",
        metric: summary?.songs,
        icon: Music,
        color: "text-[hsl(var(--admin-primary))]",
      },
      {
        title: "Playlists",
        metric: summary?.playlists,
        icon: ListMusic,
        color: "text-[hsl(var(--primary))]",
      },
      {
        title: "Lượt phát",
        metric: summary?.plays,
        icon: TrendingUp,
        color: "text-[hsl(var(--admin-accent))]",
      },
      {
        title: "Người dùng (mock)",
        metric: {
          total: mockUsers.length,
          inRange: Math.round(mockUsers.length * 0.12),
          outsideRange: Math.round(mockUsers.length * 0.88),
        },
        icon: Users,
        color: "text-[hsl(var(--admin-secondary))]",
      },
    ],
    [summary]
  );

  const chartData = useMemo(() => {
    const buildSeries = (series?: TimeSeriesPointDTO[]) =>
      series?.map((point) => point.value) ?? [];
    const labels =
      summary?.songSeries?.map((point) =>
        new Date(point.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })
      ) ?? [];

    return {
      labels,
      datasets: [
        {
          label: "Bài hát mới",
          data: buildSeries(summary?.songSeries),
          borderColor: "hsl(var(--admin-primary))",
          backgroundColor: "hsla(var(--admin-primary),0.2)",
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
        {
          label: "Playlist mới",
          data: buildSeries(summary?.playlistSeries),
          borderColor: "hsl(var(--admin-secondary))",
          backgroundColor: "hsla(var(--admin-secondary),0.2)",
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
        {
          label: "Lượt phát",
          data: buildSeries(summary?.playSeries),
          borderColor: "hsl(var(--admin-accent))",
          backgroundColor: "hsla(var(--admin-accent),0.15)",
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
      ],
    };
  }, [summary]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          labels: { color: "hsl(var(--foreground))" },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${context.parsed.y}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "hsl(var(--muted-foreground))" },
          grid: { color: "hsla(var(--border),0.4)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "hsl(var(--muted-foreground))" },
          grid: { color: "hsla(var(--border),0.4)" },
        },
      },
    }),
    []
  );

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      setError("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc");
      return;
    }
    fetchSummary(startDate, endDate);
  };

  const renderMetric = (title: string, metric?: DashboardMetricDTO, Icon?: typeof Users, color?: string) => (
    <Card
      key={title}
      className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] hover:shadow-lg transition-all duration-300 hover:border-[hsl(var(--admin-primary))]"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        {Icon && <Icon className={`h-5 w-5 ${color}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{formatNumber(metric?.total)}</div>
        <p className="text-xs text-muted-foreground">
          +{formatNumber(metric?.inRange)} trong giai đoạn &bull; {formatNumber(metric?.outsideRange)} trước đó
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-admin bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground">Tổng quan hệ thống Echoverse</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button variant="outline" onClick={() => fetchSummary(startDate, endDate)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={handleApplyFilter} disabled={loading}>
            Áp dụng
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((stat) => renderMetric(stat.title, stat.metric, stat.icon, stat.color))}
      </div>

      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
        <CardHeader>
          <CardTitle className="text-foreground">Biểu đồ tăng trưởng</CardTitle>
          <CardDescription>
            Tổng quan bài hát, playlist và lượt phát từ{" "}
            {summary?.startDate} đến {summary?.endDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <Line options={chartOptions} data={chartData} />
          )}
        </CardContent>
      </Card>

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