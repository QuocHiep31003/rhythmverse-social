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

// Admin Mock Data
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "User" | "Premium" | "Moderator" | "Admin";
  status: "active" | "suspended" | "banned";
  joinDate: string;
  lastActive: string;
  reportsCount: number;
  playlists: number;
  followers: number;
}

export interface AdminSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  uploadDate: string;
  plays: number;
  status: "approved" | "pending" | "rejected";
  reports: number;
  genre: string;
}

export interface AdminPlaylist {
  id: string;
  name: string;
  creator: string;
  songs: number;
  followers: number;
  isPublic: boolean;
  createdDate: string;
  status: "active" | "reported" | "removed";
}

export interface AdminReport {
  id: string;
  type: "Inappropriate Content" | "Copyright Violation" | "Spam" | "Harassment" | "Other";
  targetType: "song" | "user" | "playlist";
  targetTitle: string;
  reporter: string;
  reason: string;
  date: string;
  status: "pending" | "under_review" | "resolved" | "dismissed";
}

export const mockAdminUsers: AdminUser[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    role: "Premium",
    status: "active",
    joinDate: "2023-12-15",
    lastActive: "2 hours ago",
    reportsCount: 0,
    playlists: 12,
    followers: 245
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@example.com",
    role: "User",
    status: "active",
    joinDate: "2024-01-10",
    lastActive: "30 minutes ago",
    reportsCount: 0,
    playlists: 5,
    followers: 89
  },
  {
    id: "3",
    name: "Mike Rodriguez",
    email: "mike@example.com",
    role: "Moderator",
    status: "active",
    joinDate: "2023-11-20",
    lastActive: "1 hour ago",
    reportsCount: 0,
    playlists: 8,
    followers: 567
  },
  {
    id: "4",
    name: "Emma Davis",
    email: "emma@example.com",
    role: "User",
    status: "suspended",
    joinDate: "2024-01-08",
    lastActive: "3 days ago",
    reportsCount: 3,
    playlists: 2,
    followers: 12
  },
  {
    id: "5",
    name: "James Wilson",
    email: "james@example.com",
    role: "Admin",
    status: "active",
    joinDate: "2023-08-15",
    lastActive: "10 minutes ago",
    reportsCount: 0,
    playlists: 25,
    followers: 1234
  },
  {
    id: "6",
    name: "Lisa Anderson",
    email: "lisa@example.com",
    role: "Premium",
    status: "active",
    joinDate: "2023-09-22",
    lastActive: "1 day ago",
    reportsCount: 0,
    playlists: 18,
    followers: 432
  }
];

export const mockAdminSongs: AdminSong[] = [
  {
    id: "1",
    title: "Cosmic Dreams",
    artist: "StarGazer",
    album: "Galaxy Sounds",
    duration: "3:45",
    uploadDate: "2024-01-15",
    plays: 12567,
    status: "approved",
    reports: 0,
    genre: "Electronic"
  },
  {
    id: "2",
    title: "Night Vibes",
    artist: "Chill Collective",
    album: "Late Nights",
    duration: "4:12",
    uploadDate: "2024-01-14",
    plays: 8934,
    status: "pending",
    reports: 2,
    genre: "Chillout"
  },
  {
    id: "3",
    title: "Electronic Pulse",
    artist: "TechBeats",
    album: "Digital Era",
    duration: "5:23",
    uploadDate: "2024-01-13",
    plays: 15432,
    status: "approved",
    reports: 0,
    genre: "Techno"
  },
  {
    id: "4",
    title: "Summer Breeze",
    artist: "Island Sounds",
    duration: "3:58",
    uploadDate: "2024-01-12",
    plays: 9876,
    status: "approved",
    reports: 0,
    genre: "Tropical House"
  },
  {
    id: "5",
    title: "Urban Flow",
    artist: "Street Poets",
    album: "City Life",
    duration: "4:05",
    uploadDate: "2024-01-11",
    plays: 21345,
    status: "approved",
    reports: 0,
    genre: "Hip Hop"
  }
];

