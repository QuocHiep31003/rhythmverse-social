import { Song } from "@/contexts/MusicContext";

export const mockSongs: Song[] = [
  {
    id: "1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: 200,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    genre: "Synthpop",
    plays: "2.8B"
  },
  {
    id: "2",
    title: "Watermelon Sugar",
    artist: "Harry Styles",
    album: "Fine Line",
    duration: 174,
    cover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    genre: "Pop",
    plays: "1.5B"
  },
  {
    id: "3",
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    duration: 203,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    genre: "Disco-Pop",
    plays: "1.9B"
  },
  {
    id: "4",
    title: "Good 4 U",
    artist: "Olivia Rodrigo",
    album: "SOUR",
    duration: 178,
    cover: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    genre: "Pop Punk",
    plays: "1.2B"
  },
  {
    id: "5",
    title: "Heat Waves",
    artist: "Glass Animals",
    album: "Dreamland",
    duration: 238,
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
    genre: "Indie Pop",
    plays: "1.7B"
  },
  {
    id: "6",
    title: "As It Was",
    artist: "Harry Styles",
    album: "Harry's House",
    duration: 167,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    genre: "Pop",
    plays: "2.1B"
  },
  {
    id: "7",
    title: "Anti-Hero",
    artist: "Taylor Swift",
    album: "Midnights",
    duration: 204,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    genre: "Pop",
    plays: "987M"
  },
  {
    id: "8",
    title: "Flowers",
    artist: "Miley Cyrus",
    album: "Endless Summer Vacation",
    duration: 200,
    cover: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=400&h=400&fit=crop",
    genre: "Pop",
    plays: "1.2B"
  },
  {
    id: "9",
    title: "Vampire",
    artist: "Olivia Rodrigo",
    album: "GUTS",
    duration: 219,
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    genre: "Alt-Pop",
    plays: "856M"
  },
  {
    id: "10",
    title: "Cruel Summer",
    artist: "Taylor Swift",
    album: "Lover",
    duration: 178,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    genre: "Synth-Pop",
    plays: "1.4B"
  }
];

export const getTrendingSongs = () => mockSongs.slice(0, 5);
export const getNewReleases = () => mockSongs.slice(5, 10);
export const getAIRecommended = () => [mockSongs[1], mockSongs[4], mockSongs[7]];
