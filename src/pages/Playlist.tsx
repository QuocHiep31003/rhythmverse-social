import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Play, 
  Music, 
  Users, 
  Lock, 
  Globe, 
  Heart,
  Share2,
  MoreVertical,
  Clock,
  Calendar
} from "lucide-react";

const Playlist = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [selectedTab, setSelectedTab] = useState<"created" | "liked" | "collaborative">("created");

  const createdPlaylists = [
    {
      id: 1,
      name: "My Chill Vibes",
      description: "Perfect for relaxing evenings",
      songCount: 24,
      duration: "1h 32m",
      isPrivate: false,
      isCollaborative: false,
      createdAt: "2024-01-10",
      plays: 156
    },
    {
      id: 2,
      name: "Workout Energy",
      description: "High-energy tracks for gym sessions",
      songCount: 45,
      duration: "2h 45m",
      isPrivate: true,
      isCollaborative: false,
      createdAt: "2024-01-08",
      plays: 89
    },
    {
      id: 3,
      name: "Road Trip Mix",
      description: "Epic songs for long drives",
      songCount: 67,
      duration: "4h 12m",
      isPrivate: false,
      isCollaborative: true,
      createdAt: "2024-01-05",
      plays: 234,
      collaborators: ["Alice", "Bob", "Charlie"]
    }
  ];

  const likedPlaylists = [
    {
      id: 4,
      name: "Electronic Dreamscape",
      description: "Curated by DJ ElectroFlow",
      songCount: 38,
      duration: "2h 18m",
      creator: "DJ ElectroFlow",
      likedAt: "2024-01-12"
    },
    {
      id: 5,
      name: "Indie Rock Collection",
      description: "Best indie rock hits from the 2020s",
      songCount: 52,
      duration: "3h 24m",
      creator: "IndieRockFan",
      likedAt: "2024-01-09"
    }
  ];

  const collaborativePlaylists = [
    {
      id: 6,
      name: "Office Party Hits",
      description: "Collaborative playlist for team events",
      songCount: 78,
      duration: "4h 56m",
      collaborators: ["John", "Sarah", "Mike", "Lisa", "+3 more"],
      lastUpdated: "2024-01-15"
    },
    {
      id: 7,
      name: "Friends' Favorites",
      description: "Everyone adds their current favorite song",
      songCount: 29,
      duration: "1h 47m",
      collaborators: ["Emma", "David", "Alex"],
      lastUpdated: "2024-01-14"
    }
  ];

  const handleCreatePlaylist = () => {
    // Mock playlist creation
    console.log("Creating playlist:", { name: newPlaylistName, description: newPlaylistDescription });
    setNewPlaylistName("");
    setNewPlaylistDescription("");
    setIsCreateDialogOpen(false);
  };

  const renderPlaylistCard = (playlist: any, type: string) => (
    <Card key={playlist.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-square bg-gradient-primary rounded-t-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <Music className="w-16 h-16 text-white/80" />
            <div className="absolute inset-0 bg-black/20 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button variant="hero" size="icon" className="h-12 w-12">
                <Play className="w-6 h-6" />
              </Button>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold truncate flex-1">{playlist.name}</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{playlist.description}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Music className="w-3 h-3" />
                {playlist.songCount} songs
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {playlist.duration}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {type === "created" && (
                <>
                  {playlist.isPrivate ? (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Globe className="w-3 h-3" />
                      Public
                    </Badge>
                  )}
                  {playlist.isCollaborative && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Users className="w-3 h-3" />
                      Collaborative
                    </Badge>
                  )}
                </>
              )}
              
              {type === "liked" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Heart className="w-3 h-3" />
                  Liked
                </Badge>
              )}
              
              {type === "collaborative" && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="w-3 h-3" />
                  {playlist.collaborators.length} collaborators
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              {type === "created" && (
                <span className="text-xs text-muted-foreground">
                  {playlist.plays} plays
                </span>
              )}
              
              {type === "liked" && (
                <span className="text-xs text-muted-foreground">
                  By {playlist.creator}
                </span>
              )}
              
              {type === "collaborative" && (
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(playlist.lastUpdated).toLocaleDateString()}
                </span>
              )}

              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Share2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Heart className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-dark pt-20 pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Your Playlists
            </h1>
            <p className="text-muted-foreground">
              Create, organize, and share your music collections
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2 self-start md:self-auto">
                <Plus className="w-4 h-4" />
                Create Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Playlist Name</label>
                  <Input
                    placeholder="My Awesome Playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    placeholder="Describe your playlist..."
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={handleCreatePlaylist}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/40 mb-6">
          <Button
            variant={selectedTab === "created" ? "default" : "ghost"}
            className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary"
            data-active={selectedTab === "created"}
            onClick={() => setSelectedTab("created")}
          >
            Created ({createdPlaylists.length})
          </Button>
          <Button
            variant={selectedTab === "liked" ? "default" : "ghost"}
            className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary"
            data-active={selectedTab === "liked"}
            onClick={() => setSelectedTab("liked")}
          >
            Liked ({likedPlaylists.length})
          </Button>
          <Button
            variant={selectedTab === "collaborative" ? "default" : "ghost"}
            className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary"
            data-active={selectedTab === "collaborative"}
            onClick={() => setSelectedTab("collaborative")}
          >
            Collaborative ({collaborativePlaylists.length})
          </Button>
        </div>

        {/* Playlist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {selectedTab === "created" && createdPlaylists.map(playlist => renderPlaylistCard(playlist, "created"))}
          {selectedTab === "liked" && likedPlaylists.map(playlist => renderPlaylistCard(playlist, "liked"))}
          {selectedTab === "collaborative" && collaborativePlaylists.map(playlist => renderPlaylistCard(playlist, "collaborative"))}
        </div>

        {/* Empty State */}
        {((selectedTab === "created" && createdPlaylists.length === 0) ||
          (selectedTab === "liked" && likedPlaylists.length === 0) ||
          (selectedTab === "collaborative" && collaborativePlaylists.length === 0)) && (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {selectedTab === "created" && "No playlists yet"}
              {selectedTab === "liked" && "No liked playlists"}
              {selectedTab === "collaborative" && "No collaborative playlists"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedTab === "created" && "Create your first playlist to get started"}
              {selectedTab === "liked" && "Explore and like playlists from other users"}
              {selectedTab === "collaborative" && "Join collaborative playlists with friends"}
            </p>
            {selectedTab === "created" && (
              <Button variant="hero" onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Playlist
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlist;