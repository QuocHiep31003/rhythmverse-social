import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Play, Heart, MoreHorizontal, Users, Plus, Search, ArrowLeft, Edit, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { useMusic, Song } from "@/contexts/MusicContext";
import { playlistsApi, PlaylistDTO, playlistCollabInvitesApi, playlistCollaboratorsApi } from "@/services/api/playlistApi";
import { buildJsonHeaders } from "@/services/api";
import { friendsApi } from "@/services/api/friendsApi";

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();

  const [isLiked, setIsLiked] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<{
    id: number;
    title: string;
    description: string;
    cover: string | null;
    ownerName?: string;
    isPublic: boolean;
    updatedAt?: string | null;
    songs: (Song & { addedBy?: string; addedAt?: string })[];
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: number; name: string; avatar?: string | null }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [collaborators, setCollaborators] = useState<Array<{ userId: number; name: string; email?: string; role?: string }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data: PlaylistDTO = await playlistsApi.getById(Number(id));
        const mappedSongs: (Song & { addedBy?: string; addedAt?: string })[] = Array.isArray(data.songs)
          ? data.songs.map((s: any) => ({
              id: String(s.id),
              title: s.name,
              artist: Array.isArray(s.artists) && s.artists.length ? (s.artists.map((a: any) => a.name).join(', ')) : 'Unknown',
              album: s.album?.name || '',
              cover: s.urlImageAlbum || '',
              audioUrl: s.audioUrl || '',
              duration: 0,
            }))
          : [];
        setPlaylist({
          id: data.id,
          title: data.name,
          description: data.description || '',
          cover: data.coverUrl || (data as any).urlImagePlaylist || null,
          ownerName: (data as any)?.owner?.name,
          isPublic: (data.visibility || 'PUBLIC') === 'PUBLIC',
          updatedAt: (data as any)?.dateUpdate || null,
          songs: mappedSongs,
        });
      } catch (e) {
        toast({ title: 'Failed to load playlist', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadCollabs = async () => {
      try {
        if (!id) return;
        const list = await playlistCollaboratorsApi.list(Number(id));
        setCollaborators(Array.isArray(list) ? list : []);
      } catch {
        setCollaborators([]);
      }
    };
    loadCollabs();
  }, [id, collabOpen]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const me = rawUserId ? Number(rawUserId) : undefined;
        if (!me) { setFriends([]); return; }
        const list = await friendsApi.getFriends(me);
        const mapped = Array.isArray(list)
          ? list.map((f: any) => ({ id: f.id ?? f.userId ?? f.friendId, name: f.name ?? f.username ?? f.email ?? `User ${f.id}`, avatar: f.avatar || null }))
          : [];
        setFriends(mapped.filter((x: any) => typeof x.id === 'number'));
      } catch { setFriends([]); }
      finally { setLoadingFriends(false); }
    };
    if (collabOpen) fetchFriends();
  }, [collabOpen]);

  useEffect(() => {
    const run = async () => {
      const q = addSearch.trim();
      if (!q) { setAddResults([]); return; }
      try {
        const res = await fetch(`http://localhost:8080/api/songs?search=${encodeURIComponent(q)}&size=10`, { headers: buildJsonHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setAddResults(data.content || []);
      } catch { setAddResults([]); }
    };
    run();
  }, [addSearch]);

  const addSongToPlaylist = async (songId: number) => {
    if (!playlist) return;
    try {
      setAdding(true);
      const current = await playlistsApi.getById(playlist.id);
      const nextIds = Array.from(new Set([...(current.songIds || []), songId]));
      await playlistsApi.update(playlist.id, {
        name: current.name,
        description: current.description || "",
        coverUrl: current.coverUrl || null,
        visibility: current.visibility || "PUBLIC",
        songLimit: current.songLimit,
        dateUpdate: current.dateUpdate,
        songIds: nextIds,
      });
      toast({ title: 'Added', description: 'Song added to playlist' });
      // refresh
      const updated = await playlistsApi.getById(playlist.id);
      const mappedSongs: (Song & { addedBy?: string; addedAt?: string })[] = Array.isArray(updated.songs)
        ? updated.songs.map((s: any) => ({
            id: String(s.id),
            title: s.name,
            artist: Array.isArray(s.artists) && s.artists.length ? (s.artists.map((a: any) => a.name).join(', ')) : 'Unknown',
            album: s.album?.name || '',
            cover: s.urlImageAlbum || '',
            audioUrl: s.audioUrl || '',
            duration: 0,
          }))
        : [];
      setPlaylist((prev) => prev ? { ...prev, songs: mappedSongs } : prev);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add song', variant: 'destructive' });
    } finally { setAdding(false); }
  };

  const toggleSelectFriend = (fid: number) => setSelectedFriendIds((prev) => prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]);
  const sendInvites = async () => {
    if (!playlist) return;
    try {
      setSendingInvites(true);
      for (const fid of selectedFriendIds) {
        await playlistCollabInvitesApi.send(playlist.id, fid, inviteRole);
      }
      toast({ title: 'Invites sent', description: `${selectedFriendIds.length} friends invited` });
      setCollabOpen(false);
      setSelectedFriendIds([]);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to send invites', variant: 'destructive' });
    } finally { setSendingInvites(false); }
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const totalDuration = useMemo(() => {
    if (!playlist) return 0;
    return playlist.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
  }, [playlist]);

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
    if (!playlist || !playlist.songs.length) return;
    setQueue(playlist.songs);
    playSong(playlist.songs[0]);
    toast({
      title: `Playing ${playlist?.title}`,
      description: `${playlist?.songs.length} songs`,
      duration: 3000,
    });
  };

  const handlePlaySong = (song: Song) => {
    if (!playlist) return;
    setQueue(playlist.songs);
    playSong(song);
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-lg overflow-hidden bg-gradient-to-br from-primary to-primary-glow shadow-2xl">
              {playlist?.cover ? (
                <img src={playlist.cover} alt={playlist?.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Users className="w-3 h-3" />
                {playlist?.isPublic ? "Public Playlist" : "Private Playlist"}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{playlist?.title || 'Playlist'}</h1>
            <p className="text-sm text-muted-foreground">{playlist?.description}</p>

            <div className="flex items-center gap-4 mb-6 mt-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={""} alt={playlist?.ownerName || "Owner"} />
                <AvatarFallback>{(playlist?.ownerName || "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{playlist?.ownerName || 'Unknown'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{playlist?.songs.length || 0} songs</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{formatTotalDuration(totalDuration)}</span>
              {playlist?.updatedAt && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Updated {new Date(playlist.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>

            {collaborators.length > 0 && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Collaborators:</span>
                {collaborators.map((c) => (
                  <span key={c.userId} className="text-sm bg-muted/40 px-2 py-0.5 rounded">
                    {c.name || c.email} {c.role ? `(${c.role})` : ''}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button size="lg" onClick={playAllSongs} className="bg-primary hover:bg-primary/90" disabled={!playlist || playlist.songs.length === 0}>
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

              {playlist && (
                <ShareButton title={playlist.title} type="playlist" playlistId={Number(playlist.id)} />
              )}

              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Song
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-custom">
                  <DialogHeader>
                    <DialogTitle>Add Song to Playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search for songs..." className="pl-10" value={addSearch} onChange={(e) => setAddSearch(e.target.value)} />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-custom">
                      {addResults.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Type to search songs</p>
                      ) : (
                        addResults.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{Array.isArray(s.artists) ? s.artists.map((a: any) => a.name).join(', ') : ''}</p>
                            </div>
                            <Button size="sm" onClick={() => addSongToPlaylist(Number(s.id))} disabled={adding}>Add</Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
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
                  <div className="space-y-4 max-h-72 overflow-y-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Role:</span>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="bg-background/50 border border-border rounded px-2 py-1 text-sm">
                        <option value="VIEWER">VIEWER</option>
                        <option value="EDITOR">EDITOR</option>
                      </select>
                    </div>
                    {loadingFriends ? (
                      <p className="text-sm text-muted-foreground">Loading friends...</p>
                    ) : friends.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No friends found.</p>
                    ) : (
                      friends.map((f) => (
                        <label key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-background/40">
                          <input type="checkbox" checked={selectedFriendIds.includes(f.id)} onChange={() => toggleSelectFriend(f.id)} />
                          <div className="flex items-center gap-2">
                            {f.avatar ? <img src={f.avatar} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-muted" />}
                            <span>{f.name}</span>
                          </div>
                        </label>
                      ))
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCollabOpen(false)} disabled={sendingInvites}>Cancel</Button>
                      <Button onClick={sendInvites} disabled={sendingInvites || selectedFriendIds.length === 0}>{sendingInvites ? 'Sending...' : 'Send invites'}</Button>
                    </div>
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

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              {(playlist?.songs || []).map((song, index) => (
                <div key={song.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-background/30 transition-colors group">
                  <div className="w-8 text-center">
                    <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
                    <Button size="icon" variant="ghost" className="hidden group-hover:flex w-8 h-8" onClick={() => handlePlaySong(song)}>
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>

                  <Avatar className="w-12 h-12">
                    <AvatarImage src={song.cover} alt={song.title} />
                    <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{song.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>

                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">{song.album}</p>
                  </div>

                  <div className="hidden lg:block w-32">
                    {/* Reserved for addedBy/addedAt if backend provides */}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSongLike(song.id)}
                      className={`h-8 w-8 ${likedSongs.includes(song.id) ? 'text-red-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-current' : ''}`} />
                    </Button>

                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                    </span>

                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
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
