import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Music, ListMusic, TrendingUp } from "lucide-react";
import { mockSongs, mockUsers } from "@/data/mockData";
import { dashboardApi } from "@/services/api/dashboardApi";
import type { DashboardStatsResponse, DashboardMetricDTO, TimeSeriesPointDTO } from "@/types/dashboard";
import { useCountUp } from "@/hooks/useCountUp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type DatasetType = "songs" | "playlists" | "plays" | "users";
type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

const AdminHome = () => {
  const [summary, setSummary] = useState<DashboardStatsResponse | null>(null);
  const [startDate, setStartDate] = useState(last30Iso);
  const [endDate, setEndDate] = useState(todayIso);
  const [period, setPeriod] = useState<PeriodType>("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<DatasetType>("songs");

  const fetchSummary = useCallback(
    async (start: string, end: string, periodValue: PeriodType) => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getSummary({ startDate: start, endDate: end, period: periodValue });
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
    fetchSummary(last30Iso, todayIso, period);
  }, [fetchSummary, period]);

  const metricCards = useMemo(
    () => [
      {
        title: "Bài hát",
        metric: summary?.songs,
        icon: Music,
        color: "text-[hsl(var(--admin-primary))]",
        datasetType: "songs" as DatasetType,
      },
      {
        title: "Playlists",
        metric: summary?.playlists,
        icon: ListMusic,
        color: "text-[hsl(var(--primary))]",
        datasetType: "playlists" as DatasetType,
      },
      {
        title: "Lượt phát",
        metric: summary?.plays,
        icon: TrendingUp,
        color: "text-[hsl(var(--admin-accent))]",
        datasetType: "plays" as DatasetType,
      },
      {
        title: "Người dùng",
        metric: summary?.users,
        icon: Users,
        color: "text-[hsl(var(--admin-secondary))]",
        datasetType: "users" as DatasetType,
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

    const datasetConfig = {
      songs: {
        label: "Bài hát mới",
        data: buildSeries(summary?.songSeries),
        borderColor: "hsl(262, 83%, 58%)",
        backgroundColor: "hsla(262, 83%, 58%, 0.15)",
      },
      playlists: {
        label: "Playlist mới",
        data: buildSeries(summary?.playlistSeries),
        borderColor: "hsl(195, 100%, 65%)",
        backgroundColor: "hsla(195, 100%, 65%, 0.15)",
      },
      plays: {
        label: "Lượt phát",
        data: buildSeries(summary?.playSeries),
        borderColor: "hsl(280, 100%, 65%)",
        backgroundColor: "hsla(280, 100%, 65%, 0.15)",
      },
      users: {
        label: "Người dùng mới",
        data: buildSeries(summary?.userSeries),
        borderColor: "hsl(142, 76%, 36%)",
        backgroundColor: "hsla(142, 76%, 36%, 0.15)",
      },
    };

    const config = datasetConfig[selectedDataset];

    return {
      labels,
      datasets: [
        {
          ...config,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBorderWidth: 2,
          pointBackgroundColor: config.borderColor,
        },
      ],
    };
  }, [summary, selectedDataset]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      interaction: { intersect: false, mode: "index" },
    }),
    []
  );

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }
    fetchSummary(startDate, endDate, period);
  };

  const MetricCard = ({
    title,
    metric,
    Icon,
    color,
    datasetType,
    isSelected,
  }: {
    title: string;
    metric?: DashboardMetricDTO;
    Icon?: any;
    color?: string;
    datasetType?: DatasetType;
    isSelected?: boolean;
  }) => {
    const totalCount = useCountUp(metric?.total, { duration: 1500 });
    const newCount = useCountUp(metric?.inRange, { duration: 1500 });

    return (
      <Card
        onClick={() => datasetType && setSelectedDataset(datasetType)}
        className={`border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] transition-all cursor-pointer hover:shadow-lg
          ${isSelected ? "ring-2 ring-[hsl(var(--admin-primary))]" : ""}`}
      >
        <CardHeader className="flex flex-row justify-between pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Icon className={`h-5 w-5 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalCount.count)}</div>
          <p className="text-xs text-muted-foreground">
            +{formatNumber(newCount.count)} trong giai đoạn
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-admin bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Tổng quan hệ thống Echoverse</p>
      </div>

      {error && (
        <div className="border border-destructive bg-destructive/10 p-3 text-destructive rounded">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((stat) => (
          <MetricCard
            key={stat.title}
            title={stat.title}
            metric={stat.metric}
            Icon={stat.icon}
            color={stat.color}
            datasetType={stat.datasetType}
            isSelected={stat.datasetType === selectedDataset}
          />
        ))}
      </div>

      {/* Chart */}
      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow">
        <CardHeader>
          <CardTitle>Biểu đồ tăng trưởng</CardTitle>
          <CardDescription>
            {selectedDataset === "songs" && "Thống kê bài hát mới"}
            {selectedDataset === "playlists" && "Thống kê playlist mới"}
            {selectedDataset === "plays" && "Thống kê lượt phát"}
            {selectedDataset === "users" && "Thống kê người dùng mới"}
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
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
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Theo ngày</SelectItem>
                <SelectItem value="weekly">Theo tuần</SelectItem>
                <SelectItem value="monthly">Theo tháng</SelectItem>
                <SelectItem value="yearly">Theo năm</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleApplyFilter} disabled= {loading}>Áp dụng</Button>
          </div>
        </CardHeader>

        <CardContent className="h-[400px]">
          {loading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <Line options={chartOptions} data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Top songs + new users */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
          <CardHeader>
            <CardTitle>Bài hát phổ biến</CardTitle>
            <CardDescription>Top 5 được nghe nhiều</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockSongs.slice(0, 5).map((song, index) => (
              <div key={song.id} className="flex items-center gap-4 p-2 hover:bg-[hsl(var(--admin-border))] rounded">
                <span className="text-2xl font-bold text-[hsl(var(--admin-primary))] w-8">
                  {index + 1}
                </span>
                <img
                  src={song.cover}
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">
                  {song.plays}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
          <CardHeader>
            <CardTitle>Người dùng mới</CardTitle>
            <CardDescription>Người dùng đăng ký gần đây</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-2 hover:bg-[hsl(var(--admin-border))] rounded">
                <img
                  src={user.avatar}
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gradient-admin text-white">
                  {user.role}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminHome;
