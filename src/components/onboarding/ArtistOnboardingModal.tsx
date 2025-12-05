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
        const message = error instanceof Error ? error.message : "Failed to load artists list";
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
      toast.error(`Please select at least ${MIN_SELECTION} artists`);
      return;
    }
    setSaving(true);
    try {
      await userPreferenceApi.saveSeed({
        artistIds: selectedArtists,
      });
      coldStartStorage.markCompleted();
      toast.success("Music profile has been set up! ✨");
      onCompleted?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save selection";
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
      <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl bg-[#040308] text-white border border-white/10 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-hidden">
          {loadingSeed ? (
            <div className="h-[40vh] flex items-center justify-center text-white/70 text-sm">
              Preparing personalized experience...
            </div>
          ) : (
            <>
              <header className="text-center space-y-2">
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs">
                  Welcome to EchoVerse
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-semibold">
                  Select at least {MIN_SELECTION} artists you love
                </h1>
                <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto">
                  We use preference vectors to recommend songs that match your taste right after you finish.
                  The more artists you select, the more accurate the recommendations.
                </p>
              </header>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs sm:text-sm font-medium tracking-wide text-white/80 flex items-center gap-2">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      {totalSelected} artists selected
                    </div>
                    <Button
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      className="rounded-full px-6 text-sm font-semibold"
                    >
                      {saving ? "Saving..." : "Start Exploring"}
                    </Button>
                  </div>
                  <Progress value={progressValue} className="h-1.5 bg-white/10" />
                  {!canSubmit && (
                    <p className="text-xs text-red-300">
                      Please select {Math.max(0, MIN_SELECTION - totalSelected)} more artist{Math.max(0, MIN_SELECTION - totalSelected) !== 1 ? 's' : ''} to continue.
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
    <div className="relative max-w-lg">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
      <Input
        placeholder="Search artists, genres..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 pr-4 py-3 text-sm rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50"
      />
    </div>
    {loading ? (
      <GridSkeleton />
    ) : (
      <ScrollArea className="h-[35vh] sm:h-[40vh] pr-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
      className={`relative flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition-all hover:-translate-y-1 hover:border-white/40 ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-[#040308]" : ""
      }`}
    >
      <div className="relative mb-2">
        <img
          src={artist.avatar || fallback}
          alt={artist.name}
          onError={(e) => {
            e.currentTarget.src = fallback;
          }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-white/20"
        />
        {selected && (
          <span className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="text-center space-y-0.5">
        <p className="font-semibold text-xs sm:text-sm leading-tight">{artist.name}</p>
        {artist.country && <p className="text-xs text-white/60">{artist.country}</p>}
      </div>
    </button>
  );
};

const GridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
    {Array.from({ length: 10 }).map((_, idx) => (
      <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col items-center gap-2">
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10" />
        <Skeleton className="h-3 w-20 bg-white/10" />
        <Skeleton className="h-2 w-14 bg-white/10" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="text-center text-white/60 py-8 text-sm">No artists found matching your search</div>
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

