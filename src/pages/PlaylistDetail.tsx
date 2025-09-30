import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  UserPlus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { useMusic } from "@/contexts/MusicContext";
import { mockSongs } from "@/data/mockData";
import { Song } from "@/contexts/MusicContext";

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [isLiked, setIsLiked] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Convert mockSongs to playlist songs format
  const playlistSongs: (Song & { addedBy: string; addedAt: string })[] = mockSongs.slice(0, 5).map((song, idx) => ({
    ...song,
    addedBy: ["Alex Rivera", "Alice Chen", "Bob Martinez", "Sarah Kim", "Alex Rivera"][idx],
    addedAt: ["2 days ago", "1 week ago", "3 days ago", "4 days ago", "1 week ago"][idx],
  }));

  // Mock playlist data - would come from API based on id
  const playlist = {
    id: "1",
    title: "Summer Vibes Collection 🌞",
    description: "The perfect soundtrack for sunny days, beach trips, and good times with friends. Featuring the hottest summer hits and feel-good classics.",
    cover: mockSongs[0].cover,
    owner: {
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
    },
    isPublic: true,
    likes: 1247,
    collaborators: [
      { id: "1", name: "Alice Chen", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=100&h=100&fit=crop&crop=face" },
      { id: "2", name: "Bob Martinez", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
      { id: "3", name: "Sarah Kim", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" }
    ],
    songs: playlistSongs
  };

  const totalDuration = playlist.songs.reduce((acc, song) => {
    return acc + song.duration;
  }, 0);

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const togglePlaylistLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from your playlists" : "Added to your playlists",
      duration: 2000,
    });
  };

  const toggleSongLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const playAllSongs = () => {
    setQueue(playlist.songs);
    playSong(playlist.songs[0]);
    toast({
      title: `Playing ${playlist.title}`,
      description: `${playlist.songs.length} songs`,
      duration: 3000,
    });
  };

  const handlePlaySong = (song: Song) => {
    setQueue(playlist.songs);
    playSong(song);
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Playlist Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Cover Image */}
          <div className="flex-shrink-0">
            <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-lg overflow-hidden bg-gradient-to-br from-primary to-primary-glow shadow-2xl">
              <img
                src={playlist.cover}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Playlist Info */}
          <div className="flex-1 flex flex-col justify-end">
            <Badge variant="secondary" className="w-fit mb-2">
              {playlist.isPublic ? "Public Playlist" : "Private Playlist"}
            </Badge>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {playlist.title}
            </h1>
            
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
              {playlist.description}
            </p>

            {/* Owner and Stats */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-8 h-8">
                <AvatarImage src={playlist.owner.avatar} alt={playlist.owner.name} />
                <AvatarFallback>{playlist.owner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{playlist.owner.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{playlist.likes.toLocaleString()} likes</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{playlist.songs.length} songs</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{formatTotalDuration(totalDuration)}</span>
            </div>

            {/* Collaborators */}
            {playlist.collaborators.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Collaborators:</span>
                <div className="flex -space-x-2">
                  {playlist.collaborators.map((collaborator) => (
                    <Avatar key={collaborator.id} className="w-6 h-6 border-2 border-background">
                      <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                      <AvatarFallback className="text-xs">{collaborator.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={playAllSongs} className="bg-primary hover:bg-primary/90">
                <Play className="w-5 h-5 mr-2" />
                Play All
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={togglePlaylistLike}
                className={isLiked ? "text-red-500 border-red-500" : ""}
              >
                <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </Button>

              <ShareButton title={playlist.title} type="playlist" />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Song
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Song to Playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for songs..."
                        className="pl-10"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Search and add songs to this playlist
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Collaborate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Collaborators</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Search friends by username..." />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Suggested Friends</p>
                      <div className="space-y-2">
                        {["alice_music", "bob_beats", "charlie_vibes"].map((username) => (
                          <div key={username} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{username}</span>
                            </div>
                            <Button size="sm" variant="outline">
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Invite friends to collaborate on this playlist
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Songs List */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            {/* Search in playlist */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            {/* Songs */}
            <div className="space-y-2">
              {playlist.songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-background/30 transition-colors group"
                >
                  {/* Track Number / Play Button */}
                  <div className="w-8 text-center">
                    <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hidden group-hover:flex w-8 h-8"
                      onClick={() => handlePlaySong(song)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Cover */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={song.cover} alt={song.title} />
                    <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{song.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>

                  {/* Album */}
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">{song.album}</p>
                  </div>

                  {/* Added by */}
                  <div className="hidden lg:block w-32">
                    <p className="text-sm text-muted-foreground">Added by {song.addedBy}</p>
                    <p className="text-xs text-muted-foreground">{song.addedAt}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSongLike(song.id)}
                      className={`h-8 w-8 ${likedSongs.includes(song.id) ? 'text-red-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-current' : ''}`} />
                    </Button>

                    {/* Duration */}
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </span>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default PlaylistDetail;