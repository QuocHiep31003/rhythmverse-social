import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Coins,
  TrendingUp,
  CreditCard,
  Crown,
  RefreshCw,
  Search,

  CalendarDays,
} from "lucide-react";
import { paymentApi, OrderHistoryItem } from "@/services/api/paymentApi";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/services/api/userApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

type ChartMode = "DAY" | "MONTH" | "YEAR";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);


const formatCompactCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
};

const getISODateString = (date: Date) => date.toISOString().split("T")[0];

const getCurrentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatDateInputValue = (isoDateString: string | undefined): string => {
  if (!isoDateString) return "";
  try {
    const date = new Date(isoDateString + "T00:00:00");
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
};

const formatMonthInputValue = (isoMonthString: string | undefined): string => {
  if (!isoMonthString) return "";
  try {
    const [year, month] = isoMonthString.split("-");
    if (!year || !month) return "";
    return `${month}/${year}`;
  } catch {
    return "";
  }
};

type PickerInput = HTMLInputElement & { showPicker?: () => void };

const AdminPremiumDashboard = () => {
  const { toast } = useToast();

  const [premiumStats, setPremiumStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    successRate: 0,
  });
  const [premiumTransactions, setPremiumTransactions] = useState<OrderHistoryItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [transactionMeta, setTransactionMeta] = useState({
    totalElements: 0,
    totalPages: 0,
  });
  const [triggeringReminder, setTriggeringReminder] = useState(false);

  const [chartMode, setChartMode] = useState<ChartMode>("MONTH");
  const [selectedDay, setSelectedDay] = useState(() => getISODateString(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const dayInputRef = useRef<HTMLInputElement | null>(null);
  const monthInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const aggregatedTransactions: OrderHistoryItem[] = [];
      const pageSize = 50;
      let currentPage = 0;
      let totalPages = 1;
      let totalElements = 0;

      do {
        const history = await paymentApi.getHistory(currentPage, pageSize);
        const pageTransactions = history?.content || [];
        aggregatedTransactions.push(...pageTransactions);
        totalPages = history?.totalPages ?? totalPages;
        totalElements = history?.totalElements ?? aggregatedTransactions.length;
        currentPage += 1;

        if (pageTransactions.length < pageSize) {
          break;
        }
      } while (currentPage < totalPages);

      setPremiumTransactions(aggregatedTransactions);
      setTransactionMeta({ totalElements, totalPages });

      const successTransactions = aggregatedTransactions.filter((tx) => tx.status === "SUCCESS");
      const totalRevenue = successTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const now = Date.now();
      const monthlyRevenue = successTransactions
        .filter((tx) => {
          if (!tx.createdAt) return false;
          const txDate = new Date(tx.createdAt).getTime();
          const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        })
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const totalOrders = aggregatedTransactions.length;
      const successRate = totalOrders ? Math.round((successTransactions.length / totalOrders) * 100) : 0;

      setPremiumStats({
        totalRevenue,
        monthlyRevenue,
        totalOrders,
        successRate,
      });
    } catch (error: any) {
      console.error("Failed to fetch premium payments", error);
      toast({

        title: "Error",
        description: error?.message || "Unable to load premium transaction statistics",
        variant: "destructive",
      });
    } finally {
      setLoadingPayments(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleTriggerReminders = async () => {
    try {
      setTriggeringReminder(true);
      const message = await userApi.triggerSubscriptionReminders();
      toast({
        title: "Reminder triggered",
        description: message || "Checked users expiring soon and sent notifications/emails.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to trigger subscription expiry reminders.",
        variant: "destructive",
      });
    } finally {
      setTriggeringReminder(false);
    }
  };


  useEffect(() => {
    if (chartMode === "DAY" && !selectedDay) {
      setSelectedDay(getISODateString(new Date()));
    }

    if (chartMode === "MONTH" && !selectedMonth) {
      setSelectedMonth(getCurrentMonthValue());
    }

    if (chartMode === "YEAR" && !selectedYear) {
      setSelectedYear(new Date().getFullYear().toString());
    }
  }, [chartMode, selectedDay, selectedMonth, selectedYear]);

  useEffect(() => {
    if (chartMode === "DAY") {
      const date = new Date(selectedDay);
      if (!Number.isNaN(date.getTime())) {
        const derivedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (derivedMonth !== selectedMonth) {
          setSelectedMonth(derivedMonth);
        }
        if (date.getFullYear().toString() !== selectedYear) {
          setSelectedYear(date.getFullYear().toString());
        }
      }
    }
  }, [chartMode, selectedDay, selectedMonth, selectedYear]);

  useEffect(() => {
    if (chartMode === "MONTH" && selectedMonth) {
      const [yearFromMonth] = selectedMonth.split("-");
      if (yearFromMonth && yearFromMonth !== selectedYear) {
        setSelectedYear(yearFromMonth);
      }
    }
  }, [chartMode, selectedMonth, selectedYear]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return premiumTransactions.filter((tx) => {
      const matchesStatus = statusFilter === "ALL" ? true : tx.status === statusFilter;
      const matchesSearch = normalizedSearch
        ? tx.description?.toLowerCase().includes(normalizedSearch) ||
          tx.orderCode.toString().includes(normalizedSearch)
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [premiumTransactions, searchTerm, statusFilter]);

  const statCards = useMemo(
    () => [
      {

        label: "Total revenue",
        value: formatCurrency(premiumStats.totalRevenue),
        icon: Coins,
      },
      {

        label: "Last 30 days revenue",
        value: formatCurrency(premiumStats.monthlyRevenue),
        icon: TrendingUp,
      },
      {

        label: "Total transactions",
        value: premiumStats.totalOrders.toString(),
        icon: CreditCard,
      },
      {

        label: "Success rate",
        value: `${premiumStats.successRate}%`,
        icon: Crown,
      },
    ],
    [premiumStats]
  );

  const getStatusBadgeClass = (status: OrderHistoryItem["status"]) =>
    status === "SUCCESS"
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      : "bg-destructive/10 text-destructive border border-destructive/40";


  const chartConfig = useMemo(
    () => ({
      revenue: {
        label: "Revenue (VND)",
        color: "hsl(var(--admin-primary))",
      },
    }),
    [],
  );

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }).map((_, index) => (currentYear - index).toString());
  }, []);

  const todayValue = useMemo(() => getISODateString(new Date()), []);
  const thisMonthValue = useMemo(() => getCurrentMonthValue(), []);

  const chartModeOptions = useMemo(
    () => [
      { label: "By day", value: "DAY" as const, helper: "Show total revenue per hour" },
      { label: "By month", value: "MONTH" as const, helper: "Show total revenue per day" },
      { label: "By year", value: "YEAR" as const, helper: "Show total revenue per month" },
    ],
    [],
  );

  const handleChartModeChange = useCallback(
    (mode: ChartMode) => {
      setChartMode(mode);

      if (mode === "DAY") {
        setSelectedDay((prev) => (prev && prev <= todayValue ? prev : todayValue));
      }

      if (mode === "MONTH") {
        setSelectedMonth((prev) => (prev && prev <= thisMonthValue ? prev : thisMonthValue));
      }

      if (mode === "YEAR") {
        setSelectedYear((prev) => prev || new Date().getFullYear().toString());
      }
    },
    [thisMonthValue, todayValue],
  );

  const openNativePicker = useCallback((input?: HTMLInputElement | null) => {
    if (!input) return;
    const pickerInput = input as PickerInput;
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
    } else {
      pickerInput.focus();
    }
  }, []);

  const salesChart = useMemo(() => {
    const now = new Date();
    const todayISO = getISODateString(now);
    const currentYear = now.getFullYear();
    const currentMonthValue = getCurrentMonthValue();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentHour = now.getHours();

    const successTransactions = premiumTransactions.filter(
      (tx) => tx.status === "SUCCESS" && tx.createdAt && tx.amount,
    );

    const getRevenueForPredicate = (predicate: (date: Date) => boolean, keyFn: (date: Date) => string) => {
      const revenues: Record<string, number> = {};

      successTransactions.forEach((tx) => {
        const txDate = new Date(tx.createdAt!);
        if (!predicate(txDate)) return;
        const key = keyFn(txDate);
        revenues[key] = (revenues[key] || 0) + (tx.amount || 0);
      });

      return revenues;
    };

    if (chartMode === "DAY" && selectedDay) {
      const [year, month, day] = selectedDay.split("-").map(Number);
      const isToday = selectedDay === todayISO;
      const revenueByHour = getRevenueForPredicate(
        (date) =>
          date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day,
        (date) => date.getHours().toString(),
      );

      const visibleHours = isToday ? Math.min(24, Math.max(1, currentHour + 1)) : 24;

      const data = Array.from({ length: visibleHours }).map((_, hour) => ({
        label: `${String(hour).padStart(2, "0")}h`,
        revenue: revenueByHour[String(hour)] || 0,
      }));

      return {
        timeframeLabel: `Day ${day}/${month}/${year}`,
        data,
        total: data.reduce((sum, item) => sum + item.revenue, 0),
      };
    }

    if (chartMode === "MONTH" && selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      const isCurrentMonth = selectedMonth === currentMonthValue;
      const revenueByDay = getRevenueForPredicate(
        (date) => date.getFullYear() === year && date.getMonth() + 1 === month,
        (date) => date.getDate().toString(),
      );

      const daysInMonth = new Date(year, month, 0).getDate();
      const visibleDays = isCurrentMonth ? Math.max(1, Math.min(daysInMonth, currentDay)) : daysInMonth;
      const data = Array.from({ length: visibleDays }).map((_, index) => {
        const day = index + 1;
        return {
          label: `Day ${day}`,
          revenue: revenueByDay[String(day)] || 0,
        };
      });

      return {
        timeframeLabel: `Month ${month}/${year}`,
        data,
        total: data.reduce((sum, item) => sum + item.revenue, 0),
      };
    }

    const targetYear = Number(selectedYear) || currentYear;
    const isCurrentYear = targetYear === currentYear;
    const revenueByMonth = getRevenueForPredicate(
      (date) => date.getFullYear() === targetYear,
      (date) => (date.getMonth() + 1).toString(),
    );

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsToShow = isCurrentYear ? Math.max(1, currentMonth) : 12;
    const data = monthLabels.slice(0, monthsToShow).map((label, index) => ({
      label,
      revenue: revenueByMonth[String(index + 1)] || 0,
    }));

    return {
      timeframeLabel: `Year ${targetYear}`,
      data,
      total: data.reduce((sum, item) => sum + item.revenue, 0),
    };
  }, [chartMode, premiumTransactions, selectedDay, selectedMonth, selectedYear]);

  return (

    <div className="min-h-screen p-6 space-y-4">
      <div className="w-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">
                Premium Dashboard
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">

                  {transactionMeta.totalElements} transactions recorded
                </Badge>

                {loadingPayments && <span className="text-xs">Syncing...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={fetchPayments}
              className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]"
              disabled={loadingPayments}
            >
              <RefreshCw className={`w-4 h-4 ${loadingPayments ? "animate-spin" : ""}`} />

              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
          {statCards.map((item) => (
            <Card
              key={item.label}
              className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] hover:shadow-lg transition-all duration-300"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">{item.label}</CardTitle>
                <item.icon className="w-5 h-5 text-[hsl(var(--admin-primary))]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Manual reminder trigger */}
        <Card className="border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Premium expiry reminders
              </CardTitle>
              <CardDescription>
                Check all premium users who will expire in 1 day and send notification + email once.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleTriggerReminders}
              disabled={triggeringReminder}
              className="mt-2 sm:mt-0"
            >
              {triggeringReminder ? "Checking & sending..." : "Check & send reminders now"}
            </Button>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-lg bg-[hsl(var(--admin-card))]">
          <CardHeader className="border-b border-[hsl(var(--admin-border))]/70">
            <div className="flex flex-col gap-5">
              <div>
                  <CardTitle className="text-2xl font-bold text-foreground">Revenue chart</CardTitle>
                <CardDescription>
                    Track premium revenue by {chartMode === "DAY" ? "hour" : chartMode === "MONTH" ? "day" : "month"} - {salesChart.timeframeLabel}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-1 flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View mode</span>
                  <div className="flex flex-wrap gap-2">
                    {chartModeOptions.map((option) => (
                      <Button
                        key={option.value}
                        size="sm"
                        variant={chartMode === option.value ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => handleChartModeChange(option.value)}
                        aria-pressed={chartMode === option.value}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {chartModeOptions.find((option) => option.value === chartMode)?.helper}
                  </p>
                </div>

                <div className="flex w-full flex-1 flex-col gap-2 lg:max-w-sm lg:items-end">
                  {chartMode === "DAY" && (
                    <div className="flex w-full flex-col gap-2 lg:max-w-[120px]">
                      <Label htmlFor="premium-chart-day" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Date
                      </Label>
                      <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => openNativePicker(dayInputRef.current)}
                          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--admin-primary))]"
                          aria-label="Select date"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <Input
                            id="premium-chart-day"
                            type="date"
                            ref={dayInputRef}
                            className="bg-background pl-10 pr-16 text-sm h-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:hidden [&::-webkit-datetime-edit-fields-wrapper]:hidden [&::-webkit-datetime-edit-text]:hidden [&::-webkit-datetime-edit-month-field]:hidden [&::-webkit-datetime-edit-day-field]:hidden [&::-webkit-datetime-edit-year-field]:hidden"
                            value={selectedDay}
                            max={todayValue}
                            onChange={(e) => setSelectedDay(e.target.value)}
                          />
                          <span className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-foreground">
                            {formatDateInputValue(selectedDay)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {chartMode === "MONTH" && (
                    <div className="flex w-full flex-col gap-2 lg:max-w-[120px]">
                      <Label htmlFor="premium-chart-month" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Month
                      </Label>
                      <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => openNativePicker(monthInputRef.current)}
                          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--admin-primary))]"
                          aria-label="Select month"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <Input
                            id="premium-chart-month"
                            type="month"
                            ref={monthInputRef}
                            className="bg-background pl-10 pr-12 text-sm h-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:hidden [&::-webkit-datetime-edit-fields-wrapper]:hidden [&::-webkit-datetime-edit-text]:hidden [&::-webkit-datetime-edit-month-field]:hidden [&::-webkit-datetime-edit-year-field]:hidden"
                            value={selectedMonth}
                            max={thisMonthValue}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                          />
                          <span className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-foreground">
                            {formatMonthInputValue(selectedMonth)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {chartMode === "YEAR" && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="premium-chart-year" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Year
                      </Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="premium-chart-year" className="w-full sm:w-[80px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
              <div className="w-full relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                  <span className="text-[11px] font-medium text-muted-foreground" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                    VND
                  </span>
                </div>
                <ChartContainer config={chartConfig} className="w-full h-[260px] sm:h-[320px] lg:h-[380px]">
                  <LineChart data={salesChart.data} margin={{ top: 12, right: 24, left: 50, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} dy={8} tickMargin={6} interval="preserveEnd" />
                    <YAxis tickFormatter={formatCompactCurrency as (value: number) => string} dx={-8} tickMargin={6} width={60} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        className="bg-background"
                        formatter={(value) => (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span>Revenue</span>
                            <span className="font-semibold text-foreground">{formatCurrency(Number(value) || 0)}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
              <div className="mt-4 text-sm text-muted-foreground">
                Total revenue ({salesChart.timeframeLabel}):{" "}
                <span className="font-semibold text-foreground">{formatCurrency(salesChart.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-[hsl(var(--admin-card))]">
          <CardHeader className="border-b border-[hsl(var(--admin-border))]/70">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div>

                  <CardTitle className="text-2xl font-bold text-foreground">Transactions</CardTitle>
                  <CardDescription>

                    View all PayOS transactions, filter by status and search by description or order code
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">

                    Showing {filteredTransactions.length} / {premiumTransactions.length} transactions
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input

                    placeholder="Search by description or order code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "ALL" | "SUCCESS" | "FAILED")}
                >
                  <SelectTrigger className="w-full md:w-[220px]">

                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>

                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>

                {(statusFilter !== "ALL" || searchTerm.trim()) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSearchTerm("");
                    }}
                  >

                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>


          <CardContent className="p-0">
            {loadingPayments ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">

                Loading payment data...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">

                No transactions match the current filters.
              </div>
            ) : (

              <div className="overflow-auto scroll-smooth scrollbar-admin">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--admin-card))] border-b border-[hsl(var(--admin-border))]/70">
                    <TableRow>
                      <TableHead className="w-32 text-xs font-semibold tracking-wide text-muted-foreground">

                        Order code
                      </TableHead>
                      <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">

                        Description
                      </TableHead>
                      <TableHead className="w-32 text-xs font-semibold tracking-wide text-muted-foreground text-right">

                        Amount
                      </TableHead>
                      <TableHead className="w-32 text-xs font-semibold tracking-wide text-muted-foreground text-center">

                        Status
                      </TableHead>
                      <TableHead className="w-48 text-xs font-semibold tracking-wide text-muted-foreground text-right">

                        Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={`${tx.orderCode}-${tx.createdAt}`} className="border-b border-[hsl(var(--admin-border))]/50">
                        <TableCell className="font-semibold text-foreground">{tx.orderCode}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-foreground">{tx.description || "Không có mô tả"}</span>
                            {tx.reference && (
                              <span className="text-xs text-muted-foreground">Ref: {tx.reference}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(tx.amount || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(tx.status)}`}>

                            {tx.status === "SUCCESS" ? "Success" : "Failed"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">

                          {formatDateTime(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-[hsl(var(--admin-border))]/70 justify-between text-sm text-muted-foreground">

            <span>Total {premiumTransactions.length} transactions loaded</span>
            <span>
              {transactionMeta.totalPages > 1 ? `${transactionMeta.totalPages} trang dữ liệu` : "1 trang dữ liệu"}
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AdminPremiumDashboard;


