import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Home, ArrowLeft } from 'lucide-react';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

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


