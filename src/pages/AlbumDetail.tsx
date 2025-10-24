import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import ShareButton from "@/components/ShareButton";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Heart, Clock, Music } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { useMusic } from "@/contexts/MusicContext";

/* 🎨 Helpers */
async function getDominantColor(url: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ r: 36, g: 36, b: 44 });
      const w = 32, h = 32;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (!count) return resolve({ r: 36, g: 36, b: 44 });
      resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
    };
    img.onerror = () => resolve({ r: 36, g: 36, b: 44 });
  });
}
function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n));
}
function mix(a: number, b: number, t: number) {
  return Math.round(a * (1 - t) + b * t);
}
function makePalette(rgb: { r: number; g: number; b: number }) {
  const base = { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
  return {
    primary: `rgb(${mix(base.r, 255, 0.25)}, ${mix(base.g, 255, 0.25)}, ${mix(base.b, 255, 0.25)})`,
    surfaceTop: `rgb(${mix(base.r, 30, 0.55)}, ${mix(base.g, 30, 0.55)}, ${mix(base.b, 30, 0.55)})`,
    surfaceBottom: `rgb(${mix(base.r, 10, 0.75)}, ${mix(base.g, 10, 0.75)}, ${mix(base.b, 10, 0.75)})`,
  };
}
function msToMMSS(sec: number) {
  const s = Math.floor(sec);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/* 🎵 Component */
const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, togglePlay, isPlaying, currentSong, setQueue } = useMusic();

  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState({
    primary: "rgb(140,140,160)",
    surfaceTop: "rgb(28,28,34)",
    surfaceBottom: "rgb(12,12,16)",
  });

  /* 📦 Fetch album */
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await albumsApi.getById(id);
        if (!res) return;

        const norm = {
          id: res.id,
          title: res.name,
          artist: res.artist?.name ?? "Unknown Artist",
          artistId: res.artist?.id,
          cover: res.coverUrl ?? "/placeholder-album.jpg",
          releaseDate: res.releaseDate ?? "",
          songs: res.songs ?? [],
        };
        const songList = norm.songs.map((s: any, i: number) => ({
          id: String(s.id),
          index: i + 1,
          title: s.name,
          artist: (s.artists && s.artists[0]?.name) || norm.artist,
          duration: s.duration ?? 0,
          audioUrl: s.audioUrl ?? "",
          cover: norm.cover,
        }));
        setAlbum(norm);
        setSongs(songList);
        setQueue(songList);

        const dom = await getDominantColor(norm.cover);
        setPalette(makePalette(dom));

        if (norm.artistId) {
          const all = await albumsApi.getAll({ size: 100 });
          const filtered = all.content.filter(
            (a: any) => a.artist?.id === norm.artistId && a.id !== norm.id
          );
          setRelated(filtered.slice(0, 6));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setQueue]);

  /* ▶️ Play / Pause logic */
  const handlePlayAlbum = () => {
    const albumHasCurrent = currentSong && songs.some((s) => s.id === currentSong.id);
    if (!songs.length) return;
    if (albumHasCurrent) togglePlay();
    else {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  const headerStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(180deg, ${palette.surfaceTop} 0%, ${palette.surfaceBottom} 100%)`,
    }),
    [palette]
  );

  return (
    <div className="min-h-screen text-foreground bg-background transition-colors duration-500">
      {/* 🟣 Album Header */}
      <div className="w-full border-b border-border" style={headerStyle}>
        <div className="container mx-auto px-4 py-10 md:py-14 flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-end">
          <div
            className="relative w-60 h-60 md:w-72 md:h-72 rounded-xl overflow-hidden shadow-xl flex items-center justify-center bg-black/20 dark:bg-black/40"
            style={{
              boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 24px 2px ${palette.primary}`,
            }}
          >
            <img
              src={album?.cover}
              alt={album?.title}
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="flex-1 flex flex-col justify-end text-center md:text-left">
            <Badge className="w-fit mb-3 bg-primary/20 text-primary">ALBUM</Badge>
            <h1
              className="text-5xl md:text-6xl font-extrabold leading-tight truncate max-w-full"
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={album?.title}
            >
              {album?.title}
            </h1>
            <div className="mt-2 text-muted-foreground flex flex-wrap justify-center md:justify-start gap-2">
              <span>{album?.artist}</span>
              <span>•</span>
              <span>
                {album?.releaseDate
                  ? new Date(album.releaseDate).getFullYear()
                  : "-"}
              </span>
              <span>• {songs.length} songs</span>
            </div>

            <div className="mt-6 flex justify-center md:justify-start gap-3">
              <Button
                onClick={handlePlayAlbum}
                className="rounded-full px-6 h-11 font-semibold text-black dark:text-white"
                style={{ background: palette.primary }}
              >
                {isPlaying && currentSong && songs.some((s) => s.id === currentSong.id) ? (
                  <Pause className="w-5 h-5 mr-2" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {isPlaying && currentSong && songs.some((s) => s.id === currentSong.id)
                  ? "Pause"
                  : "Play"}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-border hover:bg-primary/10"
              >
                <Heart className="w-5 h-5" />
              </Button>
              <ShareButton title={album?.title || "Album"} type="album" />
            </div>
          </div>
        </div>
      </div>

      {/* 🧾 Song List */}
      <div className="container mx-auto px-4 py-8">
        <Card className="border-border bg-card backdrop-blur-md">
          <CardContent className="p-0 divide-y divide-border/30">
            {/* header */}
            <div className="grid grid-cols-[56px_1fr_96px_96px_96px] md:grid-cols-[72px_1fr_160px_120px_120px]
              items-center px-6 min-h-[60px] text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <div className="text-center">#</div>
              <div>Title</div>
              <div className="hidden sm:block text-center">Released</div>
              <div className="text-center">
                <Clock className="w-3.5 h-3.5 inline-block mr-1" /> Duration
              </div>
              <div className="text-center">Actions</div>
            </div>

            {songs.length ? (
              songs.map((song) => {
                const active = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => {
                      if (active) togglePlay();
                      else {
                        setQueue(songs);
                        playSong(song);
                      }
                    }}
                    className={`grid grid-cols-[56px_1fr_96px_96px_96px] md:grid-cols-[72px_1fr_160px_120px_120px]
                      items-center gap-3 px-6 cursor-pointer select-none transition-colors
                      min-h-[60px] rounded-md
                      ${active ? "bg-primary/10" : "hover:bg-muted/30"}`}
                  >
                    {/* index / equalizer */}
                    <div className="flex items-center justify-center h-full">
                      {active ? (
                        isPlaying ? (
                          <span className="flex gap-[2px] items-center justify-center h-4">
                            <i className="bar" />
                            <i className="bar delay-100" />
                            <i className="bar delay-200" />
                          </span>
                        ) : (
                          <Play className="w-4 h-4" />
                        )
                      ) : (
                        <span>{song.index}</span>
                      )}
                    </div>

                    {/* title + artist */}
                    <div>
                      <div className={`truncate font-medium ${active ? "text-primary" : ""}`}>
                        {song.title}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </div>
                    </div>

                    <div className="hidden sm:flex justify-center text-sm">
                      {album?.releaseDate
                        ? new Date(album.releaseDate).toLocaleDateString()
                        : "—"}
                    </div>
                    <div className="flex justify-center text-sm">
                      {song.duration ? msToMMSS(song.duration) : "—"}
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 rounded-full ${
                          liked.includes(song.id) ? "text-red-500" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLiked((prev) =>
                            prev.includes(song.id)
                              ? prev.filter((x) => x !== song.id)
                              : [...prev, song.id]
                          );
                        }}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            liked.includes(song.id) ? "fill-current" : ""
                          }`}
                        />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ShareButton title={song.title} type="song" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center text-muted-foreground">
                No songs found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* related */}
      {related.length > 0 && (
        <div className="container mx-auto px-4 pb-16">
          <h2 className="text-2xl font-semibold mb-5">More from {album?.artist}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {related.map((rel: any) => (
              <Card
                key={rel.id}
                onClick={() => navigate(`/album/${rel.id}`)}
                className="cursor-pointer border-border hover:border-primary/40 bg-card hover:bg-muted/30 transition-all overflow-hidden"
              >
                <div className="aspect-square overflow-hidden">
                  {rel.coverUrl ? (
                    <img
                      src={rel.coverUrl}
                      alt={rel.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-black/30 flex items-center justify-center">
                      <Music className="w-10 h-10 text-white/40" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="font-medium truncate">{rel.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {rel.releaseDate ? new Date(rel.releaseDate).getFullYear() : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ChatBubble />
      <Footer />

      {/* equalizer animation */}
      <style>{`
        .bar {
          display:inline-block;
          width:2px;
          height:8px;
          vertical-align:middle;
          background:${isPlaying ? palette.primary : "transparent"};
          animation:${isPlaying ? "ev 1s ease-in-out infinite" : "none"};
        }
        .bar.delay-100{animation-delay:.12s}
        .bar.delay-200{animation-delay:.24s}
        @keyframes ev{0%{height:4px}50%{height:14px}100%{height:4px}}
      `}</style>
    </div>
  );
};

export default AlbumDetail;
