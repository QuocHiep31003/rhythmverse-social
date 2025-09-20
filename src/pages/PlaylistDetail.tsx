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

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock playlist data - would come from API based on id
  const playlist = {
    id: "1",
    title: "My Awesome Playlist",
    description: "A collection of my favorite songs for any mood",
    cover: "/placeholder.svg",
    owner: {
      name: "John Doe",
      avatar: "/placeholder.svg"
    },
    isPublic: true,
    likes: 1247,
    collaborators: [
      { id: "1", name: "Alice", avatar: "/placeholder.svg" },
      { id: "2", name: "Bob", avatar: "/placeholder.svg" }
    ],
    songs: [
      {
        id: "1",
        title: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        duration: "3:20",
        addedBy: "John Doe",
        addedAt: "2 days ago",
        cover: "/placeholder.svg"
      },
      {
        id: "2",
        title: "Watermelon Sugar",
        artist: "Harry Styles",
        album: "Fine Line",
        duration: "2:54",
        addedBy: "Alice",
        addedAt: "1 week ago",
        cover: "/placeholder.svg"
      },
      {
        id: "3",
        title: "Levitating",
        artist: "Dua Lipa",
        album: "Future Nostalgia",
        duration: "3:23",
        addedBy: "Bob",
        addedAt: "3 days ago",
        cover: "/placeholder.svg"
      }
    ]
  };

  const totalDuration = playlist.songs.reduce((acc, song) => {
    const [minutes, seconds] = song.duration.split(':').map(Number);
    return acc + minutes * 60 + seconds;
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
    toast({
      title: `Playing ${playlist.title}`,
      description: `${playlist.songs.length} songs`,
      duration: 3000,
    });
  };

  const playSong = (song: any) => {
    toast({
      title: `Now playing: ${song.title}`,
      description: `by ${song.artist}`,
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
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
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
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
                    <Input placeholder="Enter username or email..." />
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
                      onClick={() => playSong(song)}
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
                      {song.duration}
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