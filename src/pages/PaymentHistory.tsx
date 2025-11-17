import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { paymentApi, OrderHistoryItem } from '@/services/api/paymentApi';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';

export default function PaymentHistoryPage() {
  const [allOrders, setAllOrders] = useState<OrderHistoryItem[]>([]);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'SUCCESS' | 'FAILED'>('all');
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await paymentApi.getHistory(page, 10);

      setAllOrders(result.content);

      let filteredOrders = result.content;
      if (filter !== 'all') {
        if (filter === 'SUCCESS') {
          filteredOrders = result.content.filter((order) => order.status === 'SUCCESS');
        } else if (filter === 'FAILED') {
          filteredOrders = result.content.filter((order) => order.status !== 'SUCCESS');
        }
      }

      setOrders(filteredOrders);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tải lịch sử thanh toán',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, filter]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return '-';
    }
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return dateString;
      }
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (order: OrderHistoryItem) => {
    if (order.status === 'SUCCESS') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Thành công
        </Badge>
      );
    }

    const isPending = order.payosCode?.toUpperCase() === 'PENDING' && !order.failureReason;

    if (isPending) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          <Clock className="w-3 h-3 mr-1" />
          Đang xử lýýý
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Thất bại
      </Badge>
    );
  };

  const successOrders = allOrders.filter((o) => o.status === 'SUCCESS');
  const pendingOrders = allOrders.filter(
    (o) => o.status !== 'SUCCESS' && o.payosCode?.toUpperCase() === 'PENDING' && !o.failureReason
  );
  const failedOrders = allOrders.filter(
    (o) => o.status !== 'SUCCESS' && !(o.payosCode?.toUpperCase() === 'PENDING' && !o.failureReason)
  );
  const totalAmount = successOrders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Lịch sử thanh toán</h1>
          <p className="text-muted-foreground">
            Xem tất cả các giao dịch thanh toán của bạn
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{successOrders.length}</div>
              <p className="text-sm text-muted-foreground">Giao dịch thành công</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">{pendingOrders.length}</div>
              <p className="text-sm text-muted-foreground">Giao dịch đang xử lý</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{failedOrders.length}</div>
              <p className="text-sm text-muted-foreground">Giao dịch thất bại</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              <p className="text-sm text-muted-foreground">Tổng đã thanh toán</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Giao dịch</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadHistory()}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="SUCCESS">Thành công</TabsTrigger>
                <TabsTrigger value="FAILED">Thất bại</TabsTrigger>
              </TabsList>
            </Tabs>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Chưa có giao dịch nào</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn hàng</TableHead>
                        <TableHead>Mô tả</TableHead>
                        <TableHead>Số tiền</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.orderCode}>
                          <TableCell className="font-medium">
                            #{order.orderCode}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{order.description}</div>
                            {order.status === 'SUCCESS' && order.reference && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Mã giao dịch: {order.reference}
                              </div>
                            )}
                            {order.status === 'SUCCESS' && order.transactionDateTime && (
                              <div className="text-xs text-muted-foreground/80">
                                Thời gian PayOS: {order.transactionDateTime}
                              </div>
                            )}
                            {order.status !== 'SUCCESS' && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {order.failureReason
                                  ? order.failureReason
                                  : order.payosCode?.toUpperCase() === 'PENDING'
                                  ? 'Đang chờ PayOS gửi webhook xác nhận'
                                  : order.payosDesc || 'Không có lý do được cung cấp'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-primary">
                              {formatCurrency(order.amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div>{formatDate(order.createdAt)}</div>
                            {order.paidAt && (
                              <div className="text-xs text-green-500 mt-1">
                                Thanh toán: {formatDate(order.paidAt)}
                              </div>
                            )}
                            {order.failedAt && (
                              <div className="text-xs text-red-500 mt-1">
                                Thất bại: {formatDate(order.failedAt)}
                              </div>
                            )}
                            {order.updatedAt && order.updatedAt !== order.createdAt && (
                              <div className="text-xs text-muted-foreground/70 mt-1">
                                Cập nhật: {formatDate(order.updatedAt)}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Trang {page + 1} / {totalPages} ({totalElements} giao dịch)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0 || loading}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1 || loading}
                      >
                        Sau
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


