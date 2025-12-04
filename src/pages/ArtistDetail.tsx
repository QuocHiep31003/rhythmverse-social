import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import ShareButton from "@/components/ShareButton";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Heart, 
  MoreHorizontal,
  Users,
  MapPin,
  Calendar,
  Music,
  User
} from "lucide-react";
import { artistsApi, songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { createSlug } from "@/utils/playlistUtils";



interface Artist {
  id: number;
  name: string;
  country?: string;
  debutYear?: number;
  bio?: string;
  avatar?: string;
  description?: string;
  verified?: boolean;
}

type PerformerParticipation = 'PERFORMER_MAIN' | 'PERFORMER_FEAT' | 'BOTH';

interface Song {
  id: string | number;
  name?: string;
  title?: string;
  duration?: string;
  releaseYear?: number;
  audioUrl?: string;
  urlImageAlbum?: string;
  playCount?: number;
  contributorRole?: PerformerParticipation;
}

interface Album {
  id: string | number;
  name?: string;
  title?: string;
  year?: number;
  releaseYear?: number;
  releaseDate?: string;
  type?: string;
  coverUrl?: string;
}

interface RelatedArtist {
  id: number;
  name: string;
  avatar?: string;
  country?: string;
  debutYear?: number;
}

const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong: playSongFromContext, setQueue } = useMusic();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [relatedArtists, setRelatedArtists] = useState<RelatedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  const handleArtistClick = (artistId: number) => {
    navigate(`/artist/${artistId}`);
  };

  const handleAlbumClick = (albumId: number, albumName?: string) => {
    navigate(`/album/${createSlug(albumName || 'album', albumId)}`);
  };

  const handlePlayAlbum = (e: React.MouseEvent, albumId: number) => {
    e.stopPropagation(); // Prevent navigation when clicking play button
    
    try {
      // For now, just play all songs from the artist
      // TODO: Filter by album when backend provides album info in songs
      if (songs && songs.length > 0) {
        // Map songs to format expected by player
        const formattedSongs = songs.map((song) => ({
          ...mapToPlayerSong({
            ...song, // Pass toàn bộ song object để không bị mất field albumCoverImg
            artist: artist?.name,
            album: albums.find(a => a.id === albumId)?.name,
          }),
        }));
        
        setQueue(formattedSongs);
        if (formattedSongs[0]) {
          playSongFromContext(formattedSongs[0]);
        }
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const fetchArtistPerformerSongs = async (artistId: number, fallbackSongs: Song[] = []) => {
    try {
      const [mainSongs, featSongs] = await Promise.all([
        songsApi.getByArtist(artistId, { role: 'PERFORMER_MAIN' }),
        songsApi.getByArtist(artistId, { role: 'PERFORMER_FEAT' }),
      ]);

      const mergedSongs = new Map<string | number, Song>();

      const mergeSongs = (list: Song[] = [], role: PerformerParticipation = 'PERFORMER_MAIN') => {
        list.forEach((song) => {
          if (!song?.id) return;
          const existing = mergedSongs.get(song.id);
          if (existing) {
            if (existing.contributorRole && existing.contributorRole !== role) {
              existing.contributorRole = 'BOTH';
            }
            return;
          }
          mergedSongs.set(song.id, {
            ...song,
            contributorRole: role,
          });
        });
      };

      mergeSongs(mainSongs, 'PERFORMER_MAIN');
      mergeSongs(featSongs, 'PERFORMER_FEAT');

      const sortedSongs = Array.from(mergedSongs.values()).sort((a, b) => {
        const playCountA = Number(a.playCount ?? 0);
        const playCountB = Number(b.playCount ?? 0);
        return playCountB - playCountA;
      });

      setSongs(sortedSongs);
    } catch (error) {
      console.error("Error fetching artist performer songs:", error);
      setSongs(fallbackSongs);
    }
  };

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const artistId = parseInt(id);
        if (Number.isNaN(artistId)) {
          throw new Error("Invalid artist id");
        }
        
        // Fetch artist data with details (songs and albums)
        const artistDetailData = await artistsApi.getByIdWithDetails(artistId);
        if (artistDetailData) {
          setArtist(artistDetailData);
          setAlbums(artistDetailData.albums || []);
        }

        await fetchArtistPerformerSongs(artistId, artistDetailData?.songs || []);

        // Fetch random artists for "Fans also like" section
        try {
          const allArtists = await artistsApi.getAll({ page: 0, size: 15 });
          if (allArtists.content && allArtists.content.length > 0) {
            // Filter out current artist and take first 6
            const filteredArtists = allArtists.content
              .filter(a => a.id !== artistId)
              .slice(0, 6);
            setRelatedArtists(filteredArtists);
          }
        } catch (error) {
          console.error("Error fetching random artists:", error);
        }
      } catch (error) {
        console.error("Error fetching artist data:", error);
        // Set fallback data
        setArtist({
          id: parseInt(id),
          name: "Unknown Artist",
          bio: "Artist information not available",
          country: "Unknown",
          debutYear: new Date().getFullYear(),
          verified: false
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [id]);

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const toggleLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const handlePlaySong = async (song: Song) => {
    console.log("Playing song:", song.id);
    
    // Map songs to format expected by player
    const formattedSongs = songs.map((s) => ({
      ...mapToPlayerSong({
        ...s, // Pass toàn bộ song object để không bị mất field albumCoverImg
        artist: artist?.name,
      }),
    }));
    
    setQueue(formattedSongs);
    const currentSong = formattedSongs.find(s => s.id === String(song.id));
    if (currentSong) {
      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
      await playSongWithStreamUrl(currentSong, playSongFromContext);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading artist information...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Artist not found</h1>
          <p className="text-muted-foreground">The artist you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      
      <div className="pt-6 pb-24 container mx-auto px-4">
        {/* Artist Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="w-full md:w-80 h-80 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow overflow-hidden">
            {artist.avatar ? (
              <img 
                src={artist.avatar} 
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-32 h-32 text-white" />
            )}
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Artist</Badge>
                {artist.verified && (
                  <Badge className="bg-blue-500 hover:bg-blue-600">Verified</Badge>
                )}
              </div>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {artist.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{artist.country || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Debut: {artist.debutYear || "Unknown"}</span>
                </div>
              </div>
              <p className="text-muted-foreground max-w-2xl">{artist.bio || artist.description || "No biography available."}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant={isFollowing ? "outline" : "secondary"} 
                size="lg" 
                className="rounded-full px-8"
                onClick={toggleFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <ShareButton title={artist.name} type="song" />
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Popular Songs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular Songs</h2>
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="p-0">
              {songs.length > 0 ? (
                songs.slice(0, 10).map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-4 p-4 hover:bg-white/5 group transition-colors cursor-pointer"
                    onClick={() => handlePlaySong(song)}
                  >
                    <div className="flex items-center justify-center w-8 text-muted-foreground group-hover:hidden">
                      {index + 1}
                    </div>
                    <div className="hidden group-hover:flex items-center justify-center w-8">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{song.name || song.songName || "Unknown Song"}</p>
                        {song.contributorRole && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-white/20">
                            {song.contributorRole === 'BOTH'
                              ? 'Main & Feat'
                              : song.contributorRole === 'PERFORMER_MAIN'
                                ? 'Main'
                                : 'Feat'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{song.releaseYear || "Unknown year"}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {song.duration || "Unknown"}
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(String(song.id));
                        }}
                      >
                        <Heart className={`w-4 h-4 ${likedSongs.includes(String(song.id)) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <ShareButton title={song.name || song.songName || "Unknown Song"} type="song" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No songs available for this artist.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Albums */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Albums and EPs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {albums.length > 0 ? (
              albums.map((album) => (
                <Card 
                  key={album.id} 
                  className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
                  onClick={() => handleAlbumClick(album.id as number, album.name || album.title)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg bg-gradient-accent mb-4 flex items-center justify-center relative overflow-hidden">
                      {album.coverUrl ? (
                        <img 
                          src={album.coverUrl} 
                          alt={album.name || album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-12 h-12 text-white" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                        <Button
                          variant="hero"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={(e) => handlePlayAlbum(e, album.id as number)}
                        >
                          <Play className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1 truncate">{album.name || album.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{album.releaseYear || album.year || "Unknown"}</span>
                      <span>•</span>
                      <span>{album.type || "Album"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-8">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No albums available for this artist.</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Artists */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Fans also like</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {relatedArtists.length > 0 ? (
              relatedArtists.map((relatedArtist) => (
                <Card 
                  key={relatedArtist.id} 
                  className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10 w-fit"
                  onClick={() => handleArtistClick(relatedArtist.id)}
                >
                  <CardContent className="p-4 text-center min-w-[150px] max-w-[200px]">
                    <div className="w-16 h-16 bg-gradient-secondary rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
                      {relatedArtist.avatar ? (
                        <img 
                          src={relatedArtist.avatar} 
                          alt={relatedArtist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <h3 className="font-semibold text-base mb-1 truncate">{relatedArtist.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {relatedArtist.country || "Unknown"}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="w-full text-center text-muted-foreground py-8">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Loading related artists...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;