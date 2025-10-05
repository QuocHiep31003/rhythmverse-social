import { createContext, useContext, useState, ReactNode } from "react";

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
  genre?: string;
  plays?: string;
  url?: string;
}

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  playSong: (song: Song) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (queue.length > 0 && currentSong) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex < queue.length - 1) {
        playSong(queue[currentIndex + 1]);
      }
    }
  };

  const playPrevious = () => {
    if (queue.length > 0 && currentSong) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex > 0) {
        playSong(queue[currentIndex - 1]);
      }
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        playSong,
        togglePlay,
        playNext,
        playPrevious,
        addToQueue,
        setQueue,
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
