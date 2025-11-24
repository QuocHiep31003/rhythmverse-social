import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSlug } from "@/utils/playlistUtils";
import Footer from "@/components/Footer";
import ChatBubble from "@/components/ChatBubble";
import ShareButton from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Heart, 
  Clock, 
  Music, 
  Plus,
  MoreHorizontal,
  Search,
  User,
  Shuffle
} from "lucide-react";

const Playlist = () => {
  const navigate = useNavigate();
  const [likedSongs, setLikedSongs] = useState<string[]>(["1", "3", "5"]);

  // Mock data for liked songs
  const likedSongsData = [
    { id: "1", title: "Midnight Dreams", artist: "Luna Eclipse", album: "Stellar Journey", duration: "3:45", dateAdded: "2024-01-15" },
    { id: "2", title: "Cosmic Dance", artist: "Solar Winds", album: "Galaxy Beats", duration: "4:12", dateAdded: "2024-01-14" },
    { id: "3", title: "Neon Lights", artist: "City Pulse", album: "Urban Nights", duration: "3:28", dateAdded: "2024-01-13" },
    { id: "4", title: "Ocean Waves", artist: "Deep Blue", album: "Tidal Sounds", duration: "4:55", dateAdded: "2024-01-12" },
    { id: "5", title: "Electric Storm", artist: "Thunder Bay", album: "Weather Patterns", duration: "3:33", dateAdded: "2024-01-11" },
  ];

  // Mock data for user playlists
  const userPlaylists = [
    { 
      id: "1", 
      name: "My Favorites 🎵", 
      description: "All my favorite tracks in one place", 
      songCount: 47, 
      duration: "3h 12m",
      cover: "",
      isPublic: true,
      lastUpdated: "2024-01-15"
    },
    { 
      id: "2", 
      name: "Workout Vibes 💪", 
      description: "High energy songs for gym sessions", 
      songCount: 32, 
      duration: "2h 8m",
      cover: "",
      isPublic: false,
      lastUpdated: "2024-01-14"
    },
    { 
      id: "3", 
      name: "Chill Evening 🌙", 
      description: "Relaxing tunes for quiet nights", 
      songCount: 28, 
      duration: "1h 52m",
      cover: "",
      isPublic: true,
      lastUpdated: "2024-01-13"
    },
    { 
      id: "4", 
      name: "Road Trip Mix 🚗", 
      description: "Perfect songs for long drives", 
      songCount: 55, 
      duration: "4h 23m",
      cover: "",
      isPublic: false,
      lastUpdated: "2024-01-10"
    },
    { 
      id: "5", 
      name: "Party Hits 🎉", 
      description: "Dance floor favorites", 
      songCount: 41, 
      duration: "2h 45m",
      cover: "",
      isPublic: true,
      lastUpdated: "2024-01-08"
    },
    { 
      id: "6", 
      name: "Focus Mode 🎯", 
      description: "Instrumental and ambient for concentration", 
      songCount: 23, 
      duration: "1h 38m",
      cover: "",
      isPublic: false,
      lastUpdated: "2024-01-05"
    }
  ];

  const toggleLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const playSong = (songId: string) => {
    console.log("Playing song:", songId);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      
      <div className="pt-6 pb-24 container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Your Library
          </h1>
          <p className="text-muted-foreground">Manage your music collection</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <Button variant="hero" className="gap-2" onClick={() => navigate('/create-playlist')}>
            <Plus className="w-4 h-4" />
            Create Playlist
          </Button>
          <Button variant="outline" className="gap-2">
            <Heart className="w-4 h-4" />
            Liked Songs ({likedSongsData.length})
          </Button>
          <Button variant="outline" className="gap-2">
            <Search className="w-4 h-4" />
            Search in Library
          </Button>
        </div>

        {/* Liked Songs Section */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Liked Songs</h2>
              <p className="text-muted-foreground">{likedSongsData.length} songs</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="hero" size="lg" className="gap-2">
                <Play className="w-5 h-5" />
                Play
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Shuffle className="w-5 h-5" />
                Shuffle
              </Button>
            </div>
          </div>

          {/* Liked Songs List */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="p-0">
              <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 p-4 border-b border-border/20 text-sm text-muted-foreground">
                <div className="text-center">#</div>
                <div>Title</div>
                <div>Album</div>
                <div>Date Added</div>
                <div className="flex justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="w-8"></div>
              </div>
              
              {likedSongsData.map((song, index) => (
                <div
                  key={song.id}
                  className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 p-4 hover:bg-white/5 group transition-colors cursor-pointer"
                  onClick={() => playSong(song.id)}
                >
                  <div className="flex items-center justify-center text-muted-foreground group-hover:hidden">
                    {index + 1}
                  </div>
                  <div className="hidden group-hover:flex items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-primary rounded flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground truncate">
                    {song.album}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    {new Date(song.dateAdded).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    {song.duration}
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <ShareButton title={song.title} type="song" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* User Playlists */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Made by You</h2>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/create-playlist')}>
              <Plus className="w-4 h-4" />
              New Playlist
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {userPlaylists.map((playlist) => (
              <Card 
                key={playlist.id} 
                className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
                onClick={() => navigate(`/playlist/${createSlug(playlist.name || playlist.title || 'playlist', playlist.id)}`)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square rounded-lg bg-gradient-primary mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 relative">
                    <Music className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                      <Button
                        variant="hero"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Play playlist:', playlist.id);
                        }}
                      >
                        <Play className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{playlist.name}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButton title={playlist.name} type="playlist" playlistId={Number(playlist.id)} url={`${window.location.origin}/playlist/${createSlug(playlist.name || playlist.title || 'playlist', playlist.id)}`} isPrivate={!playlist.isPublic} />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('More options for:', playlist.id);
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {playlist.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{playlist.songCount} songs</span>
                        <span>•</span>
                        <span>{playlist.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {playlist.isPublic ? (
                          <Badge variant="outline" className="text-xs">Public</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Private</Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(playlist.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Playlist;