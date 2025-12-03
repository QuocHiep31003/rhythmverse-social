import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Trash2 } from "lucide-react";
import Footer from "@/components/Footer";
import { formatPlayCount } from "@/lib/utils";
import { listeningHistoryApi, ListeningHistoryDTO } from "@/services/api/listeningHistoryApi";
import { userApi } from "@/services/api/userApi";
import { toast } from "@/hooks/use-toast";

const ListeningHistory = () => {
  const [history, setHistory] = useState<ListeningHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchUserAndHistory();
  }, []);

  const fetchUserAndHistory = async () => {
    try {
      setLoading(true);
      // Lấy thông tin user hiện tại
      const user = await userApi.getCurrentProfile();
      if (user?.id) {
        setUserId(user.id);
        await fetchHistory(user.id);
      } else {
        toast({
          title: "Error",
          description: "Please login to view your listening history",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      toast({
        title: "Error",
        description: "Failed to load user information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (currentUserId: number) => {
    try {
      setLoading(true);
      const data = await listeningHistoryApi.getByUser(currentUserId, 0, 100);
      console.log('📊 Listening History Data:', data);
      console.log('📊 First item:', data[0]);
      console.log('📊 Song data:', data[0]?.song);
      
      // Remove duplicates based on id (keep first occurrence)
      const uniqueData = data.filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      );
      
      // Sort by listenedAt date (newest first) - backend đã sort nhưng đảm bảo
      const sortedData = uniqueData.sort((a, b) => {
        const dateA = new Date(a.listenedAt || 0).getTime();
        const dateB = new Date(b.listenedAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
      
      setHistory(sortedData);
    } catch (error) {
      console.error("Failed to fetch listening history:", error);
      toast({
        title: "Error",
        description: "Failed to load listening history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await listeningHistoryApi.delete(id);
      setHistory(history.filter(h => h.id !== id));
      toast({
        title: "Deleted",
        description: "Removed from listening history",
      });
    } catch (error) {
      console.error("Failed to delete history item:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Listening History
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Your recently played songs
          </p>
        </div>

        {/* Listening History List */}
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Recent Activity
              <Badge variant="secondary" className="ml-2">
                {history.length} songs
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Headphones className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No listening history yet</p>
                  <p className="text-sm">Start playing songs to see your history here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, index) => (
                    <div
                      key={`${item.id}-${item.listenedAt}-${index}`}
                      className="
                        flex items-center gap-3 p-3 rounded-lg 
                        group cursor-pointer transition-all duration-300
                        hover:bg-white/5 hover:scale-[1.01] hover:shadow-inner
                      "
                    >
                      {/* Song Number */}
                      <span className="w-6 text-sm text-muted-foreground text-center font-medium">
                        {index + 1}
                      </span>

                      {/* Cover Image */}
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {item.song?.cover ? (
                          <img
                            src={item.song.cover}
                            alt={item.song.name || item.song.songName || "Unknown Song"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <Headphones className="w-7 h-7 text-gray-400" />
                        )}
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm group-hover:text-primary transition-colors">
                          {item.song?.name || item.song?.songName || item.songName || "Unknown Song"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.song?.artistNames?.join(", ") ||
                            item.song?.artists?.map((a: any) => a.name).join(", ") ||
                            item.artistNames?.join(", ") ||
                            "Unknown Artist"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.song?.album?.name && (
                            <span className="text-xs text-muted-foreground truncate">
                              {item.song.album.name}
                            </span>
                          )}
                          {item.song?.duration && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(item.song.duration)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Play Count & Timestamp */}
                      <div className="text-right mr-3 hidden md:block">
                        <div className="flex flex-col items-end gap-1">
                          {item.song?.playCount > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Headphones className="w-3 h-3" />
                              {formatPlayCount(item.song.playCount)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.listenedAt)}
                          </p>
                        </div>
                      </div>


                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id!);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ListeningHistory;
