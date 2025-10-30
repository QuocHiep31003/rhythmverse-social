import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Music, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type SimpleDTO = { id: number; name: string };

type TrendingScoreDTO = {
  id: number;
  songId: number;
  songName: string;
  score: number;
  audioUrl?: string | null;
  releaseYear?: number | null;
  playCount?: number | null;
  duration?: string | null;
  albumImageUrl?: string | null;
  artists?: SimpleDTO[];
  genres?: SimpleDTO[];
  l7?: number;
  l30?: number;
  t7?: number;
  t30?: number;
  ageBonus?: number;
  decayPenalty?: number;
  calculatedAt?: string;
  lprev7?: number;
};

const AdminTrending = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [items, setItems] = useState<TrendingScoreDTO[]>([]);

  // client-side pagination for Top 100
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const totalElements = items.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalElements / pageSize)), [totalElements, pageSize]);

  const pagedItems = useMemo(() => {
    const start = currentPage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const fetchTop100 = async () => {
    setIsLoading(true);
    try {
      // Request larger page size from server to avoid being limited to server defaults (often 20)
      const url = `http://localhost:8080/api/trending/top-100?size=100&page=0`;
      const res = await fetch(url);
      if (res.status === 401 || res.status === 403) {
        toast.error("Access Denied - Vui lòng kiểm tra quyền truy cập");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message || "Không tải được Top 100");
        return;
      }

      // If server returns pageable format, normalize to array
      const content: TrendingScoreDTO[] = Array.isArray(data) ? data : (data?.content ?? []);
      setItems(content);
      setCurrentPage(0);
    } catch (e) {
      toast.error("Không thể kết nối đến server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('http://localhost:8080/api/trending/calculate', { method: 'POST' });
      const text = await res.text();
      let message: string | undefined;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || parsed?.status;
      } catch {
        message = text;
      }
      if (res.ok) {
        toast.success(message || "Đã tính lại điểm trending");
        await fetchTop100();
      } else {
        toast.error(message || "Không tính lại được điểm trending");
      }
    } catch (e) {
      toast.error("Không thể kết nối đến server");
    } finally {
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    fetchTop100();
  }, []);

  const getPageNumbers = (total: number, current: number) => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, current - Math.floor(maxVisible / 2));
    let end = Math.min(total - 1, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(0, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const goToFirst = () => setCurrentPage(0);
  const goToPrev = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
  const goToLast = () => setCurrentPage(totalPages - 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-admin bg-clip-text text-transparent">Trending</h1>
          <p className="text-muted-foreground">Tính toán và xem Top 100 theo Trending Score</p>
        </div>
       
      </div>

      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Top 100 Trending</CardTitle>
              <CardDescription>{items.length} bài hát được xếp hạng theo Trending Score</CardDescription>
            </div>
            <Button onClick={handleRecalculate} disabled={isRecalculating} className="gap-2">
          {isRecalculating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tính lại...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Tính lại Trending
            </>
          )}
        </Button>
          </div>
          
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--admin-primary))]" />
              <span className="ml-3 text-muted-foreground">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {pagedItems.map((row, idx) => {
                  const rank = currentPage * pageSize + idx + 1;
                  const artistNames = (row.artists ?? []).map(a => a.name).join(", ");
                  return (
                    <div key={`${row.id}-${row.songId}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-[hsl(var(--admin-border))] transition-colors duration-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl font-bold text-[hsl(var(--admin-primary))] w-8 text-center">{rank}</span>
                        <div className="w-14 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Music className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">{row.songName}</p>
                          <p className="text-sm text-muted-foreground truncate">{artistNames || "Unknown"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {typeof row.playCount === 'number' && (
                          <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">{row.playCount.toLocaleString()} lượt phát</span>
                        )}
                        {typeof row.score === 'number' && (
                          <span className="text-sm text-green-500 font-medium">Score: {row.score.toFixed(4)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {Math.min(pageSize, totalElements - currentPage * pageSize)} trên tổng số {totalElements} bài hát
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={goToFirst} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToPrev} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {getPageNumbers(totalPages, currentPage).map((p) => (
                      <Button key={p} variant="outline" size="icon" onClick={() => setCurrentPage(p)} className={`h-8 w-8 border-[hsl(var(--admin-border))] ${currentPage === p ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]" : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"}`}>
                        {p + 1}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" onClick={goToNext} disabled={currentPage >= totalPages - 1} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToLast} disabled={currentPage >= totalPages - 1} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]">
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
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


