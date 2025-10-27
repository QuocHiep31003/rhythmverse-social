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
import { searchApi } from "@/services/api";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";

interface AuddResult {
  artist?: string;
  title?: string;
  album?: string;
  release_date?: string;
  label?: string;
  timecode?: string;
  song_link?: string;
  albumart?: string;
  spotify?: { url: string };
  deezer?: { url: string };
  apple_music?: { url: string };
}

interface AuddResponse {
  status: string;
  result: AuddResult;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParam = searchParams.get("query") || ""; // lấy giá trị query trên URL

  const [searchResults, setSearchResults] = useState({
    songs: [],
    artists: [],
    albums: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [recognitionResult, setRecognitionResult] = useState<AuddResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isRecognitionMode, setIsRecognitionMode] = useState(false);
  const { playSong, setQueue } = useMusic();
  useEffect(() => {
    // Check if this is a music recognition result
    if (location.state?.searchType === 'recognition') {
      setRecognitionResult(location.state.recognitionResult);
      setAudioUrl(location.state.audioUrl);
      setIsRecognitionMode(true);
      setActiveFilter("recognition");
    } else if (queryParam) {
      // Regular text search
      setIsRecognitionMode(false);
      fetchSearchResults(queryParam);
    }
  }, [queryParam, location.state]);
  const fetchSearchResults = async (queryParam) => {
    if (!queryParam.trim()) return;
    setLoading(true);
    const data = await searchApi.getAll(queryParam);
    setSearchResults(data);
    console.log(data)
    setLoading(false);
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
  const filters = isRecognitionMode ? [
    { id: "recognition", label: "Recognition Result", count: recognitionResult ? 1 : 0 },
  ] : [
    { id: "all", label: "All", count: totalCount },
    { id: "songs", label: "Songs", count: searchResults.songs.length },
    { id: "artists", label: "Artists", count: searchResults.artists.length },
    { id: "albums", label: "Albums", count: searchResults.albums.length },
    // { id: "playlists", label: "Playlists", count: searchResults.playlists.length }
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
    const formattedSongs = searchResults.songs.map(s => ({
      id: s.id,
      title: s.name,
      artist: s.artists?.map((a) => a.name).join(", ") || "Unknown",
      album: s.album?.name || "Unknown",
      duration: s.duration || 0,
      cover: s.urlImageAlbum || "",
      genre: s.genres?.[0]?.name || "Unknown",
      plays: s.playCount || 0,
      audio: s.audioUrl,
      audioUrl: s.audioUrl,
    }));

    setQueue(formattedSongs);
    const currentFormatted = formattedSongs.find(s => s.id === song.id);
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
                    if (!isDisabled) setActiveFilter(filter.id);
                  }}
                  disabled={isDisabled}
                  className={`rounded-full px-4 py-2 whitespace-nowrap ${isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : activeFilter === filter.id
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                >
                  {filter.label}
                  <Badge variant="secondary" className="ml-2">
                    {filter.count}
                  </Badge>
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
            {/* Music Recognition Results */}
            {isRecognitionMode && activeFilter === "recognition" && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Music Recognition Result</h3>
                {recognitionResult ? (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                        <Music className="w-6 h-6" />
                        Song Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Status */}
                      <div className="mb-4">
                        {recognitionResult.status === "success" ? (
                          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                              Music successfully recognized!
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Recognition failed. Status: {recognitionResult.status}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Song Details */}
                      <div className="flex gap-6">
                        {/* Album Art */}
                        <div className="flex-shrink-0">
                          <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                            {recognitionResult.result.albumart ? (
                              <img
                                src={recognitionResult.result.albumart}
                                alt="Album Cover"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-12 h-12 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 space-y-3">
                          <div>
                            <h2 className="text-2xl font-bold text-foreground">
                              {recognitionResult.result.title || "Unknown Title"}
                            </h2>
                            <p className="text-lg text-muted-foreground flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {recognitionResult.result.artist || "Unknown Artist"}
                            </p>
                          </div>

                          {recognitionResult.result.album && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                Album: {recognitionResult.result.album}
                              </Badge>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {recognitionResult.result.release_date && (
                              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                <Calendar className="w-3 h-3 mr-1" />
                                {recognitionResult.result.release_date}
                              </Badge>
                            )}
                            
                            {recognitionResult.result.timecode && (
                              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTimecode(recognitionResult.result.timecode)}
                              </Badge>
                            )}

                            {recognitionResult.result.label && (
                              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                Label: {recognitionResult.result.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Streaming Links */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Listen on:</h3>
                        <div className="flex flex-wrap gap-3">
                          {recognitionResult.result.spotify?.url && (
                            <Button
                              onClick={() => openExternalLink(recognitionResult.result.spotify!.url!)}
                              className="bg-[#1DB954] hover:bg-[#1ed760] text-white border-0 flex items-center gap-2"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 0C5.373 0 0 5.372 0 12c0 6.627 5.373 12 12 12s12-5.373 
                                12-12C24 5.372 18.627 0 12 0zM17.59 17.74a.747.747 0 0 
                                1-1.03.24c-2.82-1.73-6.37-2.12-10.56-1.17a.75.75 0 1 
                                1-.33-1.46c4.47-1.03 8.34-.59 11.42 1.27.36.22.47.69.24 
                                1.02z" />
                              </svg>
                              Spotify
                            </Button>
                          )}

                          {recognitionResult.result.apple_music?.url && (
                            <Button
                              onClick={() => openExternalLink(recognitionResult.result.apple_music!.url!)}
                              variant="outline"
                              className="bg-[#FA243C] hover:bg-[#ff3b4f] text-white border-0 flex items-center gap-2"
                            >
                              <Apple className="w-4 h-4" />
                              Apple Music
                            </Button>
                          )}

                          {recognitionResult.result.deezer?.url && (
                            <Button
                              onClick={() => openExternalLink(recognitionResult.result.deezer!.url!)}
                              variant="outline"
                              className="bg-[#EF5466] hover:bg-[#ff6b80] text-white border-0 flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Deezer
                            </Button>
                          )}

                          {recognitionResult.result.song_link && (
                            <Button
                              onClick={() => openExternalLink(recognitionResult.result.song_link!)}
                              variant="outline"
                              className="bg-muted border-border hover:bg-muted/80 flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              More Info
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Audio Preview */}
                      {audioUrl && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">Original Audio:</h3>
                          <audio controls className="w-full">
                            <source src={audioUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                        <h3 className="text-lg font-semibold text-foreground">
                          No song was recognized
                        </h3>
                        <p className="text-muted-foreground">
                          The audio might be too short, unclear, or not in our database.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "songs") && !isRecognitionMode && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Songs</h3>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : searchResults.songs.length > 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="p-0">
                      <div className="space-y-1">
                        {searchResults.songs.slice(0, activeFilter === "all" ? 5 : searchResults.songs.length).map((song, index) => (
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

            {(activeFilter === "all" || activeFilter === "artists") && searchResults.artists.length > 0 && !isRecognitionMode && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Artists</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {searchResults.artists.map((artist) => (
                    <Card 
                      key={artist.id} 
                      className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer group w-fit"
                      onClick={() => navigate(`/artist/${artist.id}`)}
                    >
                      <CardContent className="p-4 text-center min-w-[150px] max-w-[200px]">
                        <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
                          {artist.avatar ? (
                            <img 
                              src={artist.avatar} 
                              alt={artist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-semibold text-base mb-1 text-foreground">
                          {artist.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {artist.country || "Unknown"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {(activeFilter === "all" || activeFilter === "albums") && searchResults.albums.length > 0 && !isRecognitionMode && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Albums</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.albums.map((album) => (
                    <Card
                      key={album.id}
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
          {!isRecognitionMode && (
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
                      <p className="font-medium text-sm truncate text-foreground">{song.title}</p>
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