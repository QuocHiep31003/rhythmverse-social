import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { paymentApi, OrderHistoryItem } from '@/services/api/paymentApi';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';

export default function PaymentHistoryPage() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await paymentApi.getHistory(page, 10);
      setOrders(result.content);
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
  }, [page]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
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

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Lịch sử thanh toán</h1>
          <p className="text-muted-foreground">
            Xem tất cả các giao dịch thanh toán của bạn
          </p>
        </div>

        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>Tất cả giao dịch</CardTitle>
          </CardHeader>
          <CardContent>
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
                          <TableCell>{order.description}</TableCell>
                          <TableCell>
                            {order.amount.toLocaleString('vi-VN')} VNĐ
                          </TableCell>
                          <TableCell>
                            {order.status === 'SUCCESS' ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Thành công
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Thất bại
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(order.createdAt)}
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


