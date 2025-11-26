import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

export interface Song {
  id: string;
  name?: string;
  title?: string;
  songName?: string; // Alternative field from API
  artist: string;
  album: string;
  duration: number;
  cover: string;
  genre?: string;
  plays?: string;
  url?: string;
  audio?: string;
  audioUrl?: string;
  uuid?: string;
}

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  isShuffled: boolean;
  repeatMode: "off" | "one" | "all";
  playSong: (song: Song) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
  removeFromQueue: (songId: string | number) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: "off" | "one" | "all") => void;
  resetPlayer: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");

  const playSong = (song: Song) => {
    console.log("[MusicContext] playSong called with:", song.id, song.songName || song.name);
    console.log("[MusicContext] Current queue length:", queue.length);
    setCurrentSong(song);
    setIsPlaying(true);
  };
  
  // Wrapper cho setQueue để log và đảm bảo state được update
  // Memoize để tránh infinite loop khi được dùng trong dependency arrays
  const setQueueWithLog = useCallback((songs: Song[]) => {
    console.log("[MusicContext] setQueue called with", songs.length, "songs");
    console.log("[MusicContext] Song IDs:", songs.map(s => s.id));
    if (songs.length === 0) {
      console.warn("[MusicContext] WARNING: Setting empty queue!");
    }
    setQueue(songs);
    // Log sau khi set để verify
    setTimeout(() => {
      console.log("[MusicContext] Queue state after setQueue:", songs.length, "songs");
    }, 0);
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (queue.length === 0) return;

    if (!currentSong) {
      // No current song, play first
      playSong(queue[0]);
      return;
    }

    if (isShuffled) {
      // Shuffle mode: pick random song from queue
      const availableSongs = queue.filter(s => s.id !== currentSong.id);
      if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        playSong(availableSongs[randomIndex]);
      } else if (queue.length > 0) {
        // Only one song in queue, replay it if repeat all is on
        if (repeatMode === "all") {
          playSong(queue[0]);
        }
      }
    } else {
      // Normal mode: play next in order
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex < queue.length - 1) {
        playSong(queue[currentIndex + 1]);
      } else if (repeatMode === "all") {
        // Loop back to first song if repeat all is on
        playSong(queue[0]);
      }
    }
  };

  const playPrevious = () => {
    if (queue.length === 0 || !currentSong) return;

    if (isShuffled) {
      // In shuffle mode, pick another random song
      const availableSongs = queue.filter(s => s.id !== currentSong.id);
      if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        playSong(availableSongs[randomIndex]);
      }
    } else {
      // Normal mode: play previous in order
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex > 0) {
        playSong(queue[currentIndex - 1]);
      } else if (repeatMode === "all") {
        // Loop to last song if at beginning and repeat all is on
        playSong(queue[queue.length - 1]);
      }
    }
  };

  const addToQueue = (song: Song) => {
    let shouldAutoplayFirstSong = false;
    setQueue(prev => {
      const exists = prev.some((s) => String(s.id) === String(song.id));
      if (exists) {
        toast({
          title: "Bài hát đã có trong danh sách phát",
          description: `${song.songName || song.name || song.title || "Bài hát"} đã có trong danh sách đang phát.`,
        });
        return prev;
      }
      if (prev.length === 0 && !currentSong) {
        shouldAutoplayFirstSong = true;
      }
      return [...prev, song];
    });
    if (shouldAutoplayFirstSong) {
      playSong(song);
    }
  };

  const removeFromQueue = useCallback(
    (songId: string | number) => {
      setQueue(prev => {
        const updated = prev.filter((s) => String(s.id) !== String(songId));
        if (currentSong && String(currentSong.id) === String(songId)) {
          if (updated.length > 0) {
            playSong(updated[0]);
          } else {
            setCurrentSong(null);
            setIsPlaying(false);
          }
        }
        return updated;
      });
    },
    [currentSong, playSong],
  );

  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setQueue(prev => {
      if (prev.length === 0) return prev;
      const safeFrom = Math.max(0, Math.min(prev.length - 1, fromIndex));
      const safeTo = Math.max(0, Math.min(prev.length - 1, toIndex));
      if (safeFrom === safeTo) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(safeFrom, 1);
      updated.splice(safeTo, 0, moved);
      return updated;
    });
  }, []);

  const toggleShuffle = () => {
    setIsShuffled(prev => !prev);
  };

  const resetPlayer = useCallback(() => {
    console.log("[MusicContext] resetPlayer invoked");
    setCurrentSong(null);
    setIsPlaying(false);
    setQueue([]);
    setIsShuffled(false);
    setRepeatMode("off");
  }, []);

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        isShuffled,
        repeatMode,
        playSong,
        togglePlay,
        playNext,
        playPrevious,
        addToQueue,
        setQueue: setQueueWithLog,
        removeFromQueue,
        moveQueueItem,
        toggleShuffle,
        setRepeatMode,
        resetPlayer,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within MusicProvider");
  }
  return context;
};
