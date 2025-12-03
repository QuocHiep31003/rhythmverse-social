import { useEffect, useState, useCallback, useRef } from "react";
import Footer from "@/components/Footer";
import ChatBubble from "@/components/ChatBubble";
import BannerCarousel from "@/components/BannerCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Search,
  Music,
  User,
  Calendar,
  Clock,
  ExternalLink,
  Apple,
  CheckCircle,
  AlertCircle,
  ListPlus,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { searchApi, songsApi, artistsApi, albumsApi, playlistsApi } from "@/services/api";
import type { Song } from "@/services/api/songApi";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { apiClient } from "@/services/api/config";
import { createSlug } from "@/utils/playlistUtils";
import { toast } from "@/hooks/use-toast";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get("query") || "";

  const [searchResults, setSearchResults] = useState<{
    songs: Song[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    artists: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    albums: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playlists: any[];
  }>({
    songs: [],
    artists: [],
    albums: [],
    playlists: [],
  });
  const [detailedResults, setDetailedResults] = useState<{
    songs: Song[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    artists: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    albums: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playlists: any[];
  }>({
    songs: [],
    artists: [],
    albums: [],
    playlists: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: number; name: string; urlImageAlbum?: string } | null>(null);
  const { playSong, addToQueue, setQueue } = useMusic();
  
  // Debounce search - dùng useRef để tránh re-render
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchSearchResults = useCallback(async (queryParam: string) => {
    if (!queryParam.trim()) return;
    setLoading(true);
    try {
      // Gọi search API tổng hợp (bao gồm playlists)
      const searchResponse = await searchApi.getAll(queryParam);
      
      // Gọi API riêng biệt cho từng loại kết quả (fallback nếu search API không có)
      const [songsResponse, artistsResponse, albumsResponse] = await Promise.all([
        songsApi.searchPublic({ query: queryParam, size: 5, page: 0 }),
        artistsApi.getAll({ search: queryParam, size: 4, page: 0 }),
        albumsApi.getAll({ search: queryParam, size: 4, page: 0 }),
      ]);

      const publicSongs = songsResponse.content || [];

      setSearchResults({
        songs: searchResponse.songs || publicSongs,
        artists: searchResponse.artists || artistsResponse.content || [],
        albums: searchResponse.albums || albumsResponse.content || [],
        playlists: searchResponse.playlists || [],
      });
      setDetailedResults({ songs: [], artists: [], albums: [], playlists: [] });
      console.log('Search results:', {
        songs: (searchResponse.songs || publicSongs).length,
        artists: (searchResponse.artists || artistsResponse.content || []).length,
        albums: (searchResponse.albums || albumsResponse.content || []).length,
        playlists: (searchResponse.playlists || []).length,
      });
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults({ songs: [], artists: [], albums: [], playlists: [] });
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (queryParam) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Set new timeout for debounce
      const timeout = setTimeout(() => {
        fetchSearchResults(queryParam);
      }, 300); // 300ms debounce
      searchTimeoutRef.current = timeout;
      
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      };
    }
  }, [queryParam, fetchSearchResults]);

  const handleFilterChange = async (filterId: string) => {
    setActiveFilter(filterId);
    
    if (filterId === 'all' || !queryParam) {
      setDetailedResults({ songs: [], artists: [], albums: [] });
      return;
    }

    setLoading(true);
    try {
      if (filterId === 'songs') {
        const data = await songsApi.searchPublic({ query: queryParam, size: 20, page: 0 });
        setDetailedResults((prev) => ({ ...prev, songs: data.content || [] }));
      } else if (filterId === 'artists') {
        const data = await artistsApi.getAll({ search: queryParam, size: 20, page: 0 });
        setDetailedResults((prev) => ({ ...prev, artists: data.content || [] }));
      } else       if (filterId === 'albums') {
        const data = await albumsApi.getAll({ search: queryParam, size: 20, page: 0 });
        setDetailedResults((prev) => ({ ...prev, albums: data.content || [] }));
      } else if (filterId === 'playlists') {
        // Gọi search API và playlist API để lấy nhiều playlists hơn
        const [searchData, playlistsData] = await Promise.all([
          searchApi.getAll(queryParam),
          playlistsApi.getAll({ search: queryParam, size: 50, page: 0 }).catch(() => ({ content: [] }))
        ]);
        // Kết hợp kết quả từ cả 2 API, loại bỏ trùng lặp
        const allPlaylists = [
          ...(searchData.playlists || []),
          ...(playlistsData.content || [])
        ];
        const uniquePlaylists = allPlaylists.filter((p, index, self) => 
          index === self.findIndex((pl) => pl.id === p.id)
        );
        setDetailedResults((prev) => ({ ...prev, playlists: uniquePlaylists }));
      }
    } catch (error) {
      console.error('Error fetching detailed results:', error);
    } finally {
      setLoading(false);
    }
  };
  // 🔹 Gọi API mỗi khi searchQuery thay đổi
  // useEffect(() => {


  //   fetchSearchResults(searchQuery);
  // }, [searchQuery]);



  // const searchResults = {
  //   songs: [
  //     { id: 1, title: "Love Story", artist: "Taylor Swift", album: "Fearless", duration: "3:55", image: "/placeholder.svg" },
  //     { id: 2, title: "Perfect", artist: "Ed Sheeran", album: "÷ (Divide)", duration: "4:23", image: "/placeholder.svg" },
  //     { id: 3, title: "All of Me", artist: "John Legend", album: "Love in the Future", duration: "4:29", image: "/placeholder.svg" },
  //     { id: 4, title: "Thinking Out Loud", artist: "Ed Sheeran", album: "x (Multiply)", duration: "4:41", image: "/placeholder.svg" },
  //     { id: 5, title: "A Thousand Years", artist: "Christina Perri", album: "The Twilight Saga", duration: "4:45", image: "/placeholder.svg" },
  //     { id: 6, title: "Make You Feel My Love", artist: "Adele", album: "19", duration: "3:32", image: "/placeholder.svg" },
  //     { id: 7, title: "Just the Way You Are", artist: "Bruno Mars", album: "Doo-Wops & Hooligans", duration: "3:40", image: "/placeholder.svg" },
  //     { id: 8, title: "Someone Like You", artist: "Adele", album: "21", duration: "4:45", image: "/placeholder.svg" }
  //   ],
  //   artists: [
  //     { id: 1, name: "Taylor Swift", followers: "89.2M", verified: true },
  //     { id: 2, name: "Ed Sheeran", followers: "47.8M", verified: true },
  //     { id: 3, name: "Adele", followers: "35.1M", verified: true }
  //   ],
  //   albums: [
  //     { id: 1, title: "Love in the Future", artist: "John Legend", year: "2013", tracks: 16 },
  //     { id: 2, title: "÷ (Divide)", artist: "Ed Sheeran", year: "2017", tracks: 16 },
  //     { id: 3, title: "21", artist: "Adele", year: "2011", tracks: 11 }
  //   ],
  //   playlists: [
  //     { id: 1, title: "Love Songs Collection", creator: "Spotify", tracks: 150, followers: "2.1M" },
  //     { id: 2, title: "Romantic Hits", creator: "Music Team", tracks: 85, followers: "856K" },
  //     { id: 3, title: "Love Ballads", creator: "Classic FM", tracks: 120, followers: "1.2M" }
  //   ]
  // };

  // const trendingSongs = [
  //   { id: 1, title: "Vampire", artist: "Olivia Rodrigo", trend: "+25%" },
  //   { id: 2, title: "Flowers", artist: "Miley Cyrus", trend: "+18%" },
  //   { id: 3, title: "Anti-Hero", artist: "Taylor Swift", trend: "+12%" },
  //   { id: 4, title: "Unholy", artist: "Sam Smith", trend: "+31%" }
  // ];

  // const genreTrending = [
  //   { genre: "Pop", songs: 1240, icon: "🎵" },
  //   { genre: "Rock", songs: 890, icon: "🎸" },
  //   { genre: "Hip Hop", songs: 750, icon: "🎤" },
  //   { genre: "Electronic", songs: 620, icon: "🔊" }
  // ];

  const totalCount = searchResults.songs.length + searchResults.artists.length + searchResults.albums.length + searchResults.playlists.length;
  const filters = [
    { id: "all", label: "All", count: totalCount },
    { id: "songs", label: "Songs", count: searchResults.songs.length },
    { id: "artists", label: "Artists", count: searchResults.artists.length },
    { id: "albums", label: "Albums", count: searchResults.albums.length },
    { id: "playlists", label: "Playlists", count: searchResults.playlists.length },
  ];

  const formatTimecode = (timecode: string) => {
    const seconds = parseInt(timecode);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePlaySong = async (song) => {
    try {
      // Dùng play-now endpoint giống như trang test để đảm bảo phát được
      const songId = typeof song.id === 'string' ? parseInt(song.id, 10) : song.id;
      if (isNaN(songId)) {
        toast({
          title: "Lỗi",
          description: "ID bài hát không hợp lệ.",
          variant: "destructive",
        });
        return;
      }

      // Gọi play-now endpoint để setup và lấy streamUrl
      const response = await apiClient.post(`/songs/${songId}/play-now`, {});
      
      // Kiểm tra lỗi từ response
      if (response.data?.success === false) {
        const errorMsg = response.data?.error || 'Không thể phát bài hát';
        if (errorMsg.includes('HLS master playlist not found')) {
          toast({
            title: "Bài hát chưa sẵn sàng",
            description: "File audio của bài hát này chưa được xử lý. Vui lòng thử bài hát khác.",
            variant: "destructive",
            duration: 5000,
          });
        } else if (errorMsg.includes('missing uuid')) {
          toast({
            title: "Bài hát chưa sẵn sàng",
            description: "Bài hát này chưa có file audio. Vui lòng thử bài hát khác.",
            variant: "destructive",
            duration: 5000,
          });
        } else {
          toast({
            title: "Lỗi",
            description: errorMsg,
            variant: "destructive",
          });
        }
        return;
      }
      
      // Nếu /play-now thành công, đã có streamUrl và playback state đã được setup
      // Chỉ cần set song vào context, không cần gọi playbackApi.playSong() nữa
      if (response.data?.song) {
        const formattedSong = mapToPlayerSong(response.data.song);
        // Đảm bảo UUID được set từ response để MusicPlayer có thể load stream
        if (response.data.song.uuid) {
          formattedSong.uuid = response.data.song.uuid;
        }
        setQueue([formattedSong]);
        
        // Gọi playSong với skipApiCall=true vì /play-now đã setup playback state rồi
        // playSong sẽ chỉ set currentSong và trigger MusicPlayer, không gọi API
        await playSong(formattedSong, true);
      } else {
        // Fallback: dùng cách cũ nếu không có song trong response
        const formattedSong = mapToPlayerSong(song);
        setQueue([formattedSong]);
        playSong(formattedSong, false);
      }
    } catch (error: unknown) {
      console.error('Error playing song:', error);
      const errorResponse = error as { response?: { data?: { error?: string; success?: boolean } }; message?: string };
      const errorMessage = errorResponse?.response?.data?.error 
        || (error instanceof Error ? error.message : 'Không thể phát bài hát');
      
      // Xử lý lỗi cụ thể
      if (errorMessage.includes('HLS master playlist not found') || 
          errorResponse?.response?.data?.error?.includes('HLS master playlist not found')) {
        toast({
          title: "Bài hát chưa sẵn sàng",
          description: "File audio của bài hát này chưa được xử lý. Vui lòng thử bài hát khác.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Lỗi",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };


  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />

      <div className="pt-6 pb-6 container mx-auto px-4">
        {/* Banner Carousel */}
        <BannerCarousel />
      </div>

      {/* Filter Tabs */}
      <div className="pb-6">
        <div className="container mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {filters.map((filter) => {
              const isDisabled = filter.id === "all" ? filter.count === 0 : filter.count === 0;
              return (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  onClick={() => {
                    if (!isDisabled) handleFilterChange(filter.id);
                  }}
                  disabled={isDisabled}
                  className={`rounded-full px-6 py-2 whitespace-nowrap ${isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : activeFilter === filter.id
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-32">
        <div className="flex gap-8">
          {/* Main Results */}
          <div className="flex-1">
            {(activeFilter === "all" || activeFilter === "songs") && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Songs</h3>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (detailedResults.songs.length > 0 ? detailedResults.songs : searchResults.songs).length > 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="p-0">
                      <div className="space-y-1">
                        {(detailedResults.songs.length > 0 ? detailedResults.songs : searchResults.songs).slice(0, activeFilter === "all" ? 5 : 20).map((song, index) => (
                          <div
                            key={song.id}
                            className="flex items-center gap-4 p-3 hover:bg-muted/50 group cursor-pointer rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => handlePlaySong(song)}>
                            <span className="w-6 text-sm text-muted-foreground text-center group-hover:hidden">
                              {index + 1}
                            </span>
                            <div className="w-6 flex justify-center opacity-0 group-hover:opacity-100">
                              <Play className="w-4 h-4 text-foreground" />
                            </div>
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                              <img src={song.urlImageAlbum || "/placeholder.svg"} alt={song.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{song.name || song.songName || "Unknown Song"}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {typeof song.artists === 'string' 
                                  ? song.artists 
                                  : Array.isArray(song.artists) 
                                    ? song.artists.map((a: { name?: string; id?: number } | string) => 
                                        typeof a === 'string' ? a : a.name || String(a.id || '')
                                      ).join(", ")
                                    : song.artist || "Unknown Artist"}
                              </p>
                            </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToQueue(mapToPlayerSong(song));
                                    toast({
                                      title: "Đã thêm vào danh sách phát",
                                      description: `${song.name} đã được đưa vào hàng chờ.`,
                                      variant: "success",
                                    });
                                  }}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Thêm vào danh sách đang phát
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSong({ id: song.id, name: song.name, urlImageAlbum: song.urlImageAlbum });
                                    setAddToPlaylistOpen(true);
                                  }}
                                >
                                  <ListPlus className="w-4 h-4 mr-2" />
                                  Thêm vào playlist
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `${window.location.origin}/song/${song.id}`;
                                    navigator.clipboard.writeText(url);
                                    toast({
                                      title: "Đã sao chép liên kết bài hát",
                                      description: "Có thể dán và chia sẻ ngay với bạn bè.",
                                      variant: "info",
                                    });
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Sao chép liên kết
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-muted-foreground">No songs found.</p>
                )}
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "artists") && (detailedResults.artists.length > 0 ? detailedResults.artists : searchResults.artists).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Artists</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {(detailedResults.artists.length > 0 ? detailedResults.artists : searchResults.artists).slice(0, activeFilter === "all" ? 4 : 20).map((artist) => (
                    <Card 
                      key={artist.id} 
                      className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/artist/${artist.id}`)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-32 h-32 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
                          {artist.avatar ? (
                            <img 
                              src={artist.avatar} 
                              alt={artist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-16 h-16 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-1 text-foreground truncate px-2">
                          {artist.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate px-2">
                          {artist.country || "Unknown"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {(activeFilter === "all" || activeFilter === "albums") && (detailedResults.albums.length > 0 ? detailedResults.albums : searchResults.albums).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Albums</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {(detailedResults.albums.length > 0 ? detailedResults.albums : searchResults.albums).slice(0, activeFilter === "all" ? 4 : 20).map((album) => (
                    <Card
                      key={album.id}
                      onClick={() => navigate(`/album/${createSlug(album.name || album.title || 'album', album.id)}`)}
                      className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-32 h-32 bg-muted rounded-lg mx-auto mb-4 overflow-hidden flex items-center justify-center">
                          <img
                            src={album.coverUrl || "/placeholder.svg"}
                            alt={album.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="font-bold text-lg mb-1 text-foreground truncate">{album.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {album.artist?.name || "Unknown Artist"}
                        </p>
                        {album.releaseYear && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Released: {album.releaseYear}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "playlists") && (detailedResults.playlists.length > 0 ? detailedResults.playlists : searchResults.playlists).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Playlists</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {(detailedResults.playlists.length > 0 ? detailedResults.playlists : searchResults.playlists).slice(0, activeFilter === "all" ? 3 : 50).map((playlist) => {
                    // Helper function để lấy ảnh cover: ưu tiên coverUrl, sau đó ảnh bài hát đầu tiên, cuối cùng là placeholder
                    const getPlaylistCover = () => {
                      // 1. Ưu tiên coverUrl của playlist
                      if (playlist.coverUrl) {
                        return playlist.coverUrl;
                      }
                      // 2. Nếu không có, lấy ảnh album của bài hát đầu tiên
                      if (Array.isArray(playlist.songs) && playlist.songs.length > 0) {
                        const firstSong = playlist.songs[0] as { urlImageAlbum?: string; albumCoverImg?: string; cover?: string };
                        if (firstSong?.urlImageAlbum || firstSong?.albumCoverImg || firstSong?.cover) {
                          return firstSong.urlImageAlbum || firstSong.albumCoverImg || firstSong.cover;
                        }
                      }
                      // 3. Cuối cùng là null (sẽ hiển thị placeholder)
                      return null;
                    };

                    const coverImage = getPlaylistCover();
                    const showPlaceholder = !coverImage;

                    return (
                      <Card
                        key={playlist.id}
                        onClick={() => navigate(`/playlist/${createSlug(playlist.name || playlist.title || 'playlist', playlist.id)}`)}
                        className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <CardContent className="p-6 text-center">
                          <div className="w-32 h-32 bg-muted rounded-lg mx-auto mb-4 overflow-hidden flex items-center justify-center">
                            {!showPlaceholder ? (
                              <img
                                src={coverImage}
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Nếu ảnh load lỗi, hiển thị placeholder
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const placeholder = parent.querySelector('.music-placeholder') as HTMLElement;
                                    if (placeholder) placeholder.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center music-placeholder ${showPlaceholder ? '' : 'hidden'}`}>
                              <Music className="w-16 h-16 text-white/80" />
                            </div>
                          </div>
                          <h3 className="font-bold text-lg mb-1 text-foreground truncate">{playlist.name || playlist.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {playlist.ownerName || playlist.owner?.name || "EchoVerse"}
                          </p>
                          {playlist.type && (
                            <Badge 
                              variant="outline" 
                              className={`mt-2 text-xs ${
                                playlist.type === "EDITORIAL" ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/30" :
                                playlist.type === "SYSTEM_GLOBAL" ? "bg-green-500/20 text-green-200 border-green-400/30" :
                                playlist.type === "SYSTEM_PERSONALIZED" ? "bg-pink-500/20 text-pink-200 border-pink-400/30" :
                                ""
                              }`}
                            >
                              {playlist.type === "EDITORIAL" ? "By EchoVerse" :
                               playlist.type === "SYSTEM_GLOBAL" ? "Auto-Generated" :
                               playlist.type === "SYSTEM_PERSONALIZED" ? "For You" : ""}
                            </Badge>
                          )}
                          {playlist.songs && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {playlist.songs.length} songs
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Compact Sidebar */}
          {(searchResults.songs.length > 0) && (
            <div className="w-80 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Trending Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {searchResults.songs.map((song, index) => (
                  <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <Play className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{song.name || song.songName || "Unknown Song"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                                {typeof song.artists === 'string' 
                                  ? song.artists 
                                  : Array.isArray(song.artists) 
                                    ? song.artists.map((a: { name?: string; id?: number } | string) => 
                                        typeof a === 'string' ? a : a.name || String(a.id || '')
                                      ).join(", ")
                                    : song.artist || "Unknown Artist"}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">{song.trend}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Popular Genres</CardTitle>
              </CardHeader>
              {/* <CardContent className="space-y-3">
                {genreTrending.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium text-foreground">{item.genre}</span>
                    </div>
                    <Badge variant="secondary">
                      {item.songs}
                    </Badge>
                  </div>
                ))}
              </CardContent> */}
            </Card>
            </div>
          )}
        </div>
      </div>

      <Footer />
      
      {selectedSong && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={selectedSong.id}
          songTitle={selectedSong.name}
          songCover={selectedSong.urlImageAlbum}
        />
      )}
    </div>
  );
};

export default SearchResults;