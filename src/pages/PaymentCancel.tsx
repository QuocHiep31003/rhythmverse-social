import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Home, ArrowLeft } from 'lucide-react';
import { paymentApi } from '@/services/api/paymentApi';

export default function PaymentCancelPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Khi PayOS redirect về /payment/cancel?code=00&cancel=true&status=CANCELLED&orderCode=...
  // → gọi API backend để mark đơn hàng là FAILED/CANCELLED
  useEffect(() => {
    let orderCodeParam = searchParams.get('orderCode');
    const cancelFlag = searchParams.get('cancel');
    const status = searchParams.get('status');
    const code = searchParams.get('code');

    // Fallback: nếu query không có orderCode, lấy từ sessionStorage
    if (!orderCodeParam && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('payos_order_code');
      if (stored) {
        orderCodeParam = stored;
      }
    }

    const shouldCancel =
      !!orderCodeParam &&
      (cancelFlag === 'true' || status === 'CANCELLED' || status === 'CANCELED');

    if (!shouldCancel) {
      return;
    }

    const orderCode = Number(orderCodeParam);
    if (!Number.isFinite(orderCode)) {
      return;
    }

    // Fire-and-forget: không chặn UI nếu lỗi
    void paymentApi
      .cancelOrder(
        orderCode,
        `User cancelled payment at PayOS (code=${code || 'N/A'}, status=${status || 'N/A'})`
      )
      .catch((err) => {
        console.warn('[PaymentCancel] Failed to cancel order on backend:', err);
      });
  }, [searchParams]);

  // Xóa orderCode khỏi sessionStorage khi vào trang này
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('payos_order_code');
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            You have cancelled the payment process. No charges were made.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            If you want to upgrade to Premium, you can try again anytime.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => navigate('/premium')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Premium
            </Button>
            <Button 
              variant="default" 
              className="flex-1" 
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


