import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import ChatBubble from "@/components/ChatBubble";
import PromotionCarousel from "@/components/PromotionCarousel";
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
} from "lucide-react";
import { searchApi, songsApi, artistsApi, albumsApi } from "@/services/api";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get("query") || "";

  const [searchResults, setSearchResults] = useState({
    songs: [],
    artists: [],
    albums: [],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailedResults, setDetailedResults] = useState<any>({
    songs: [],
    artists: [],
    albums: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { playSong, setQueue } = useMusic();
  useEffect(() => {
    if (queryParam) {
      fetchSearchResults(queryParam);
    }
  }, [queryParam]);
  const fetchSearchResults = async (queryParam) => {
    if (!queryParam.trim()) return;
    setLoading(true);
    const data = await searchApi.getAll(queryParam);
    setSearchResults(data);
    setDetailedResults({ songs: [], artists: [], albums: [] });
    console.log(data)
    setLoading(false);
  };

  const handleFilterChange = async (filterId: string) => {
    setActiveFilter(filterId);
    
    if (filterId === 'all' || !queryParam) {
      setDetailedResults({ songs: [], artists: [], albums: [] });
      return;
    }

    setLoading(true);
    try {
      if (filterId === 'songs') {
        const data = await songsApi.getAll({ search: queryParam, size: 20, page: 0 });
        setDetailedResults((prev) => ({ ...prev, songs: data.content || [] }));
      } else if (filterId === 'artists') {
        const data = await artistsApi.getAll({ search: queryParam, size: 20, page: 0 });
        setDetailedResults((prev) => ({ ...prev, artists: data.content || [] }));
      } else if (filterId === 'albums') {
        const data = await albumsApi.getAll({ search: queryParam, size: 20, page: 0 });
        setDetailedResults((prev) => ({ ...prev, albums: data.content || [] }));
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

  const totalCount = searchResults.songs.length + searchResults.artists.length + searchResults.albums.length;
  const filters = [
    { id: "all", label: "All", count: totalCount },
    { id: "songs", label: "Songs", count: searchResults.songs.length },
    { id: "artists", label: "Artists", count: searchResults.artists.length },
    { id: "albums", label: "Albums", count: searchResults.albums.length },
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

  const handlePlaySong = (song) => {
    const formattedSongs = searchResults.songs.map(s => mapToPlayerSong(s));

    setQueue(formattedSongs);
    const currentFormatted = formattedSongs.find(s => s.id === String(song.id));
    playSong(currentFormatted);
  };


  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />

      <div className="pt-6 pb-6 container mx-auto px-4">
        {/* Promotion Carousel */}
        <PromotionCarousel />
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
                            onClick={() => handlePlaySong(song)}
                          >
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
                              <p className="font-semibold text-foreground truncate">{song.name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {song.artists?.map(a => a.name).join(", ")}
                              </p>
                            </div>
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
                      onClick={() => navigate(`/album/${album.id}`)}
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
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
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
    </div>
  );
};

export default SearchResults;