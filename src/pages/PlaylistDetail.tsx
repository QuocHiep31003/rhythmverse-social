import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMusicContext } from "@/contexts/MusicContext";
import { mockPlaylists, mockSongs } from "@/data/mockData";
import { 
  Play, 
  Heart, 
  MoreHorizontal, 
  Users, 
  Clock, 
  Plus, 
  Search,
  ArrowLeft,
  Edit,
  UserPlus,
  Music
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong } = useMusicContext();
  const [isLiked, setIsLiked] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);

  // Get playlist from mock data
  const playlist = mockPlaylists.find(p => p.id === id) || mockPlaylists[0];

  const handlePlaySong = (song: any) => {
    playSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album || "Unknown Album",
      duration: song.duration,
      cover: song.cover,
      genre: song.genre,
      plays: song.plays,
      likes: song.likes
    });
  };

  const handlePlayAll = () => {
    if (playlist.songs && playlist.songs.length > 0) {
      handlePlaySong(playlist.songs[0]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-48 h-48 rounded-xl overflow-hidden shadow-lg bg-gradient-primary">
              {playlist.cover ? (
                <img 
                  src={playlist.cover} 
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-20 h-20 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <Badge variant="secondary" className="mb-2">
                  Playlist
                </Badge>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {playlist.title}
                </h1>
                <p className="text-muted-foreground mb-4">
                  {playlist.description}
                </p>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={playlist.owner.avatar} />
                  <AvatarFallback>{playlist.owner.name[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{playlist.owner.name}</span>
                <span>•</span>
                <span>{playlist.songCount || playlist.songs?.length || 0} bài hát</span>
                <span>•</span>
                <span>{playlist.likes.toLocaleString()} lượt thích</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="hero" 
            size="lg" 
            className="min-w-[120px]"
            onClick={handlePlayAll}
          >
            <Play className="w-5 h-5 mr-2" />
            Phát tất cả
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
          >
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          
          <ShareButton />
          
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Song List */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              {playlist.songs?.map((song, index) => (
                <div 
                  key={song.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 group cursor-pointer transition-colors"
                  onClick={() => handlePlaySong(song)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-5 text-center text-sm text-muted-foreground group-hover:hidden">
                      {index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 hidden group-hover:flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(song);
                      }}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                    
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      {song.cover ? (
                        <img 
                          src={song.cover} 
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                          <Music className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">
                        {song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newLiked = likedSongs.includes(song.id)
                          ? likedSongs.filter(id => id !== song.id)
                          : [...likedSongs, song.id];
                        setLikedSongs(newLiked);
                      }}
                    >
                      <Heart 
                        className={`w-4 h-4 ${
                          likedSongs.includes(song.id) 
                            ? 'fill-red-500 text-red-500' 
                            : ''
                        }`} 
                      />
                    </Button>
                    
                    <span className="text-xs w-12 text-right">
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Footer />
      </div>
    </div>
  );
};

export default PlaylistDetail;