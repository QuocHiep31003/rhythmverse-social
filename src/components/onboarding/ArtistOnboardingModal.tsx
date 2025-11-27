import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Search, Sparkles, Check } from "lucide-react";
import { artistsApi } from "@/services/api/artistApi";
import userPreferenceApi from "@/services/api/userPreferenceApi";
import { coldStartStorage } from "@/utils/coldStartStorage";

interface Artist {
  id: number;
  name: string;
  avatar?: string;
  country?: string;
}

interface ArtistOnboardingModalProps {
  open: boolean;
  onCompleted?: () => void;
}

const MIN_SELECTION = 10;

const ArtistOnboardingModal = ({ open, onCompleted }: ArtistOnboardingModalProps) => {
  const [loadingSeed, setLoadingSeed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<number[]>([]);

  const totalSelected = selectedArtists.length;
  const canSubmit = totalSelected >= MIN_SELECTION && !saving;
  const progressValue = Math.min((totalSelected / MIN_SELECTION) * 100, 100);
  const debouncedArtistQuery = useDebounce(artistQuery, 300);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoadingSeed(true);
    const loadSeed = async () => {
      try {
        const seed = await userPreferenceApi.getSeed();
        if (cancelled) {
          return;
        }
        if (seed.artistIds?.length) {
          setSelectedArtists(seed.artistIds);
        } else {
          setSelectedArtists([]);
        }
      } catch (error) {
        console.error("[ArtistOnboardingModal] Failed to load seed preferences", error);
      } finally {
        if (!cancelled) {
          setLoadingSeed(false);
        }
      }
    };
    loadSeed();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    const fetchArtists = async () => {
      setLoadingArtists(true);
      try {
        const res = await artistsApi.searchPublicActive(debouncedArtistQuery, {
          page: 0,
          size: 30,
          sort: "name,asc",
        });
        if (!cancelled) {
          setArtistResults(res.content || []);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không tải được danh sách nghệ sĩ";
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoadingArtists(false);
        }
      }
    };
    fetchArtists();

    return () => {
      cancelled = true;
    };
  }, [debouncedArtistQuery, open]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const { body } = document;
    if (!open) {
      body.style.overflow = "";
      return;
    }
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleToggleArtist = (id: number) => {
    setSelectedArtists((prev) => {
      if (prev.includes(id)) {
        return prev.filter((artistId) => artistId !== id);
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(`Chọn tối thiểu ${MIN_SELECTION} nghệ sĩ`);
      return;
    }
    setSaving(true);
    try {
      await userPreferenceApi.saveSeed({
        artistIds: selectedArtists,
      });
      coldStartStorage.markCompleted();
      toast.success("Hồ sơ âm nhạc đã được thiết lập! ✨");
      onCompleted?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể lưu lựa chọn";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.25),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.2),_transparent_40%)]" />
      </div>
      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#040308] text-white border border-white/10 shadow-2xl p-6 sm:p-10 space-y-8 max-h-[90vh] overflow-hidden">
          {loadingSeed ? (
            <div className="h-[60vh] flex items-center justify-center text-white/70">
              Đang chuẩn bị trải nghiệm cá nhân hóa...
            </div>
          ) : (
            <>
              <header className="text-center space-y-4">
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  Welcome to EchoVerse
                </Badge>
                <h1 className="text-4xl sm:text-5xl font-semibold">
                  Hãy chọn tối thiểu {MIN_SELECTION} nghệ sĩ bạn yêu thích
                </h1>
                <p className="text-base sm:text-lg text-white/70 max-w-3xl mx-auto">
                  Chúng tôi sử dụng vector sở thích để đề xuất bài hát chuẩn gu ngay sau khi bạn hoàn tất.
                  Càng chọn nhiều nghệ sĩ, đề xuất càng chính xác.
                </p>
              </header>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-5 sm:p-7 space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm font-medium tracking-wide text-white/80 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Đã chọn {totalSelected} nghệ sĩ
                    </div>
                    <Button
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      className="rounded-full px-8 text-base font-semibold"
                    >
                      {saving ? "Đang lưu..." : "Bắt đầu khám phá"}
                    </Button>
                  </div>
                  <Progress value={progressValue} className="h-2 bg-white/10" />
                  {!canSubmit && (
                    <p className="text-xs text-red-300">
                      Bạn cần chọn thêm {Math.max(0, MIN_SELECTION - totalSelected)} nghệ sĩ để tiếp tục.
                    </p>
                  )}
                </div>

                <SelectionGrid
                  loading={loadingArtists}
                  items={artistResults}
                  searchValue={artistQuery}
                  onSearchChange={setArtistQuery}
                  renderCard={(artist) => (
                    <ArtistCard
                      key={artist.id}
                      artist={artist}
                      selected={selectedArtists.includes(artist.id)}
                      onToggle={() => handleToggleArtist(artist.id)}
                    />
                  )}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface SelectionGridProps<T> {
  loading: boolean;
  items: T[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  renderCard: (item: T) => JSX.Element;
}

const SelectionGrid = <T extends { id: number }>({
  loading,
  items,
  searchValue,
  onSearchChange,
  renderCard,
}: SelectionGridProps<T>) => (
  <div className="space-y-4">
    <div className="relative max-w-xl">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
      <Input
        placeholder="Tìm kiếm nghệ sĩ, thể loại..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-12 pr-4 py-6 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50"
      />
    </div>
    {loading ? (
      <GridSkeleton />
    ) : (
      <ScrollArea className="h-[52vh] pr-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item) => renderCard(item))}
        </div>
        {items.length === 0 && <EmptyState />}
      </ScrollArea>
    )}
  </div>
);

const ArtistCard = ({
  artist,
  selected,
  onToggle,
}: {
  artist: Artist;
  selected: boolean;
  onToggle: () => void;
}) => {
  const fallback = "/placeholder.svg";
  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 p-4 text-white transition-all hover:-translate-y-1 hover:border-white/40 ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-[#040308]" : ""
      }`}
    >
      <div className="relative mb-3">
        <img
          src={artist.avatar || fallback}
          alt={artist.name}
          onError={(e) => {
            e.currentTarget.src = fallback;
          }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-white/20"
        />
        {selected && (
          <span className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-sm sm:text-base leading-tight">{artist.name}</p>
        {artist.country && <p className="text-xs text-white/60">{artist.country}</p>}
      </div>
    </button>
  );
};

const GridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
    {Array.from({ length: 10 }).map((_, idx) => (
      <div key={idx} className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-3">
        <Skeleton className="w-20 h-20 rounded-full bg-white/10" />
        <Skeleton className="h-4 w-24 bg-white/10" />
        <Skeleton className="h-3 w-16 bg-white/10" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="text-center text-white/60 py-10">Không tìm thấy nghệ sĩ phù hợp với từ khóa của bạn</div>
);

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
};

export default ArtistOnboardingModal;

