import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Play, 
  Music, 
  Heart,
  Share2,
  Clock,
  Search,
  Filter,
  Users,
  Lock,
  Globe
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
      songCount: 24,
      duration: "1h 32m",
      isPrivate: false,
      isCollaborative: false,
      plays: 156
    },
    {
      id: 2,
      name: "Workout Energy",
      songCount: 45,
      duration: "2h 45m",
      isPrivate: true,
      isCollaborative: false,
      plays: 89
    },
    {
      id: 3,
      name: "Road Trip Mix",
      songCount: 67,
      duration: "4h 12m",
      isPrivate: false,
      isCollaborative: true,
      plays: 234,
      collaborators: ["Alice", "Bob", "Charlie"]
    }
  ];

  const likedPlaylists = [
    {
      id: 4,
      name: "Electronic Dreamscape",
      songCount: 38,
      duration: "2h 18m",
      creator: "DJ ElectroFlow"
    },
    {
      id: 5,
      name: "Indie Rock Collection",
      songCount: 52,
      duration: "3h 24m",
      creator: "IndieRockFan"
    }
  ];

  const collaborativePlaylists = [
    {
      id: 6,
      name: "Office Party Hits",
      songCount: 78,
      duration: "4h 56m",
      collaborators: ["John", "Sarah", "Mike", "Lisa", "+3 more"]
    },
    {
      id: 7,
      name: "Friends' Favorites",
      songCount: 29,
      duration: "1h 47m",
      collaborators: ["Emma", "David", "Alex"]
    }
  ];

  const handleCreatePlaylist = () => {
    console.log("Creating playlist:", { name: newPlaylistName, description: newPlaylistDescription });
    setNewPlaylistName("");
    setNewPlaylistDescription("");
    setIsCreateDialogOpen(false);
  };

  const renderPlaylistCard = (playlist: any, type: string) => (
    <Card key={playlist.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Music className="w-6 h-6 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-sm">{playlist.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{playlist.songCount} songs</span>
              <span>•</span>
              <span>{playlist.duration}</span>
            </div>
            
            {/* Badges */}
            <div className="flex gap-1 mt-2">
              {type === "created" && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {playlist.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  </Badge>
                  {playlist.isCollaborative && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3" />
                    </Badge>
                  )}
                </>
              )}
              
              {type === "liked" && (
                <Badge variant="secondary" className="text-xs">
                  <Heart className="w-3 h-3" />
                </Badge>
              )}
              
              {type === "collaborative" && (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      
      <div className="pt-20 pb-24">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Your Playlists
              </h1>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-48 bg-gradient-glass backdrop-blur-sm border-white/20"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="My Awesome Playlist"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
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
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/20 rounded-lg p-1">
            <Button
              variant={selectedTab === "created" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedTab("created")}
            >
              Created ({createdPlaylists.length})
            </Button>
            <Button
              variant={selectedTab === "liked" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedTab("liked")}
            >
              Liked ({likedPlaylists.length})
            </Button>
            <Button
              variant={selectedTab === "collaborative" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedTab("collaborative")}
            >
              Collaborative ({collaborativePlaylists.length})
            </Button>
          </div>

          {/* Playlist List */}
          <div className="space-y-2">
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
      
      <Footer />
    </div>
  );
};

export default Playlist;