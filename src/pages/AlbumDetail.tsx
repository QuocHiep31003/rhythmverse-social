import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import ShareButton from "@/components/ShareButton";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Heart,
  MoreHorizontal,
  Clock,
  Calendar,
  Music,
} from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { useMusic } from "@/contexts/MusicContext";

const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [relatedAlbums, setRelatedAlbums] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);

  const { playSong, setQueue, currentSong, isPlaying } = useMusic();

  useEffect(() => {
    const fetchAlbum = async () => {
      if (!id) return;
      try {
        const res = await albumsApi.getById(id);
        if (!res) return;

        const normalized = {
          id: res.id,
          title: res.name ?? "Unknown Album",
          artist: res.artist?.name ?? "Unknown Artist",
          artistId: res.artist?.id ?? null,
          cover: res.coverUrl ?? "/placeholder-album.jpg",
          releaseDate: res.releaseDate ?? "",
          totalTracks: res.songs?.length ?? 0,
        };

        const songList = Array.isArray(res.songs)
          ? res.songs.map((s: any) => ({
              id: String(s.id),
              title: s.name,
              artist: s.artists?.[0]?.name ?? normalized.artist,
              album: normalized.title,
              duration: s.duration ?? 0,
              cover: normalized.cover,
              audioUrl: s.audioUrl ?? "",
            }))
          : [];

        setAlbum(normalized);
        setSongs(songList);
        setQueue(songList);

        // Load related albums cùng nghệ sĩ
        if (normalized.artistId) {
          try {
            const allAlbums = await albumsApi.getAll({ size: 100 });
            const otherAlbums = allAlbums.content
              .filter(
                (a: any) =>
                  a.artist?.id === normalized.artistId &&
                  a.id !== normalized.id
              )
              .slice(0, 6);
            setRelatedAlbums(otherAlbums);
          } catch (err) {
            console.error("Error fetching related albums:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching album:", error);
      }
    };
    fetchAlbum();
  }, [id]);

  const handlePlayAlbum = () => {
    if (songs.length > 0) playSong(songs[0]);
  };

  const handlePlaySong = (song: any) => {
    playSong(song);
  };

  const toggleLike = (songId: string) => {
    setLikedSongs((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      <div className="pt-6 pb-24 container mx-auto px-4">
        {/* ===== ALBUM HEADER ===== */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="w-full md:w-80 h-80 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow overflow-hidden">
            {album?.cover ? (
              <img
                src={album.cover}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-32 h-32 text-white" />
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">
                Album
              </Badge>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {album?.title ?? "Album"}
              </h1>
              <div className="flex items-center gap-2 text-lg mb-4">
                <a
                  href={album?.artistId ? `/artist/${album.artistId}` : "#"}
                  className="font-medium hover:text-primary transition-colors cursor-pointer"
                >
                  {album?.artist}
                </a>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {album?.releaseDate
                    ? new Date(album.releaseDate).getFullYear()
                    : "-"}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {album?.totalTracks} songs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="hero"
                size="lg"
                className="rounded-full px-8"
                onClick={handlePlayAlbum}
              >
                <Play className="w-5 h-5 mr-2" />
                Play Album
              </Button>
              <Button variant="outline" size="icon" className="rounded-full">
                <Heart className="w-5 h-5" />
              </Button>
              <ShareButton title={album?.title || "Album"} type="album" />
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ===== SONG LIST ===== */}
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardContent className="p-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 border-b border-border/20 text-sm text-muted-foreground">
              <div className="text-center">#</div>
              <div>Title</div>
              <div className="hidden sm:block text-center">
                <Calendar className="w-4 h-4 mx-auto" />
              </div>
              <div className="flex justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div className="w-8"></div>
            </div>

            {songs.length > 0 ? (
              songs.map((song, index) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 transition-colors cursor-pointer ${
                      isActive ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                    onClick={() => handlePlaySong(song)}
                  >
                    {/* --- Cột số thứ tự hoặc equalizer --- */}
                    <div className="flex items-center justify-center w-6">
                      {isActive ? (
                        <div className="flex items-end gap-[2px] h-4">
                          <div className="w-[2px] bg-primary animate-[equalizer_1s_ease-in-out_infinite]" />
                          <div className="w-[2px] bg-primary animate-[equalizer_1.3s_ease-in-out_infinite]" />
                          <div className="w-[2px] bg-primary animate-[equalizer_0.9s_ease-in-out_infinite]" />
                          <div className="w-[2px] bg-primary animate-[equalizer_1.2s_ease-in-out_infinite]" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* --- Tên bài hát --- */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p
                          className={`font-medium truncate ${
                            isActive ? "text-primary" : ""
                          }`}
                        >
                          {song.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    {/* --- Ngày phát hành --- */}
                    <div className="hidden sm:flex items-center justify-center text-sm text-muted-foreground">
                      {album?.releaseDate
                        ? new Date(album.releaseDate).toLocaleDateString()
                        : ""}
                    </div>

                    {/* --- Thời lượng --- */}
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      {song.duration || "-"}
                    </div>

                    {/* --- Like / Share --- */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            likedSongs.includes(song.id)
                              ? "fill-red-500 text-red-500"
                              : ""
                          }`}
                        />
                      </Button>
                      <ShareButton title={song.title} type="song" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No songs available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== RELATED ALBUMS ===== */}
        {relatedAlbums.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">
              More from {album?.artist}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedAlbums.map((relAlbum: any) => (
                <div
                  key={relAlbum.id}
                  onClick={() => navigate(`/album/${relAlbum.id}`)}
                  className="group cursor-pointer"
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/album/${relAlbum.id}`);
                    }
                  }}
                >
                  <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all overflow-hidden">
                    <div className="aspect-square relative overflow-hidden">
                      {relAlbum.coverUrl || relAlbum.cover ? (
                        <img
                          src={relAlbum.coverUrl || relAlbum.cover}
                          alt={relAlbum.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                          <Music className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium truncate">{relAlbum.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {relAlbum.releaseDate
                          ? new Date(relAlbum.releaseDate).getFullYear()
                          : ""}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AlbumDetail;