export const mockAdminPlaylists: AdminPlaylist[] = [
  {
    id: "1",
    name: "Workout Motivation",
    creator: "Alex Johnson",
    songs: 45,
    followers: 1234,
    isPublic: true,
    createdDate: "2023-12-20",
    status: "active"
  },
  {
    id: "2",
    name: "Chill Evening",
    creator: "Sarah Chen",
    songs: 32,
    followers: 567,
    isPublic: true,
    createdDate: "2024-01-05",
    status: "active"
  },
  {
    id: "3",
    name: "Party Hits",
    creator: "Mike Rodriguez",
    songs: 78,
    followers: 2345,
    isPublic: true,
    createdDate: "2023-11-15",
    status: "active"
  },
  {
    id: "4",
    name: "Spam Playlist",
    creator: "Emma Davis",
    songs: 5,
    followers: 2,
    isPublic: true,
    createdDate: "2024-01-08",
    status: "reported"
  }
];

export const mockAdminReports: AdminReport[] = [
  {
    id: "1",
    type: "Inappropriate Content",
    targetType: "song",
    targetTitle: "Night Vibes",
    reporter: "User123",
    reason: "Contains explicit lyrics not marked as such",
    date: "2024-01-15 14:30",
    status: "pending"
  },
  {
    id: "2",
    type: "Copyright Violation",
    targetType: "song",
    targetTitle: "Popular Hit Copy",
    reporter: "MusicLover456",
    reason: "This appears to be a copyrighted song",
    date: "2024-01-15 12:15",
    status: "under_review"
  },
  {
    id: "3",
    type: "Spam",
    targetType: "user",
    targetTitle: "SpamUser99",
    reporter: "CleanMusic",
    reason: "User is spamming playlists with promotional content",
    date: "2024-01-14 18:45",
    status: "resolved"
  },
  {
    id: "4",
    type: "Harassment",
    targetType: "user",
    targetTitle: "Emma Davis",
    reporter: "AnotherUser",
    reason: "Sending inappropriate messages to multiple users",
    date: "2024-01-14 10:20",
    status: "resolved"
  },
  {
    id: "5",
    type: "Inappropriate Content",
    targetType: "playlist",
    targetTitle: "Spam Playlist",
    reporter: "ModUser",
    reason: "Playlist contains spam and promotional links",
    date: "2024-01-13 16:45",
    status: "pending"
  }
];

export const mockAnalytics = {
  dailyActiveUsers: [
    { day: "Mon", users: 8500, date: "2024-01-08" },
    { day: "Tue", users: 9200, date: "2024-01-09" },
    { day: "Wed", users: 8800, date: "2024-01-10" },
    { day: "Thu", users: 9600, date: "2024-01-11" },
    { day: "Fri", users: 10200, date: "2024-01-12" },
    { day: "Sat", users: 12100, date: "2024-01-13" },
    { day: "Sun", users: 11800, date: "2024-01-14" }
  ],
  topGenres: [
    { genre: "Electronic", percentage: 28, plays: 2456789 },
    { genre: "Pop", percentage: 24, plays: 2103456 },
    { genre: "Rock", percentage: 18, plays: 1578901 },
    { genre: "Hip Hop", percentage: 15, plays: 1314567 },
    { genre: "Other", percentage: 15, plays: 1314567 }
  ],
  monthlyStats: [
    { month: "Jul", users: 45000, premium: 8900, revenue: 89000 },
    { month: "Aug", users: 48000, premium: 9500, revenue: 95000 },
    { month: "Sep", users: 52000, premium: 10200, revenue: 102000 },
    { month: "Oct", users: 58000, premium: 11800, revenue: 118000 },
    { month: "Nov", users: 62000, premium: 13200, revenue: 132000 },
    { month: "Dec", users: 68000, premium: 15100, revenue: 151000 },
    { month: "Jan", users: 72000, premium: 16800, revenue: 168000 }
  ],
  topSongs: [
    { title: "Electronic Pulse", artist: "TechBeats", plays: 15432 },
    { title: "Urban Flow", artist: "Street Poets", plays: 21345 },
    { title: "Cosmic Dreams", artist: "StarGazer", plays: 12567 },
    { title: "Summer Breeze", artist: "Island Sounds", plays: 9876 },
    { title: "Night Vibes", artist: "Chill Collective", plays: 8934 }
  ]
};
