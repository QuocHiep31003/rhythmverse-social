import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChartHorizontalBig } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL, buildJsonHeaders } from "@/services/api/config";

const snapshotApi = {
  getAll: async (page = 0, size = 20) => {
    const res = await fetch(`${API_BASE_URL}/admin/snapshots?page=${page}&size=${size}`, {
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch snapshots");
    return res.json();
  },
  getDetails: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/admin/snapshots/${id}/details`, {
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch snapshot details");
    return res.json();
  },
};

const AdminSnapshots = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(30); // lấy đủ 30 snapshot
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any[]>([]);

  useEffect(() => { loadSnapshots(); }, [currentPage, pageSize]);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const data = await snapshotApi.getAll(currentPage, pageSize);
      setSnapshots(data); // [{id, createdAt}]
    } catch { toast({ description: "Không thể tải danh sách snapshot!", variant: "destructive" }); }
    setLoading(false);
  };

  const showDetails = async (id: number) => {
    setLoading(true);
    setSelectedSnapshot(id);
    try {
      const data = await snapshotApi.getDetails(id);
      setDetails(data); // [{songId, points, rank, songName}]
    } catch { toast({ description: "Không thể tải BXH snapshot!", variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="mb-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg"><BarChartHorizontalBig className="w-7 h-7 text-white" /></div>
        <h1 className="text-3xl font-bold">Quản lý Snapshot BXH</h1>
        <Badge variant="secondary">{snapshots.length} snapshot</Badge>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="font-bold mr-2">Các mốc snapshot:</span>
            <div className="flex gap-1 flex-wrap">
              {snapshots.map(snap => (
                <Button key={snap.id}
                  variant={selectedSnapshot === snap.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => showDetails(snap.id)}>
                  #{snap.id}<span className="ml-1 text-muted-foreground">({snap.createdAt.replace('T',' ').substring(0,16)})</span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSnapshot && <div className="text-center text-muted-foreground">Chọn snapshot để xem BXH!</div>}
          {selectedSnapshot && (
            <>
            <div className="font-medium py-2">BXH Top 100 snapshot #{selectedSnapshot}</div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs">#</th>
                    <th className="px-2 py-1 text-left text-xs">Tên bài hát</th>
                    <th className="px-2 py-1 text-left text-xs">Điểm</th>
                    <th className="px-2 py-1 text-left text-xs">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((item, idx) => (
                    <tr key={item.songId} className="border-b">
                      <td className="px-2 py-1">{idx+1}</td>
                      <td className="px-2 py-1">{item.songName} <span className="text-muted-foreground font-mono">({item.songId})</span></td>
                      <td className="px-2 py-1 font-semibold">{item.points}</td>
                      <td className="px-2 py-1">{item.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default AdminSnapshots;
