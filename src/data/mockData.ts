import { Song } from '@/contexts/MusicContext';

export const mockSongs: Song[] = [
  {
    id: "1",
    title: "Midnight City",
    artist: "M83",
    album: "Hurry Up, We're Dreaming",
    duration: 244,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    genre: "Electronic",
    plays: 15420000,
    likes: 89234
  },
  {
    id: "2", 
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: 200,
    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=600&fit=crop",
    genre: "Pop",
    plays: 28500000,
    likes: 156789
  },
  {
    id: "3",
    title: "Watermelon Sugar",
    artist: "Harry Styles", 
    album: "Fine Line",
    duration: 174,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=600&fit=crop",
    genre: "Pop Rock",
    plays: 22100000,
    likes: 134567
  },
  {
    id: "4",
    title: "Good 4 U",
    artist: "Olivia Rodrigo",
    album: "SOUR", 
    duration: 178,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    genre: "Pop Punk",
    plays: 19800000,
    likes: 98765
  },
  {
    id: "5",
    title: "Stay",
    artist: "The Kid LAROI, Justin Bieber",
    album: "F*CK LOVE 3: OVER YOU",
    duration: 141,
    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=600&fit=crop",
    genre: "Hip Hop",
    plays: 25600000,
    likes: 187432
  },
  {
    id: "6",
    title: "Heat Waves",
    artist: "Glass Animals",
    album: "Dreamland",
    duration: 238,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=600&fit=crop",
    genre: "Indie Pop",
    plays: 31200000,
    likes: 245678
  },
  {
    id: "7",
    title: "Anti-Hero", 
    artist: "Taylor Swift",
    album: "Midnights",
    duration: 200,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    genre: "Pop",
    plays: 45300000,
    likes: 312456
  },
  {
    id: "8",
    title: "Flowers",
    artist: "Miley Cyrus",
    album: "Endless Summer Vacation",
    duration: 200,
    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=600&fit=crop",
    genre: "Pop Rock",
    plays: 28900000,
    likes: 198765
  },
  {
    id: "9",
    title: "As It Was",
    artist: "Harry Styles",
    album: "Harry's House", 
    duration: 167,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=600&fit=crop",
    genre: "Pop Rock",
    plays: 33400000,
    likes: 267890
  },
  {
    id: "10",
    title: "Bad Habit",
    artist: "Steve Lacy",
    album: "Gemini Rights",
    duration: 223,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    genre: "R&B",
    plays: 18700000,
    likes: 123456
  }
];

export const mockPlaylists = [
  {
    id: "1",
    title: "Summer Vibes 🌞",
    description: "Perfect tracks for sunny days and good vibes",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    owner: {
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
    },
    isPublic: true,
    likes: 1247,
    songCount: 45,
    songs: mockSongs.slice(0, 8),
    collaborators: [
      { id: "1", name: "Alice Chen", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=100&h=100&fit=crop&crop=face" },
      { id: "2", name: "Bob Martinez", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" }
    ]
  },
  {
    id: "2", 
    title: "Workout Pump 💪",
    description: "High energy tracks to fuel your workout",
    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=600&fit=crop",
    owner: {
      name: "Sarah Kim",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
    },
    isPublic: true,
    likes: 892,
    songCount: 32,
    songs: mockSongs.slice(2, 6)
  },
  {
    id: "3",
    title: "Chill Lounge ☕",
    description: "Relaxing tunes for work or study",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=600&fit=crop",
    owner: {
      name: "Mike Johnson", 
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
    },
    isPublic: false,
    likes: 567,
    songCount: 28,
    songs: mockSongs.slice(4, 8)
  },
  {
    id: "4",
    title: "Party Hits 🎉",
    description: "The biggest party anthems and dance floor fillers",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    owner: {
      name: "Emma Davis",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=100&h=100&fit=crop&crop=face"
    },
    isPublic: true,
    likes: 2134,
    songCount: 52,
    songs: mockSongs.slice(1, 7)
  }
];

export const mockArtists = [
  {
    id: "1",
    name: "The Weeknd",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face",
    followers: 45600000,
    monthlyListeners: 85400000,
    topSongs: mockSongs.slice(0, 5)
  },
  {
    id: "2", 
    name: "Taylor Swift",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=200&h=200&fit=crop&crop=face",
    followers: 52300000,
    monthlyListeners: 96700000,
    topSongs: mockSongs.slice(2, 7)
  },
  {
    id: "3",
    name: "Harry Styles", 
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    followers: 38900000,
    monthlyListeners: 72100000,
    topSongs: mockSongs.slice(1, 6)
  }
];

export const mockAlbums = [
  {
    id: "1",
    title: "After Hours",
    artist: "The Weeknd",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    year: 2020,
    genre: "R&B/Pop",
    songs: mockSongs.slice(0, 5)
  },
  {
    id: "2",
    title: "Midnights", 
    artist: "Taylor Swift",
    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=600&fit=crop", 
    year: 2022,
    genre: "Pop",
    songs: mockSongs.slice(3, 8)
  },
  {
    id: "3",
    title: "Harry's House",
    artist: "Harry Styles",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=600&fit=crop",
    year: 2022, 
    genre: "Pop Rock",
    songs: mockSongs.slice(2, 7)
  }
];