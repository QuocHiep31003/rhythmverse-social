import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  Download, 
  Plus,
  Music,
  Clock,
  Calendar,
  Users,
  MessageCircle,
  ArrowLeft,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Flag
} from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  releaseDate: string;
  genre: string;
  plays: number;
  likes: number;
  description: string;
  lyrics: string;
}

interface Comment {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  likes: number;
}

const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Mock song data - in real app, this would be fetched based on the ID
  const song: Song = {
    id: id || "1",
    title: "Cosmic Dreams",
    artist: "StarGazer",
    album: "Galaxy Sounds",
    duration: "4:32",
    releaseDate: "2024-01-15",
    genre: "Electronic",
    plays: 125670,
    likes: 8432,
    description: "An ethereal journey through space and time, blending ambient electronic sounds with cosmic themes. This track features layered synthesizers, atmospheric pads, and a driving beat that captures the wonder of exploring the universe.",
    lyrics: `[Verse 1]
Floating through the endless night
Stars are calling out my name
In this cosmic symphony
Nothing ever stays the same

[Chorus]
We're dreaming cosmic dreams tonight
Racing through the speed of light
In this universe so wide
Let the starlight be our guide

[Verse 2]
Galaxies are spinning round
Music echoes through the void
Every planet has a sound
Every silence is a choice

[Chorus]
We're dreaming cosmic dreams tonight
Racing through the speed of light
In this universe so wide
Let the starlight be our guide

[Bridge]
When the morning breaks the spell
And we're back to Earth again
We'll remember what we felt
In this cosmic wonderland

[Outro]
Cosmic dreams will never fade
In our hearts they'll always stay
Until we meet again someday
In the stars so far away`
  };

  const relatedSongs = [
    { id: "2", title: "Stellar Journey", artist: "StarGazer", duration: "3:45" },
    { id: "3", title: "Galaxy Runner", artist: "StarGazer", duration: "4:12" },
    { id: "4", title: "Nebula Nights", artist: "CosmicBeats", duration: "5:23" },
    { id: "5", title: "Space Odyssey", artist: "VoidSounds", duration: "3:58" }
  ];

  const comments: Comment[] = [
    {
      id: "1",
      user: "MusicLover42",
      content: "This track is absolutely amazing! The atmospheric sounds really capture the essence of space exploration. Can't stop listening to it!",
      timestamp: "2 hours ago",
      likes: 24
    },
    {
      id: "2",
      user: "ElectroFan88",
      content: "StarGazer never disappoints. The production quality on this one is next level 🚀",
      timestamp: "5 hours ago",
      likes: 12
    },
    {
      id: "3",
      user: "AstroVibes",
      content: "Perfect for late night coding sessions. The cosmic vibes are unreal!",
      timestamp: "1 day ago",
      likes: 8
    },
    {
      id: "4",
      user: "SoundExplorer",
      content: "Added this to all my playlists. When is the full album coming out?",
      timestamp: "2 days ago",
      likes: 15
    }
  ];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // Show toast notification
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Add comment logic
      setNewComment("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark pt-20 pb-24">
      {/* Background with blur effect */}
      <div className="absolute inset-0 pt-20">
        <div className="w-full h-96 bg-gradient-primary opacity-20 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Song Header */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Album Art */}
                  <div className="aspect-square lg:aspect-video bg-gradient-primary flex items-center justify-center">
                    <Music className="w-32 h-32 text-white/80" />
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="hero"
                        size="icon"
                        className="h-20 w-20"
                        onClick={handlePlayPause}
                      >
                        {isPlaying ? (
                          <Pause className="w-10 h-10" />
                        ) : (
                          <Play className="w-10 h-10" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Song Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                          {song.title}
                        </h1>
                        <p className="text-xl text-white/90 mb-2">{song.artist}</p>
                        <div className="flex items-center gap-4 text-white/70 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {song.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(song.releaseDate).toLocaleDateString()}
                          </span>
                          <Badge variant="secondary">{song.genre}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    variant="hero"
                    size="lg"
                    className="gap-2"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>

                  <Button
                    variant={isLiked ? "default" : "outline"}
                    className="gap-2"
                    onClick={handleLike}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                    Like ({song.likes.toLocaleString()})
                  </Button>

                  <Button variant="outline" className="gap-2" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>

                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add to Playlist
                  </Button>

                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>

                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {song.plays.toLocaleString()} plays
                  </span>
                  <span>Album: {song.album}</span>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-3">About this track</h2>
                <p className="text-muted-foreground leading-relaxed">{song.description}</p>
              </CardContent>
            </Card>

            {/* Lyrics */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Lyrics</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLyrics(!showLyrics)}
                  >
                    {showLyrics ? "Hide" : "Show"} Lyrics
                  </Button>
                </div>
                
                {showLyrics && (
                  <div className="bg-muted/10 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                      {song.lyrics}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Comments ({comments.length})
                </h2>

                {/* Add Comment */}
                <div className="mb-6">
                  <Textarea
                    placeholder="Share your thoughts about this track..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-3"
                    rows={3}
                  />
                  <Button variant="hero" onClick={handleAddComment} disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-4 rounded-lg bg-muted/10">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-secondary text-white text-xs">
                            {comment.user.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.user}</span>
                            <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                          </div>
                          <p className="text-sm mb-2">{comment.content}</p>
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" className="h-auto p-1 gap-1 text-xs">
                              <ThumbsUp className="w-3 h-3" />
                              {comment.likes}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-auto p-1 gap-1 text-xs">
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-auto p-1 gap-1 text-xs">
                              Reply
                            </Button>
                            <Button variant="ghost" size="sm" className="h-auto p-1 gap-1 text-xs">
                              <Flag className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Songs */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">More from {song.artist}</h3>
                <div className="space-y-3">
                  {relatedSongs.map((relatedSong) => (
                    <div
                      key={relatedSong.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 cursor-pointer transition-colors"
                      onClick={() => navigate(`/song/${relatedSong.id}`)}
                    >
                      <div className="w-10 h-10 bg-gradient-secondary rounded flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{relatedSong.title}</p>
                        <p className="text-xs text-muted-foreground">{relatedSong.duration}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Artist Info */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Artist</h3>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {song.artist.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{song.artist}</h4>
                    <p className="text-sm text-muted-foreground">Electronic Music Producer</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center mb-4">
                  <div>
                    <div className="text-lg font-bold">1.2M</div>
                    <div className="text-xs text-muted-foreground">Monthly Listeners</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">45</div>
                    <div className="text-xs text-muted-foreground">Tracks</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Follow Artist
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;