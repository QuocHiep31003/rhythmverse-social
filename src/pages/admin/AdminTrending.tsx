import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Music } from "lucide-react";
import { toast } from "sonner";
import { mockSongs } from "@/data/mockData";

const AdminTrending = () => {
  const [isRecalculatingWeek, setIsRecalculatingWeek] = useState(false);
  const [isRecalculatingMonth, setIsRecalculatingMonth] = useState(false);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  
  // Pagination states - separate for Week and Month
  const [currentPageWeek, setCurrentPageWeek] = useState(0);
  const [currentPageMonth, setCurrentPageMonth] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPagesWeek, setTotalPagesWeek] = useState(0);
  const [totalPagesMonth, setTotalPagesMonth] = useState(0);
  const [totalElementsWeek, setTotalElementsWeek] = useState(0);
  const [totalElementsMonth, setTotalElementsMonth] = useState(0);
  
  const [top100Week, setTop100Week] = useState(mockSongs.slice(0, 20));
  const [top100Month, setTop100Month] = useState(mockSongs.slice(0, 20));

  const fetchTop100Week = async () => {
    setIsLoadingWeek(true);
    try {
      console.log("🔧 START: Fetching weekly top 100...");
      const url = `http://localhost:8080/api/trending/weekly/top100?page=${currentPageWeek}&size=${pageSize}`;
      console.log("🔧 URL:", url);
      
      const res = await fetch(url);
      console.log("🔧 Response status:", res.status);
      
      if (res.status === 401 || res.status === 403) {
        console.error("❌ ERROR: Access Denied");
        toast.error("Access Denied - Vui lòng kiểm tra quyền truy cập");
        return;
      }
      
      const data = await res.json();
      console.log("🔧 Response data:", data);
      
      if (res.ok) {
        // Map API data to display format
        const songs = data.content || data || [];
        console.log("🔧 Songs count:", songs.length);
        
        const mappedData = songs.map((song: any, index: number) => ({
          id: song.id,
          title: song.name,
          artist: song.artistNames?.join(", ") || "Unknown",
          plays: song.playCount,
          rank: song.rank || (currentPageWeek * pageSize + index + 1),
          trendingScore: song.trendingScore
        }));
        
        setTop100Week(mappedData);
        setTotalPagesWeek(data.totalPages || 0);
        setTotalElementsWeek(data.totalElements || songs.length);
        console.log("🔧 COMPLETE: Weekly top 100 loaded");
      } else {
        console.error("❌ ERROR: Failed to fetch weekly top 100:", data);
        toast.error(data.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("❌ ERROR: Error fetching weekly top 100:", error);
      toast.error("Không thể kết nối đến server");
    } finally {
      setIsLoadingWeek(false);
    }
  };

  const fetchTop100Month = async () => {
    setIsLoadingMonth(true);
    try {
      console.log("🔧 START: Fetching monthly top 100...");
      const url = `http://localhost:8080/api/trending/monthly/top100?page=${currentPageMonth}&size=${pageSize}`;
      console.log("🔧 URL:", url);
      
      const res = await fetch(url);
      console.log("🔧 Response status:", res.status);
      
      if (res.status === 401 || res.status === 403) {
        console.error("❌ ERROR: Access Denied");
        toast.error("Access Denied - Vui lòng kiểm tra quyền truy cập");
        return;
      }
      
      const data = await res.json();
      console.log("🔧 Response data:", data);
      
      if (res.ok) {
        // Map API data to display format
        const songs = data.content || data || [];
        console.log("🔧 Songs count:", songs.length);
        
        const mappedData = songs.map((song: any, index: number) => ({
          id: song.id,
          title: song.name,
          artist: song.artistNames?.join(", ") || "Unknown",
          plays: song.playCount,
          rank: song.rank || (currentPageMonth * pageSize + index + 1),
          trendingScore: song.trendingScore
        }));
        
        setTop100Month(mappedData);
        setTotalPagesMonth(data.totalPages || 0);
        setTotalElementsMonth(data.totalElements || songs.length);
        console.log("🔧 COMPLETE: Monthly top 100 loaded");
      } else {
        console.error("❌ ERROR: Failed to fetch monthly top 100:", data);
        toast.error(data.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("❌ ERROR: Error fetching monthly top 100:", error);
      toast.error("Không thể kết nối đến server");
    } finally {
      setIsLoadingMonth(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchTop100Week();
    fetchTop100Month();
  }, []);

  useEffect(() => {
    fetchTop100Week();
  }, [currentPageWeek]);

  useEffect(() => {
    fetchTop100Month();
  }, [currentPageMonth]);

  const handleRecalculateWeek = async () => {
    setIsRecalculatingWeek(true);
    try {
      console.log("🔧 START: Recalculating weekly trending...");
      
      const body = { period: 'WEEKLY' };
      console.log("🔧 Body:", JSON.stringify(body));
      console.log("🔧 URL: http://localhost:8080/api/trending/admin/recalculate");
      
      const res = await fetch('http://localhost:8080/api/trending/admin/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      console.log("🔧 Response status:", res.status);
      const data = await res.json();
      console.log("🔧 Response data:", data);
      
      if (res.ok) {
        console.log("🔧 COMPLETE: Weekly trending recalculated");
        toast.success(data.message || "Week trending scores recalculated successfully!");
        await fetchTop100Week();
      } else {
        console.error("❌ ERROR: Failed to recalculate weekly trending:", data);
        toast.error(data.message || data.error || "Failed to recalculate trending scores");
      }
    } catch (error) {
      console.error("❌ ERROR: Error recalculating trending:", error);
      toast.error("Failed to recalculate trending scores");
    } finally {
      setIsRecalculatingWeek(false);
    }
  };

  const handleRecalculateMonth = async () => {
    setIsRecalculatingMonth(true);
    try {
      console.log("🔧 START: Recalculating monthly trending...");
      
      const body = { period: 'MONTHLY' };
      console.log("🔧 Body:", JSON.stringify(body));
      console.log("🔧 URL: http://localhost:8080/api/trending/admin/recalculate");
      
      const res = await fetch('http://localhost:8080/api/trending/admin/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      console.log("🔧 Response status:", res.status);
      const data = await res.json();
      console.log("🔧 Response data:", data);
      
      if (res.ok) {
        console.log("🔧 COMPLETE: Monthly trending recalculated");
        toast.success(data.message || "Month trending scores recalculated successfully!");
        await fetchTop100Month();
      } else {
        console.error("❌ ERROR: Failed to recalculate monthly trending:", data);
        toast.error(data.message || data.error || "Failed to recalculate trending scores");
      }
    } catch (error) {
      console.error("❌ ERROR: Error recalculating trending:", error);
      toast.error("Failed to recalculate trending scores");
    } finally {
      setIsRecalculatingMonth(false);
    }
  };

  // Pagination functions for Week
  const goToPageWeek = (page: number) => setCurrentPageWeek(page);
  const goToFirstPageWeek = () => setCurrentPageWeek(0);
  const goToLastPageWeek = () => setCurrentPageWeek(totalPagesWeek - 1);
  const goToPreviousPageWeek = () => setCurrentPageWeek(prev => Math.max(0, prev - 1));
  const goToNextPageWeek = () => setCurrentPageWeek(prev => Math.min(totalPagesWeek - 1, prev + 1));

  // Pagination functions for Month
  const goToPageMonth = (page: number) => setCurrentPageMonth(page);
  const goToFirstPageMonth = () => setCurrentPageMonth(0);
  const goToLastPageMonth = () => setCurrentPageMonth(totalPagesMonth - 1);
  const goToPreviousPageMonth = () => setCurrentPageMonth(prev => Math.max(0, prev - 1));
  const goToNextPageMonth = () => setCurrentPageMonth(prev => Math.min(totalPagesMonth - 1, prev + 1));

  const getPageNumbers = (totalPages: number, currentPage: number) => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages)
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-admin bg-clip-text text-transparent">Tính lại Trending</h1>
          <p className="text-muted-foreground">Quản lý và tính toán điểm trending cho bài hát</p>
        </div>
      </div>

      <Tabs defaultValue="week" className="space-y-4">
        <TabsList>
          <TabsTrigger value="week">Trending Tuần</TabsTrigger>
          <TabsTrigger value="month">Trending Tháng</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-4">
          <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Top 100 Trending Tuần</CardTitle>
                  <CardDescription>{totalElementsWeek} bài hát trending nhất trong tuần qua</CardDescription>
                </div>
                <Button 
                  onClick={handleRecalculateWeek}
                  disabled={isRecalculatingWeek}
                  className="gap-2"
                >
                  {isRecalculatingWeek ? (
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
              {isLoadingWeek ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--admin-primary))]" />
                  <span className="ml-3 text-muted-foreground">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {top100Week.map((song: any) => (
                      <div 
                        key={song.id} 
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-[hsl(var(--admin-border))] transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl font-bold text-[hsl(var(--admin-primary))] w-8 text-center">
                            {song.rank || 0}
                          </span>
                          <div className="w-14 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Music className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-foreground">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {song.artist}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">
                            {song.plays?.toLocaleString() || 0} lượt phát
                          </span>
                          {song.trendingScore && (
                            <span className="text-sm text-green-500 font-medium">
                              Score: {song.trendingScore.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPagesWeek > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Hiển thị {top100Week.length} trên tổng số {totalElementsWeek} bài hát
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToFirstPageWeek}
                          disabled={currentPageWeek === 0}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToPreviousPageWeek}
                          disabled={currentPageWeek === 0}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        {getPageNumbers(totalPagesWeek, currentPageWeek).map((page) => (
                          <Button
                            key={page}
                            variant="outline"
                            size="icon"
                            onClick={() => goToPageWeek(page)}
                            className={`h-8 w-8 border-[hsl(var(--admin-border))] ${
                              currentPageWeek === page
                                ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]"
                                : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                            }`}
                          >
                            {page + 1}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToNextPageWeek}
                          disabled={currentPageWeek >= totalPagesWeek - 1}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToLastPageWeek}
                          disabled={currentPageWeek >= totalPagesWeek - 1}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Top 100 Trending Tháng</CardTitle>
                  <CardDescription>{totalElementsMonth} bài hát trending nhất trong tháng qua</CardDescription>
                </div>
                <Button 
                  onClick={handleRecalculateMonth}
                  disabled={isRecalculatingMonth}
                  className="gap-2"
                >
                  {isRecalculatingMonth ? (
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
              {isLoadingMonth ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--admin-primary))]" />
                  <span className="ml-3 text-muted-foreground">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {top100Month.map((song: any) => (
                      <div 
                        key={song.id} 
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-[hsl(var(--admin-border))] transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl font-bold text-[hsl(var(--admin-primary))] w-8 text-center">
                            {song.rank || 0}
                          </span>
                          <div className="w-14 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Music className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-foreground">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {song.artist}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">
                            {song.plays?.toLocaleString() || 0} lượt phát
                          </span>
                          {song.trendingScore && (
                            <span className="text-sm text-green-500 font-medium">
                              Score: {song.trendingScore.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPagesMonth > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Hiển thị {top100Month.length} trên tổng số {totalElementsMonth} bài hát
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToFirstPageMonth}
                          disabled={currentPageMonth === 0}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToPreviousPageMonth}
                          disabled={currentPageMonth === 0}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        {getPageNumbers(totalPagesMonth, currentPageMonth).map((page) => (
                          <Button
                            key={page}
                            variant="outline"
                            size="icon"
                            onClick={() => goToPageMonth(page)}
                            className={`h-8 w-8 border-[hsl(var(--admin-border))] ${
                              currentPageMonth === page
                                ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]"
                                : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                            }`}
                          >
                            {page + 1}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToNextPageMonth}
                          disabled={currentPageMonth >= totalPagesMonth - 1}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToLastPageMonth}
                          disabled={currentPageMonth >= totalPagesMonth - 1}
                          className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTrending;

