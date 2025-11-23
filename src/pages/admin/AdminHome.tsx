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

    const getDatasetConfig = (type: DatasetType) => {
      switch (type) {
        case "songs":
          return {
            label: "Bài hát mới",
            data: buildSeries(summary?.songSeries),
            borderColor: "hsl(262, 83%, 58%)",
            backgroundColor: "hsla(262, 83%, 58%, 0.15)",
            pointBackgroundColor: "hsl(262, 83%, 58%)",
            pointHoverBackgroundColor: "hsl(262, 83%, 65%)",
            shadowColor: "hsla(262, 83%, 58%, 0.3)",
          };
        case "playlists":
          return {
            label: "Playlist mới",
            data: buildSeries(summary?.playlistSeries),
            borderColor: "hsl(195, 100%, 65%)",
            backgroundColor: "hsla(195, 100%, 65%, 0.15)",
            pointBackgroundColor: "hsl(195, 100%, 65%)",
            pointHoverBackgroundColor: "hsl(195, 100%, 72%)",
            shadowColor: "hsla(195, 100%, 65%, 0.3)",
          };
        case "plays":
          return {
            label: "Lượt phát",
            data: buildSeries(summary?.playSeries),
            borderColor: "hsl(280, 100%, 65%)",
            backgroundColor: "hsla(280, 100%, 65%, 0.15)",
            pointBackgroundColor: "hsl(280, 100%, 65%)",
            pointHoverBackgroundColor: "hsl(280, 100%, 72%)",
            shadowColor: "hsla(280, 100%, 65%, 0.3)",
          };
        case "users":
          return {
            label: "Người dùng mới",
            data: buildSeries(summary?.userSeries),
            borderColor: "hsl(142, 76%, 36%)",
            backgroundColor: "hsla(142, 76%, 36%, 0.15)",
            pointBackgroundColor: "hsl(142, 76%, 36%)",
            pointHoverBackgroundColor: "hsl(142, 76%, 42%)",
            shadowColor: "hsla(142, 76%, 36%, 0.3)",
          };
      }
    };

    const config = getDatasetConfig(selectedDataset);

    return {
      labels,
      datasets: [
        {
          ...config,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2.5,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3,
          shadowOffsetX: 0,
          shadowOffsetY: 2,
          shadowBlur: 8,
        },
      ],
    };
  }, [summary, selectedDataset]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: "easeInOutQuart" as const,
      },
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "hsla(220, 26%, 10%, 0.95)",
          titleColor: "hsl(var(--foreground))",
          bodyColor: "hsl(var(--foreground))",
          borderColor: "hsl(var(--border))",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || "";
              const value = context.parsed.y;
              return `${label}: ${value.toLocaleString("vi-VN")}`;
            },
            title: (context: any) => {
              return context[0].label;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "hsl(var(--muted-foreground))",
            font: {
              size: 11,
            },
          },
          grid: {
            color: "hsla(var(--border), 0.2)",
            drawBorder: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "hsl(var(--muted-foreground))",
            font: {
              size: 11,
            },
            callback: function (value: any) {
              return value.toLocaleString("vi-VN");
            },
          },
          grid: {
            color: "hsla(var(--border), 0.2)",
            drawBorder: false,
          },
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
    fetchSummary(startDate, endDate, period);
  };

  // Component riêng để có thể dùng hooks
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
    Icon?: typeof Users;
    color?: string;
    datasetType?: DatasetType | null;
    isSelected?: boolean;
  }) => {
    const totalCount = useCountUp(metric?.total, { duration: 1500 });
    const newCount = useCountUp(metric?.newInPeriod ?? metric?.inRange, { duration: 1500 });
    const oldCount = useCountUp(metric?.oldOutOfPeriod ?? metric?.outsideRange, { duration: 1500 });

    return (
      <Card
        onClick={() => datasetType && setSelectedDataset(datasetType)}
        className={`border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] transition-all duration-300 ${
          datasetType 
            ? `cursor-pointer hover:shadow-lg hover:border-[hsl(var(--admin-primary))] ${
                isSelected ? "border-[hsl(var(--admin-primary))] shadow-lg ring-2 ring-[hsl(var(--admin-primary))] ring-opacity-20" : ""
              }`
            : "hover:shadow-lg"
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
          {Icon && <Icon className={`h-5 w-5 ${color}`} />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formatNumber(totalCount.count)}</div>
          <p className="text-xs text-muted-foreground">
            +{formatNumber(newCount.count)} trong giai đoạn &bull; {formatNumber(oldCount.count)} trước đó
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-admin bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground">Tổng quan hệ thống Echoverse</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

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

      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-foreground text-xl font-semibold">Biểu đồ tăng trưởng</CardTitle>
              <CardDescription className="text-sm mt-1">
                {selectedDataset === "songs" && "Thống kê bài hát mới"}
                {selectedDataset === "playlists" && "Thống kê playlist mới"}
                {selectedDataset === "plays" && "Thống kê lượt phát"}
                {selectedDataset === "users" && "Thống kê người dùng mới"}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto"
              />
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto"
              />
              <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Theo ngày</SelectItem>
                  <SelectItem value="weekly">Theo tuần</SelectItem>
                  <SelectItem value="monthly">Theo tháng</SelectItem>
                  <SelectItem value="yearly">Theo năm</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => fetchSummary(startDate, endDate, period)} disabled={loading} size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
              <Button onClick={handleApplyFilter} disabled={loading} size="sm">
                Áp dụng
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] px-6 pb-6">
          {loading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : (
            <div className="h-full w-full">
              <Line options={chartOptions} data={chartData} />
            </div>
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