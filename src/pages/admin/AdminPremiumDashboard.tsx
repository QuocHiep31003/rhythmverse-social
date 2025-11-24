import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { paymentApi, OrderHistoryItem } from "@/services/api/paymentApi";
import { useToast } from "@/hooks/use-toast";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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
        title: "Lỗi",
        description: error?.message || "Không thể tải thống kê giao dịch premium",
        variant: "destructive",
      });
    } finally {
      setLoadingPayments(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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
        label: "Tổng doanh thu",
        value: formatCurrency(premiumStats.totalRevenue),
        icon: Coins,
      },
      {
        label: "Doanh thu 30 ngày",
        value: formatCurrency(premiumStats.monthlyRevenue),
        icon: TrendingUp,
      },
      {
        label: "Tổng giao dịch",
        value: premiumStats.totalOrders.toString(),
        icon: CreditCard,
      },
      {
        label: "Tỉ lệ thành công",
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

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0 space-y-4">
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
                  {transactionMeta.totalElements} giao dịch đã ghi nhận
                </Badge>
                {loadingPayments && <span className="text-xs">Đang đồng bộ...</span>}
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
              Làm mới
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

        <Card className="border-none shadow-lg flex-1 flex flex-col overflow-hidden min-h-0 bg-[hsl(var(--admin-card))]">
          <CardHeader className="border-b border-[hsl(var(--admin-border))]/70">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">Danh sách giao dịch</CardTitle>
                  <CardDescription>
                    Theo dõi toàn bộ giao dịch PayOS, lọc và tìm kiếm theo trạng thái hoặc mô tả
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Hiển thị {filteredTransactions.length} / {premiumTransactions.length} giao dịch
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo mô tả hoặc mã đơn..."
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
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="SUCCESS">Thành công</SelectItem>
                    <SelectItem value="FAILED">Thất bại</SelectItem>
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
                    Xóa lọc
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            {loadingPayments ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Đang tải dữ liệu thanh toán...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                Không có giao dịch nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--admin-card))] border-b border-[hsl(var(--admin-border))]/70">
                    <TableRow>
                      <TableHead className="w-32 text-xs font-semibold tracking-wide text-muted-foreground">
                        Mã đơn
                      </TableHead>
                      <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                        Mô tả
                      </TableHead>
                      <TableHead className="w-32 text-xs font-semibold tracking-wide text-muted-foreground text-right">
                        Số tiền
                      </TableHead>
                      <TableHead className="w-32 text-xs font-semibold tracking-wide text-muted-foreground text-center">
                        Trạng thái
                      </TableHead>
                      <TableHead className="w-48 text-xs font-semibold tracking-wide text-muted-foreground text-right">
                        Thời gian
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
                            {tx.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString("vi-VN") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-[hsl(var(--admin-border))]/70 justify-between text-sm text-muted-foreground">
            <span>Tổng cộng {premiumTransactions.length} giao dịch đã tải</span>
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

