import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover?: string;
  genre?: string;
  plays?: number;
  likes?: number;
}

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  setCurrentSong: (song: Song) => void;
  setIsPlaying: (playing: boolean) => void;
  playSong: (song: Song) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within a MusicProvider');
  }
  return context;
};

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>({
    id: "1",
    title: "Cosmic Dreams",
    artist: "EchoVerse Artists",
    album: "Space Vibes",
    duration: 60,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    genre: "Electronic",
    plays: 2547893,
    likes: 45672
  });
  const [isPlaying, setIsPlaying] = useState(true);

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  return (
    <MusicContext.Provider value={{
      currentSong,
      isPlaying,
      setCurrentSong,
      setIsPlaying,
      playSong
    }}>
      {children}
    </MusicContext.Provider>
  );
};