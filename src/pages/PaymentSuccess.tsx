import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Home, Crown, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { paymentApi } from '@/services/api/paymentApi';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Lấy orderCode từ URL params hoặc sessionStorage
    const urlOrderCode = searchParams.get('orderCode');
    const sessionOrderCode =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('payos_order_code')
        : null;

    const code = urlOrderCode
      ? parseInt(urlOrderCode, 10)
      : sessionOrderCode
      ? parseInt(sessionOrderCode, 10)
      : null;

    if (code) {
      setOrderCode(code);

      // Xóa orderCode khỏi sessionStorage khi lấy xong
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('payos_order_code');
      }

      // Kiểm tra trạng thái đơn hàng
      checkOrderStatus(code);
    } else {
      setLoading(false);
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy mã đơn hàng',
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const checkOrderStatus = async (code: number) => {
    try {
      setLoading(true);
      // Nếu cần verify order status qua API:
      // await paymentApi.getOrderStatus(code);
      setLoading(false);
    } catch (error) {
      console.error('Error checking order status:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {loading ? (
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            )}
          </div>

          <CardTitle className="text-2xl">
            {loading ? 'Đang xử lý...' : 'Thanh toán thành công!'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!loading && (
            <>
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Cảm ơn bạn đã nâng cấp Premium. Tài khoản của bạn đã được kích hoạt.
                </p>

                {orderCode && (
                  <p className="text-sm text-muted-foreground">
                    Mã đơn hàng: <span className="font-mono">#{orderCode}</span>
                  </p>
                )}
              </div>

              {/* Premium Benefits */}
              <div className="bg-gradient-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold">Bạn đã là thành viên Premium!</h3>
                </div>

                <ul className="text-sm text-muted-foreground space-y-1 ml-9">
                  <li>✓ Nghe nhạc không giới hạn</li>
                  <li>✓ Chất lượng âm thanh cao (320kbps)</li>
                  <li>✓ Tải nhạc ngoại tuyến</li>
                  <li>✓ Tính năng AI nâng cao</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/premium')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại Premium
                </Button>

                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => navigate('/')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Về trang chủ
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-primary"
                onClick={() => navigate('/profile')}
              >
                Xem hồ sơ
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
