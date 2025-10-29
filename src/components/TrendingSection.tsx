import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MusicCard from "./MusicCard";
import { TrendingUp, Clock, Heart, Headphones } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { getTrendingSongs, mockSongs } from "@/data/mockData";
import { handleImageError, DEFAULT_AVATAR_URL, formatPlayCount } from "@/lib/utils";
import { songsApi } from "@/services/api/songApi";
import { useState, useEffect } from "react";

const TrendingSection = () => {
  const { playSong, setQueue } = useMusic();
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const recentlyPlayed = mockSongs.slice(5, 9);

  // Fetch trending songs from API
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        const top10 = await songsApi.getTop10();
        
        if (top10 && top10.length > 0) {
          console.log('✅ Loaded top 10 trending:', top10.length, 'songs');
          
          // Format the data for the component
          const formattedSongs = top10.map(song => ({
            id: song.id,
            title: song.songName || song.title || 'Unknown',
            artist: song.artistNames?.join(", ") || song.artists?.map((a: any) => a.name).join(", ") || "Unknown",
            album: typeof song.album === 'string' ? song.album : song.album?.name || "Unknown",
            duration: typeof song.duration === 'string' ? parseInt(song.duration) : song.duration ,
            cover: song.cover || "",
            genre: song.genreNames?.[0] || song.genres?.[0]?.name || "Unknown",
            plays: formatPlayCount(song.playCount || 0),
            audio: song.audioUrl,
            audioUrl: song.audioUrl,
          }));
          
          setTrendingSongs(formattedSongs);
        } else {
          console.log('⚠️ No trending data, falling back to mock data...');
          const allSongs = getTrendingSongs();
          const sortedSongs = [...allSongs].sort((a, b) => {
            const playsA = typeof a.plays === 'string' ? parseInt(a.plays.replace(/[^0-9]/g, '')) || 0 : a.plays || 0;
            const playsB = typeof b.plays === 'string' ? parseInt(b.plays.replace(/[^0-9]/g, '')) || 0 : b.plays || 0;
            return playsB - playsA;
          });
          setTrendingSongs(sortedSongs);
        }
      } catch (err) {
        console.error("❌ Error loading trending songs:", err);
        // Fallback to mock data on error
        const allSongs = getTrendingSongs();
        const sortedSongs = [...allSongs].sort((a, b) => {
          const playsA = typeof a.plays === 'string' ? parseInt(a.plays.replace(/[^0-9]/g, '')) || 0 : a.plays || 0;
          const playsB = typeof b.plays === 'string' ? parseInt(b.plays.replace(/[^0-9]/g, '')) || 0 : b.plays || 0;
          return playsB - playsA;
        });
        setTrendingSongs(sortedSongs);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <section className="py-20 bg-gradient-to-br from-music-dark to-background">
      <div className="container px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trending Now */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Trending Now</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : trendingSongs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trending songs available
                  </div>
                ) : (
                  trendingSongs.map((song, index) => (
                    <div 
                      key={song.id} 
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => {
                        setQueue(trendingSongs);
                        playSong(song);
                      }}
                    >
                    <div className="text-2xl font-bold text-primary w-8">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {song.cover ? (
                        <img src={song.cover} alt={song.title} onError={handleImageError} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary-foreground">
                          {song.artist.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{song.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                   
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-muted-foreground">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recently Played */}
          <div>
            <Card className="bg-card/50 border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <span>Recently Played</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentlyPlayed.map((song, index) => (
                  <div 
                    key={song.id} 
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => {
                      setQueue(recentlyPlayed);
                      playSong(song);
                    }}
                  >
                    <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {song.cover ? (
                        <img src={song.cover} alt={song.title} onError={handleImageError} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-accent-foreground">
                          {song.artist.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-foreground truncate text-sm">{song.title}</h5>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-glass border-border/40 mt-6">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Your Music Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Songs Played</span>
                    <span className="font-semibold text-primary">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours Listened</span>
                    <span className="font-semibold text-neon-blue">86.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Favorite Genre</span>
                    <span className="font-semibold text-neon-pink">Electronic</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;