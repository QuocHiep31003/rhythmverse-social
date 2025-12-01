import { useCallback, useEffect, useMemo, useState, useRef, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Music, ListMusic, TrendingUp, X, BarChart3 } from "lucide-react";
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
  ArcElement,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { Skeleton } from "@/components/ui/skeleton";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler, ArcElement);

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
  const [showDeepAnalysis, setShowDeepAnalysis] = useState<DatasetType | null>(null);
  const [deepAnalysisData, setDeepAnalysisData] = useState<{
    genre?: Array<{ name: string; count: number }>;
    mood?: Array<{ name: string; count: number }>;
  } | null>(null);
  const [loadingDeepAnalysis, setLoadingDeepAnalysis] = useState(false);
  
  // Dùng ref để track xem đã fetch lần đầu chưa
  const hasFetchedInitial = useRef(false);
  const currentFilters = useRef({ startDate, endDate, period });

  const fetchSummary = useCallback(
    async (start: string, end: string, periodValue: PeriodType) => {
      console.log("[Dashboard] fetchSummary called", { start, end, periodValue });
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getSummary({ startDate: start, endDate: end, period: periodValue });
        setSummary(data);
        console.log("[Dashboard] fetchSummary completed");
      } catch (err) {
        console.error("[Dashboard] load failed", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Chỉ fetch khi mount lần đầu - không fetch lại khi state thay đổi
  useEffect(() => {
    if (!hasFetchedInitial.current) {
      console.log("[Dashboard] Initial fetch");
      hasFetchedInitial.current = true;
      fetchSummary(startDate, endDate, period);
      currentFilters.current = { startDate, endDate, period };
    } else {
      console.log("[Dashboard] Skipping fetch - already fetched");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount

  const metricCards = useMemo(
    () => [
      {
        title: "Songs",
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
        title: "Plays",
        metric: summary?.plays,
        icon: TrendingUp,
        color: "text-[hsl(var(--admin-accent))]",
        datasetType: "plays" as DatasetType,
      },
      {
        title: "Users",
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

    // Lấy labels và data tương ứng với selectedDataset
    const getSeriesForDataset = (dataset: DatasetType) => {
      switch (dataset) {
        case "songs":
          return summary?.songSeries;
        case "playlists":
          return summary?.playlistSeries;
        case "plays":
          return summary?.playSeries;
        case "users":
          return summary?.userSeries;
        default:
          return summary?.songSeries;
      }
    };

    const series = getSeriesForDataset(selectedDataset);
    const labels = series?.map((point) =>
      new Date(point.date).toLocaleDateString("en-US", { day: "2-digit", month: "short" })
    ) ?? [];

    const datasetConfig = {
      songs: {
        label: "New Songs",
        data: buildSeries(summary?.songSeries),
        borderColor: "hsl(262, 83%, 58%)",
        backgroundColor: "hsla(262, 83%, 58%, 0.15)",
      },
      playlists: {
        label: "New Playlists",
        data: buildSeries(summary?.playlistSeries),
        borderColor: "hsl(195, 100%, 65%)",
        backgroundColor: "hsla(195, 100%, 65%, 0.15)",
      },
      plays: {
        label: "Plays",
        data: buildSeries(summary?.playSeries),
        borderColor: "hsl(280, 100%, 65%)",
        backgroundColor: "hsla(280, 100%, 65%, 0.15)",
      },
      users: {
        label: "New Users",
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
          data: buildSeries(series), // Dùng data từ series tương ứng
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
      setError("Please select start and end dates");
      return;
    }
    // Cập nhật ref và fetch
    currentFilters.current = { startDate, endDate, period };
    fetchSummary(startDate, endDate, period);
  };

  // Fetch phân tích sâu theo genre/mood
  const fetchDeepAnalysis = useCallback(async (datasetType: DatasetType) => {
    if (datasetType !== "songs") {
      // Chỉ hỗ trợ phân tích sâu cho songs
      return;
    }
    
    try {
      setLoadingDeepAnalysis(true);
      // Gọi API để lấy thống kê theo genre và mood
      const [genreStats, moodStats] = await Promise.all([
        dashboardApi.getSongsByGenre(),
        dashboardApi.getSongsByMood(),
      ]);
      
      // Convert từ object sang array và sort theo count
      const genreArray = Object.entries(genreStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      const moodArray = Object.entries(moodStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      setDeepAnalysisData({
        genre: genreArray,
        mood: moodArray,
      });
    } catch (err) {
      console.error("Failed to fetch deep analysis", err);
      // Fallback về empty data nếu API fail
      setDeepAnalysisData({ genre: [], mood: [] });
    } finally {
      setLoadingDeepAnalysis(false);
    }
  }, []);

  const handleCardClick = useCallback((datasetType: DatasetType) => {
    console.log("[Dashboard] Card clicked:", datasetType, "- NOT fetching summary");
    setSelectedDataset(datasetType);
    // Mở panel phân tích sâu nếu là songs
    if (datasetType === "songs") {
      setShowDeepAnalysis((prev) => {
        if (prev === datasetType) {
          // Đóng nếu đã mở
          setDeepAnalysisData(null);
          return null;
        } else {
          // Mở và fetch data
          fetchDeepAnalysis(datasetType);
          return datasetType;
        }
      });
    } else {
      // Đóng panel nếu click vào card khác
      setShowDeepAnalysis(null);
      setDeepAnalysisData(null);
    }
  }, [fetchDeepAnalysis]);

  const MetricCard = memo(({
    title,
    metric,
    Icon,
    color,
    datasetType,
    isSelected,
    onCardClick,
  }: {
    title: string;
    metric?: DashboardMetricDTO;
    Icon?: any;
    color?: string;
    datasetType?: DatasetType;
    isSelected?: boolean;
    onCardClick: (datasetType: DatasetType) => void;
  }) => {
    const totalCount = useCountUp(metric?.total, { duration: 1500 });
    const newCount = useCountUp(metric?.inRange, { duration: 1500 });

    const handleClick = useCallback(() => {
      if (datasetType) {
        onCardClick(datasetType);
      }
    }, [datasetType, onCardClick]);

    return (
      <Card
        onClick={handleClick}
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
  });

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
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Chart */}
      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow">
        <CardHeader>
          <CardTitle>Growth Chart</CardTitle>
          <CardDescription>
            {selectedDataset === "songs" && "New songs statistics"}
            {selectedDataset === "playlists" && "New playlists statistics"}
            {selectedDataset === "plays" && "Plays statistics"}
            {selectedDataset === "users" && "New users statistics"}
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
            <CardTitle>Popular Songs</CardTitle>
            <CardDescription>Top 5 most played</CardDescription>
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
            <CardTitle>New Users</CardTitle>
            <CardDescription>Recently registered users</CardDescription>
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

      {/* Panel phân tích sâu */}
      {showDeepAnalysis === "songs" && (
        <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Deep Analysis: Songs
                </CardTitle>
                <CardDescription>
                  Classify songs by genre and mood
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowDeepAnalysis(null);
                  setDeepAnalysisData(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDeepAnalysis ? (
              <div className="flex items-center justify-center h-[400px]">
                <Skeleton className="w-full h-full" />
              </div>
            ) : deepAnalysisData ? (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Doughnut chart by Genre */}
                {deepAnalysisData.genre && deepAnalysisData.genre.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Distribution by Genre</h3>
                    <div className="h-[300px] flex items-center justify-center">
                      <Doughnut
                        data={{
                          labels: deepAnalysisData.genre.map((g) => g.name),
                          datasets: [
                            {
                              data: deepAnalysisData.genre.map((g) => g.count),
                              backgroundColor: [
                                "hsl(262, 83%, 58%)",
                                "hsl(195, 100%, 65%)",
                                "hsl(280, 100%, 65%)",
                                "hsl(142, 76%, 36%)",
                                "hsl(24, 95%, 53%)",
                                "hsl(0, 84%, 60%)",
                              ],
                              borderWidth: 2,
                              borderColor: "hsl(var(--admin-card))",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: "bottom",
                              labels: {
                                padding: 15,
                                usePointStyle: true,
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.label || "";
                                  const value = context.parsed || 0;
                                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return `${label}: ${value} (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      {deepAnalysisData.genre.map((item, index) => {
                        const total = deepAnalysisData.genre!.reduce((sum, g) => sum + g.count, 0);
                        const percentage = ((item.count / total) * 100).toFixed(1);
                        return (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: [
                                    "hsl(262, 83%, 58%)",
                                    "hsl(195, 100%, 65%)",
                                    "hsl(280, 100%, 65%)",
                                    "hsl(142, 76%, 36%)",
                                    "hsl(24, 95%, 53%)",
                                    "hsl(0, 84%, 60%)",
                                  ][index % 6],
                                }}
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{item.count}</span>
                              <span className="text-muted-foreground">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Doughnut chart by Mood */}
                {deepAnalysisData.mood && deepAnalysisData.mood.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Distribution by Mood</h3>
                    <div className="h-[300px] flex items-center justify-center">
                      <Doughnut
                        data={{
                          labels: deepAnalysisData.mood.map((m) => m.name),
                          datasets: [
                            {
                              data: deepAnalysisData.mood.map((m) => m.count),
                              backgroundColor: [
                                "hsl(142, 76%, 36%)",
                                "hsl(217, 91%, 60%)",
                                "hsl(24, 95%, 53%)",
                                "hsl(195, 100%, 65%)",
                                "hsl(280, 100%, 65%)",
                              ],
                              borderWidth: 2,
                              borderColor: "hsl(var(--admin-card))",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: "bottom",
                              labels: {
                                padding: 15,
                                usePointStyle: true,
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.label || "";
                                  const value = context.parsed || 0;
                                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return `${label}: ${value} (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      {deepAnalysisData.mood.map((item, index) => {
                        const total = deepAnalysisData.mood!.reduce((sum, m) => sum + m.count, 0);
                        const percentage = ((item.count / total) * 100).toFixed(1);
                        return (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: [
                                    "hsl(142, 76%, 36%)",
                                    "hsl(217, 91%, 60%)",
                                    "hsl(24, 95%, 53%)",
                                    "hsl(195, 100%, 65%)",
                                    "hsl(280, 100%, 65%)",
                                  ][index % 5],
                                }}
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{item.count}</span>
                              <span className="text-muted-foreground">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                No analysis data available
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminHome;
