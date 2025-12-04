import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play, MoreHorizontal, ListPlus, Info, Sparkles } from "lucide-react";
import { songsApi } from "@/services/api";
import { createSlug } from "@/utils/playlistUtils";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import type { Song } from "@/services/api/songApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";

const NewReleases = () => {
  const navigate = useNavigate();
  const { playSong, setQueue, addToQueue } = useMusic();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | number | null>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [selectedSongCover, setSelectedSongCover] = useState<string | undefined>(undefined);

  const fetchNewSongs = useCallback(async () => {
    try {
      setLoading(true);
      // Lấy top 10 bài hát mới ra mắt (chỉ ACTIVE), sort theo ngày phát hành
      const res = await songsApi.getPublic({
        page: 0,
        size: 10,
        sort: "releaseAt,desc", // Ưu tiên sort theo ngày phát hành
        status: "ACTIVE",
      });
      setSongs(res?.content || []);
    } catch (error) {
      console.error("Error fetching new releases:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewSongs();
  }, [fetchNewSongs]);

  const getArtistName = (artists: Song["artists"]): string => {
    if (typeof artists === 'string') return artists;
    if (Array.isArray(artists)) {
      return artists.map(a => a?.name).filter(Boolean).join(", ") || "Unknown Artist";
    }
    return "Unknown Artist";
  };

  const handlePlaySong = async (song: Song) => {
    const playerSong = mapToPlayerSong(song);
    await setQueue([playerSong]);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
  };

  const handlePlayAll = async () => {
    if (!songs.length) return;
    const queue = songs.map((s) =>
      mapToPlayerSong({
        ...s,
        songName: getSongName(s),
      })
    );
    await setQueue(queue);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(queue[0], playSong);
  };

  const getCoverImage = (song: Song): string | undefined => {
    return song.albumImageUrl || 
           song.albumCoverImg || 
           song.urlImageAlbum || 
           song.cover;
  };

  const getSongName = (song: Song): string => {
    return song.songName || song.name || "Unknown Song";
  };

  const featuredSong = songs[0];
  const secondarySongs = songs.slice(1);

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">New Releases</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Top 10 bài hát mới phát hành gần đây
            </p>
          </div>
        </div>
        {songs.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full gap-2 text-[13px]"
            onClick={handlePlayAll}
            disabled={loading}
          >
            <Play className="w-4 h-4" />
            Phát tất cả
          </Button>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="bg-white/5 rounded-2xl p-4 animate-pulse h-40" />
              ))}
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm mb-3">
                Hiện chưa có bài hát mới nào được phát hành.
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
              {/* Featured song bên trái */}
              {featuredSong && (
                <div className="lg:w-1/3 bg-black/30 rounded-2xl p-4 border border-white/10 shadow-xl flex flex-col gap-3">
                  <div
                    className="flex gap-4 cursor-pointer"
                    onClick={() =>
                      navigate(`/song/${createSlug(getSongName(featuredSong), featuredSong.id)}`)
                    }
                  >
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-gradient-subtle border border-white/20 flex-shrink-0">
                      {getCoverImage(featuredSong) ? (
                        <img
                          src={getCoverImage(featuredSong)!}
                          alt={getSongName(featuredSong)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        size="icon"
                        className="absolute bottom-2 right-2 rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySong(featuredSong);
                        }}
                      >
                        <Play className="w-5 h-5 ml-0.5 text-white" />
                      </Button>
                    </div>

                    <div className="flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-primary mb-1">
                          Mới phát hành
                        </p>
                        <h3 className="text-lg font-semibold text-white line-clamp-2">
                          {getSongName(featuredSong)}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getArtistName(featuredSong.artists)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full gap-2 text-[13px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySong(featuredSong);
                          }}
                        >
                          <Play className="w-4 h-4" />
                          Phát ngay
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full w-9 h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSongId(featuredSong.id);
                            setSelectedSongTitle(getSongName(featuredSong));
                            setSelectedSongCover(getCoverImage(featuredSong));
                            setAddToPlaylistOpen(true);
                          }}
                        >
                          <ListPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Danh sách các bài còn lại bên phải */}
              <div className="flex-1 bg-black/20 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Các bài hát mới khác
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {songs.length} bài hát
                  </span>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {secondarySongs.map((song) => {
                    const songName = getSongName(song);
                    const artistName = getArtistName(song.artists);

                    return (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer group"
                        onClick={() =>
                          navigate(`/song/${createSlug(songName, song.id)}`)
                        }
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-subtle flex-shrink-0 border border-white/10">
                          {getCoverImage(song) ? (
                            <img
                              src={getCoverImage(song)!}
                              alt={songName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                            {songName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {artistName}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySong(song);
                            }}
                          >
                            <Play className="w-4 h-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSongId(song.id);
                                  setSelectedSongTitle(songName);
                                  setSelectedSongCover(getCoverImage(song));
                                  setAddToPlaylistOpen(true);
                                }}
                              >
                                <ListPlus className="mr-2 h-4 w-4" />
                                Add to Playlist
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const playerSong = mapToPlayerSong(song);
                                  await addToQueue(playerSong);
                                }}
                              >
                                <Music className="mr-2 h-4 w-4" />
                                Add to Queue
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/song/${createSlug(songName, song.id)}`);
                                }}
                              >
                                <Info className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to Playlist Dialog */}
      {selectedSongId && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={selectedSongId}
          songTitle={selectedSongTitle}
          songCover={selectedSongCover}
        />
      )}
    </section>
  );
};

export default NewReleases;

