import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play, Disc, MoreHorizontal, ListPlus, Heart } from "lucide-react";
import { artistsApi, albumsApi } from "@/services/api";
import { getAuthToken } from "@/services/api/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";

interface Album {
  id: number | string;
  name?: string;
  title?: string;
  artist?: { id: number | string; name?: string } | string;
  coverUrl?: string;
  cover?: string;
  releaseDate?: string;
  songs?: Array<{ id: number | string; [key: string]: unknown }>;
  tracks?: number;
  songCount?: number;
  releaseYear?: number;
}

const ARRahmanFansSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchARRahmanAlbums = useCallback(async () => {
    try {
      setLoading(true);

      // Tìm artist "A.R. Rahman" hoặc "AR Rahman"
      const searchQueries = ["A.R. Rahman", "AR Rahman", "Rahman"];
      let rahmanArtist = null;

      for (const query of searchQueries) {
        const searchResult = await artistsApi.search(query, { page: 0, size: 10 });
        const found = searchResult.content.find(
          (artist) => 
            artist.name.toLowerCase().includes("rahman") ||
            artist.name.toLowerCase() === query.toLowerCase()
        );
        if (found) {
          rahmanArtist = found;
          break;
        }
      }

      if (!rahmanArtist) {
        console.log("⚠️ A.R. Rahman artist not found");
        setAllAlbums([]);
        setLoading(false);
        return;
      }

      // Lấy albums của A.R. Rahman
      const albumsResponse = await artistsApi.getAlbums(rahmanArtist.id, {
        page: 0,
        size: 50,
        sort: "releaseDate,desc", // Sort theo ngày phát hành để lấy albums mới nhất
      });

      let albums = albumsResponse.content || [];

      // Fallback: nếu không có albums từ artist API, thử dùng albumsApi với artistId filter
      if (!albums || albums.length === 0) {
        console.log("⚠️ No albums from artist API, trying albumsApi.getAll with artistId...");
        const albumsResponse2 = await albumsApi.getAll({
          page: 0,
          size: 50,
          sort: "releaseDate,desc",
          artistId: rahmanArtist.id,
        });
        albums = albumsResponse2?.content || [];
      }

      if (!albums || albums.length === 0) {
        console.log("⚠️ No albums found for A.R. Rahman");
        setAllAlbums([]);
        setLoading(false);
        return;
      }

      setAllAlbums(albums);
    } catch (error) {
      console.error("Error fetching A.R. Rahman albums:", error);
      setAllAlbums([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Random 9 albums to display
  const displayedAlbums = useMemo(() => {
    if (allAlbums.length <= 9) return allAlbums;
    const shuffled = [...allAlbums].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 9);
  }, [allAlbums]);

  useEffect(() => {
    fetchARRahmanAlbums();
  }, [fetchARRahmanAlbums]);

  const handlePlayAlbum = async (album: Album) => {
    try {
      // Lấy songs của album
      const albumDetail = await albumsApi.getById(album.id);
      if (albumDetail?.songs && albumDetail.songs.length > 0) {
        const songs = albumDetail.songs.map((s: { id: number | string; [key: string]: unknown }) => mapToPlayerSong(s));
        await setQueue(songs);
        if (songs.length > 0) {
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(songs[0], playSong);
        }
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const handlePlayAll = async () => {
    if (allAlbums.length === 0) return;
    
    // Lấy tất cả songs từ tất cả albums
    const allSongs: any[] = [];
    for (const album of allAlbums) {
      try {
        const albumDetail = await albumsApi.getById(album.id);
        if (albumDetail?.songs && albumDetail.songs.length > 0) {
          const songs = albumDetail.songs.map((s: { id: number | string; [key: string]: unknown }) => mapToPlayerSong(s));
          allSongs.push(...songs);
        }
      } catch (error) {
        console.error(`Error fetching songs for album ${album.id}:`, error);
      }
    }

    if (allSongs.length > 0) {
      await setQueue(allSongs);
      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
      await playSongWithStreamUrl(allSongs[0], playSong);
    }
  };

  const getArtistName = (artist: { id?: number | string; name?: string } | string | undefined): string => {
    if (typeof artist === 'string') return artist;
    if (artist?.name) return artist.name;
    return "A.R. Rahman";
  };

  const getCoverImage = (album: Album): string | undefined => {
    return album.coverUrl || album.cover;
  };

  const getAlbumName = (album: Album): string => {
    return album.name || album.title || "Unknown Album";
  };

  if (allAlbums.length === 0 && !loading) {
    return null; // Ẩn section nếu không có albums
  }

  // Component for each album in grid - Horizontal layout
  const AlbumCard = ({ album }: { album: Album }) => {
    return (
      <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
        {/* Album Art - Left side, small square */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-subtle flex-shrink-0 border border-border/40">
          {getCoverImage(album) ? (
            <img
              src={getCoverImage(album)}
              alt={getAlbumName(album)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Disc className="w-6 h-6 text-white/60" />
            </div>
          )}
        </div>

        {/* Album Info - Right side */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-sm mb-0.5 line-clamp-1 text-white hover:text-primary transition-colors cursor-pointer"
              onClick={() => handlePlayAlbum(album)}
            >
              {getAlbumName(album)}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {getArtistName(album.artist)}
            </p>
          </div>
          
          {/* Icons - Right side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-7 h-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/album/${album.id}`);
                  }}
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  View Album
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Disc className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">For A.R. Rahman Fans</h2>
            <p className="text-xs text-muted-foreground">
              Top albums from A.R. Rahman
            </p>
          </div>
        </div>
        {allAlbums.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full gap-2 text-[13px]"
            onClick={handlePlayAll}
            disabled={loading}
          >
            <Play className="w-4 h-4" />
            Play All
          </Button>
        )}
      </div>

      {/* Grid 3x3 - Horizontal layout */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg">
              <div className="w-16 h-16 bg-muted/20 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-muted/20 rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedAlbums.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm mb-3">
            Không tìm thấy albums của A.R. Rahman.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/discover")}>
            Discover now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {displayedAlbums.map((album) => (
            <AlbumCard 
              key={album.id} 
              album={album}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ARRahmanFansSection;

