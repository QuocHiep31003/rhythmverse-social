import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { API_BASE_URL, buildJsonHeaders } from "@/services/api/config";

interface ResultMeta {
  id: number;
  calculatedAt: string;
}
interface ResultDetail {
  songId: number;
  songName: string;
  rank: number;
  totalPoints: number;
  oldRank?: number;
}

const AdminTrending = () => {
  const [results, setResults] = useState<ResultMeta[]>([]);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [details, setDetails] = useState<ResultDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch result meta list
  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/results`, { headers: buildJsonHeaders() })
      .then((res) => res.json())
      .then(setResults)
      .catch(() => toast.error('Không thể tải danh sách BXH result'));
  }, []);

  // Fetch detail khi chọn BXH
  const showDetails = async (id: number) => {
    setLoading(true);
    setSelectedResult(id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/results/${id}/details`, { headers: buildJsonHeaders() });
      const data = await res.json();
      setDetails(data);
    } catch {
      toast.error('Không thể tải chi tiết BXH');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-3xl font-bold">Quản lý BXH Result 24h</h1>
        <Badge variant="secondary">{results.length} BXH (sliding 24)</Badge>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="font-bold mr-2">Các mốc BXH result:</span>
            <div className="flex gap-1 flex-wrap">
              {results.map((r) => (
                <Button
                  key={r.id}
                  variant={selectedResult === r.id ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => showDetails(r.id)}
                >
                  #{r.id} <span className="ml-1 text-muted-foreground">({r.calculatedAt.replace('T', ' ').substring(0, 16)})</span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedResult && <div className="text-center text-muted-foreground">Chọn BXH để xem chi tiết!</div>}
          {selectedResult && (
            <>
              <div className="font-medium py-2">BXH Top 100 result #{selectedResult}</div>
              {loading ? (
                <div>Đang tải...</div>
              ) : (
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs">#</th>
                        <th className="px-2 py-1 text-left text-xs">Tên bài hát</th>
                        <th className="px-2 py-1 text-left text-xs">Điểm</th>
                        <th className="px-2 py-1 text-left text-xs">Rank cũ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((item, idx) => (
                        <tr key={item.songId} className="border-b">
                          <td className="px-2 py-1">{item.rank}</td>
                          <td className="px-2 py-1">{item.songName || item.songId}</td>
                          <td className="px-2 py-1 font-semibold">{item.totalPoints}</td>
                          <td className="px-2 py-1">{item.oldRank ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default AdminTrending;


