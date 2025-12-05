import { useCallback, useEffect, useMemo, useState, KeyboardEventHandler, useRef } from "react";
import { X, Music, SendHorizonal, Radio, Heart, Loader2, Sparkles, Zap, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { watchChatMessagesForRoom, getPlaylistRoomId, type FirebaseMessage, watchListeningSession, type ListeningSession, watchTyping, watchReactions } from "@/services/firebase/chat";
import { playlistChatApi, chatApi } from "@/services/api/chatApi";
import { songsApi } from "@/services/api/songApi";
import { moodsApi, genresApi } from "@/services/api";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { mapToPlayerSong } from "@/lib/utils";
import { SharedPlaylistCard, SharedAlbumCard, SharedSongCard } from "@/components/social/SharedContentCards";
import { useMusic, type Song } from "@/contexts/MusicContext";
import { GENRE_ICON_OPTIONS, MOOD_ICON_OPTIONS } from "@/data/iconOptions";
import { useToast } from "@/hooks/use-toast";
import { Smile, Frown, Cloud, Sun, Moon, Flame, Droplets, Sparkles as SparklesIcon } from "lucide-react";

type PlaylistChatWindowProps = {
  playlistId: number;
  playlistName: string;
  coverUrl?: string | null;
  ownerName: string;
  memberCount: number;
  meId: number;
  onClose: () => void;
  onNewMessage?: (msg: FirebaseMessage) => void;
  onReact?: (messageId: number, emoji: string) => Promise<void>;
};

export const PlaylistChatWindow = ({
  playlistId,
  playlistName,
  coverUrl,
  ownerName,
  memberCount,
  meId,
  onClose,
  onNewMessage,
  onReact,
}: PlaylistChatWindowProps) => {
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { playSong, currentSong, isPlaying, updatePosition, position, togglePlay } = useMusic();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [listeningSession, setListeningSession] = useState<ListeningSession | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, { emoji: string; userId: number }>>>({});
  const [showGenreMoodModal, setShowGenreMoodModal] = useState(false);
  const [availableMoods, setAvailableMoods] = useState<Array<{ id: number; name: string; tone: "positive" | "negative" | "neutral"; iconUrl?: string; songCount?: number }>>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: number; name: string; iconUrl?: string; songCount?: number }>>([]);
  const [selectedMoodIds, setSelectedMoodIds] = useState<number[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [selectedListeningGoal, setSelectedListeningGoal] = useState<string | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [userOverview, setUserOverview] = useState<{ genres: Array<{ id: number; name: string; percentage: number }>; moods: Array<{ id: number; name: string; percentage: number }> } | null>(null);
  // Track leave/join to avoid auto-join loop
  const manualLeaveRef = useRef(false);
  const lastSessionKeyRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { setQueue } = useMusic();

  // Mục tiêu nghe (listening goals) - map với mood names từ API
  const listeningGoals = [
    { id: "focus", label: "Focus", icon: "🎯", keywords: ["focus", "concentration", "work", "study", "productivity", "tập trung", "làm việc"] },
    { id: "study", label: "Study", icon: "📚", keywords: ["study", "learning", "academic", "reading", "học tập", "nghiên cứu"] },
    { id: "party", label: "Party", icon: "🎉", keywords: ["party", "celebration", "dance", "energetic", "fun", "tiệc", "sôi động", "vui vẻ"] },
    { id: "roadtrip", label: "Roadtrip", icon: "🚗", keywords: ["roadtrip", "travel", "journey", "adventure", "driving", "du lịch", "phiêu lưu"] },
    { id: "workout", label: "Workout", icon: "💪", keywords: ["workout", "exercise", "gym", "fitness", "training", "tập luyện", "thể dục"] },
    { id: "sleep", label: "Sleep", icon: "😴", keywords: ["sleep", "relax", "calm", "peaceful", "meditation", "ngủ", "thư giãn", "yên bình"] },
    { id: "chill", label: "Chill", icon: "☕", keywords: ["chill", "relax", "cozy", "lounge", "ambient", "thư giãn", "nhẹ nhàng"] },
    { id: "romantic", label: "Romantic", icon: "💕", keywords: ["romantic", "love", "date", "intimate", "lãng mạn", "tình yêu", "yêu đương"] },
  ];

  const roomId = useMemo(() => getPlaylistRoomId(playlistId), [playlistId]);

  const isRemoteIcon = (value?: string) => !!value && /^https?:\/\//i.test(value);

  // Load moods, genres và phân tích lịch sử nghe khi mở modal
  useEffect(() => {
    if (!showGenreMoodModal) return;

    const loadMoods = async () => {
      try {
        const data = await moodsApi.getPublic({ page: 0, size: 50, sort: "name,asc" });
        const items = (data?.content ?? []).map((m: any) => {
          const name: string = m.name || "";
          const lower = name.toLowerCase();
          let tone: "positive" | "negative" | "neutral" = "neutral";
          if (/(vui|happy|joy|love|party|energetic|phấn khích|sôi động)/i.test(lower)) {
            tone = "positive";
          } else if (/(buồn|sad|đau|tâm trạng|lonely|cry|heartbreak|dark)/i.test(lower)) {
            tone = "negative";
          }
          return { 
            id: m.id as number, 
            name, 
            tone,
            iconUrl: m.iconUrl || undefined
          };
        });
        setAvailableMoods(items);
      } catch (error) {
        console.error("Failed to load moods:", error);
      }
    };

    const loadGenres = async () => {
      try {
        const data = await genresApi.getPublic({ page: 0, size: 50, sort: "name,asc" });
        const items = (data?.content ?? []).map((g: any) => ({
          id: g.id as number,
          name: g.name || "",
          iconUrl: g.iconUrl || undefined,
        }));
        setAvailableGenres(items);
      } catch (error) {
        console.error("Failed to load genres:", error);
      }
    };

      // Phân tích lịch sử nghe để gợi ý
      const loadUserOverview = async () => {
        setIsLoadingOverview(true);
        try {
          const overview = await listeningHistoryApi.getMyOverview();
          setUserOverview({
            genres: overview.genres || [],
            moods: overview.moods || [],
          });
        } catch (error) {
          console.error("Failed to load user overview:", error);
          // Không cần hiển thị lỗi, chỉ là gợi ý
        } finally {
          setIsLoadingOverview(false);
        }
      };

      void loadMoods();
      void loadGenres();
      void loadUserOverview();
    }, [showGenreMoodModal]);

  // Khi chọn mục tiêu nghe, tự động filter và chọn moods phù hợp từ API
  useEffect(() => {
    if (!selectedListeningGoal || availableMoods.length === 0) return;

    const goal = listeningGoals.find(g => g.id === selectedListeningGoal);
    if (!goal) return;

    // Tìm moods phù hợp với mục tiêu từ danh sách moods API
    const matchingMoods = availableMoods.filter(mood => {
      const moodNameLower = mood.name.toLowerCase();
      return goal.keywords.some(keyword => moodNameLower.includes(keyword));
    });

    // Tự động chọn các moods phù hợp (không override nếu đã chọn)
    if (matchingMoods.length > 0) {
      setSelectedMoodIds(prev => {
        const newIds = matchingMoods.map(m => m.id);
        // Merge với các mood đã chọn, loại bỏ trùng lặp
        const merged = [...new Set([...prev, ...newIds])];
        return merged;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListeningGoal, availableMoods]);

  const getMoodIcon = useCallback((moodName: string, tone: "positive" | "negative" | "neutral") => {
    const lower = moodName.toLowerCase();
    if (tone === "positive") {
      if (/(happy|vui|joy|phấn khích)/i.test(lower)) return Smile;
      if (/(love|romantic|yêu)/i.test(lower)) return Heart;
      if (/(party|energetic|sôi động)/i.test(lower)) return SparklesIcon;
      if (/(sun|summer|nắng)/i.test(lower)) return Sun;
      return Heart;
    } else if (tone === "negative") {
      if (/(sad|buồn|cry|đau)/i.test(lower)) return Frown;
      if (/(dark|night|tối)/i.test(lower)) return Moon;
      if (/(rain|mưa|storm)/i.test(lower)) return Cloud;
      return Frown;
    } else {
      if (/(chill|relax|thư giãn)/i.test(lower)) return Droplets;
      if (/(fire|flame|lửa)/i.test(lower)) return Flame;
      return Music;
    }
  }, []);

  const handleToggleMood = useCallback((moodId: number) => {
    setSelectedMoodIds((prev) => {
      if (prev.includes(moodId)) {
        return prev.filter((id) => id !== moodId);
      }
      return [...prev, moodId];
    });
  }, []);

  const handleToggleGenre = useCallback((genreId: number) => {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) {
        return prev.filter((id) => id !== genreId);
      }
      return [...prev, genreId];
    });
  }, []);

  const handleStartListeningWithGenreMood = useCallback(async () => {
    const noSelection = selectedMoodIds.length === 0 && selectedGenreIds.length === 0 && !selectedListeningGoal;
    try {
      setIsLoadingRecommendations(true);
      let mapped: any[] = [];

      // Nếu có mục tiêu nghe, ưu tiên dùng AI picks dựa trên lịch sử nghe
      if (selectedListeningGoal) {
        try {
          const aiPicks = await songsApi.getAiPicksForYou(50);
          if (aiPicks.length > 0) {
            mapped = aiPicks.map((s) => mapToPlayerSong(s));
            toast({
              title: "Đã phân tích sở thích của bạn",
              description: `Dựa trên lịch sử nghe, hệ thống đã đề xuất ${mapped.length} bài hát phù hợp`,
            });
          }
        } catch (e) {
          console.error("Failed to get AI picks:", e);
        }
      }

      // Nếu có moods, ưu tiên dùng mood-based recommendations API
      if (selectedMoodIds.length > 0) {
        try {
          const apiSongs = await songsApi.getRecommendationsByMoods(selectedMoodIds, 50);
          const moodMapped = apiSongs.map((s) => mapToPlayerSong(s));
          
          if (mapped.length > 0) {
            // Merge với AI picks, ưu tiên AI picks
            const merged = [...mapped, ...moodMapped];
            const unique = merged.filter((song, index, self) =>
              index === self.findIndex((s) => s.songId === song.songId)
            );
            mapped = unique;
          } else {
            mapped = moodMapped;
          }
        } catch (e) {
          console.error("Failed to get mood recommendations:", e);
        }
      }

      // Nếu có genres, lấy thêm bài hát theo genre
      if (selectedGenreIds.length > 0) {
        try {
          const genreSongs = await songsApi.getAll({
            genreId: selectedGenreIds[0],
            size: 50,
            page: 0,
            status: "ACTIVE",
          });
          const content = Array.isArray((genreSongs as any)?.content)
            ? (genreSongs as any).content
            : [];
          const genreMapped = content.map((s: any) => mapToPlayerSong(s));

          if (mapped.length > 0) {
            const merged = [...mapped, ...genreMapped];
            const unique = merged.filter((song, index, self) =>
              index === self.findIndex((s) => s.songId === song.songId)
            );
            mapped = unique;
          } else {
            mapped = genreMapped;
          }
        } catch (e) {
          console.error("Failed to get genre songs:", e);
        }
      }

      // Fallback: nếu vẫn rỗng và có mood, thử search theo moodId đầu tiên
      if (mapped.length === 0 && selectedMoodIds.length > 0) {
        try {
          const firstMoodId = selectedMoodIds[0];
          const fallback = await songsApi.getAll({
            moodId: firstMoodId,
            size: 30,
            page: 0,
            status: "ACTIVE",
          });
          const content = Array.isArray((fallback as any)?.content)
            ? (fallback as any).content
            : (fallback as any)?.songs ?? [];
          mapped = content.map((s: any) => mapToPlayerSong(s));
        } catch (e) {
          console.error("Fallback mood search failed:", e);
        }
      }

      // Fallback cuối: nếu không chọn gì và mapped rỗng, thử AI picks mặc định
      if (mapped.length === 0 && noSelection) {
        try {
          const aiPicks = await songsApi.getAiPicksForYou(50);
          mapped = aiPicks.map((s: any) => mapToPlayerSong(s));
        } catch (e) {
          console.error("AI picks fallback failed:", e);
        }
      }

      // Fallback cuối cùng: nếu vẫn rỗng, lấy 30 bài public mặc định
      if (mapped.length === 0) {
        try {
          const anySongs = await songsApi.getAll({ page: 0, size: 30, status: "ACTIVE" });
          const content = Array.isArray((anySongs as any)?.content)
            ? (anySongs as any).content
            : (anySongs as any)?.songs ?? [];
          mapped = content.map((s: any) => mapToPlayerSong(s));
        } catch (e) {
          console.error("General fallback getAll failed:", e);
        }
      }

      if (mapped.length > 0) {
        // Set queue và bắt đầu phát bài đầu tiên
        await setQueue(mapped);
        const firstSong = mapped[0];
        const songToPlay: Song = {
          id: String(firstSong.songId || firstSong.id || ""),
          songName: firstSong.songName || firstSong.name || "Unknown Song",
          name: firstSong.songName || firstSong.name || "Unknown Song",
          artist: firstSong.artist || "",
          album: firstSong.album || "",
          duration: firstSong.duration || 0,
          cover: firstSong.cover || "",
          audioUrl: firstSong.audioUrl,
        };
        
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        await playSongWithStreamUrl(songToPlay as any, playSong);

        // Bắt đầu listening session với queue ban đầu
        const numericSongId = Number(songToPlay.id);
        if (Number.isFinite(numericSongId)) {
          // Lấy danh sách songId từ queue (bỏ qua bài đầu tiên đang phát)
          const queueSongIds = mapped
            .slice(1) // Bỏ qua bài đầu tiên
            .map(s => Number(s.songId || s.id))
            .filter(id => Number.isFinite(id));
          
          await playlistChatApi.startListening(playlistId, meId, numericSongId, 0, true, queueSongIds);
        }

        setShowGenreMoodModal(false);
        toast({
          title: "Đã tạo playlist",
          description: `Đang phát: ${songToPlay.songName} (${mapped.length} bài hát)`,
        });
      } else {
        toast({
          title: "Không tìm thấy bài hát phù hợp",
          description: "Thử chọn mood/genre khác hoặc kiểm tra dữ liệu hệ thống.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      toast({
        title: "Lỗi tạo playlist",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
        setIsLoadingRecommendations(false);
      }
    }, [selectedMoodIds, selectedGenreIds, selectedListeningGoal, playlistId, meId, playSong, setQueue, toast]);

  useEffect(() => {
    let lastMessageKey: string | undefined;
    const unsubscribe = watchChatMessagesForRoom(roomId, (msgs) => {
      setMessages(msgs);
      if (!onNewMessage || !msgs.length) return;
      const last = msgs[msgs.length - 1];
      const key = last.id ?? String(last.sentAt ?? "");
      if (key && key !== lastMessageKey) {
        lastMessageKey = key;
        onNewMessage(last);
      }
    });
    return () => unsubscribe();
  }, [roomId, onNewMessage]);

  // Watch listening session state for this playlist room
  useEffect(() => {
    const unsubscribe = watchListeningSession(roomId, setListeningSession);
    return () => unsubscribe();
  }, [roomId]);

  // Scroll luôn xuống cuối khi mở cửa sổ hoặc khi có tin nhắn mới
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await playlistChatApi.sendText(playlistId, meId, text);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to send message:", e);
    } finally {
      setSending(false);
    }
  }, [input, sending, playlistId, meId]);

  const handleShareCurrentSong = useCallback(async () => {
    if (!currentSong || sending) return;
    const songIdNum = Number(currentSong.id);
    if (!Number.isFinite(songIdNum)) {
      console.warn("[PlaylistChatWindow] Cannot share current song - invalid id:", currentSong.id);
      return;
    }
    setSending(true);
    try {
      await playlistChatApi.shareSong(playlistId, meId, songIdNum);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to share current song:", e);
    } finally {
      setSending(false);
    }
  }, [currentSong, sending, playlistId, meId]);

  const handleSuggestCurrentSong = useCallback(async () => {
    if (!currentSong || sending) return;
    if (!listeningSession) return;
    const isHost = Number(meId) === Number(listeningSession.hostId);
    if (isHost) {
      // Host không suggest, host tự control
      return;
    }
    const songIdNum = Number(currentSong.id);
    if (!Number.isFinite(songIdNum)) {
      console.warn("[PlaylistChatWindow] Cannot suggest current song - invalid id:", currentSong.id);
      return;
    }
    setSending(true);
    try {
      await playlistChatApi.suggestSong(playlistId, meId, songIdNum);
      toast({
        title: "Đã đề xuất bài hát",
        description: `${currentSong.songName || currentSong.name} đã được thêm vào queue`,
      });
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to suggest current song:", e);
      toast({
        title: "Lỗi đề xuất bài hát",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [currentSong, sending, playlistId, meId, listeningSession, toast]);

  // Tính năng đề xuất bài hát AI trong lúc nghe
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [queueSongs, setQueueSongs] = useState<Array<{ key: string; songId: number; suggestedBy: number; suggestedAt: number; songData?: Song }>>([]);
  const [loadingQueueSongs, setLoadingQueueSongs] = useState(false);
  const lastQueueKeyRef = useRef<string | null>(null);

  // Load queue songs từ listeningSession.queue
  useEffect(() => {
    const queueObj = listeningSession?.queue;
    if (!queueObj) {
      setQueueSongs([]);
      lastQueueKeyRef.current = null;
      return;
    }

    // Tạo hash đơn giản để tránh reload queue khi session update chỉ là position/playing
    const queueKey = JSON.stringify(Object.keys(queueObj).sort());
    if (lastQueueKeyRef.current === queueKey) {
      return;
    }
    lastQueueKeyRef.current = queueKey;

    const loadQueueSongs = async () => {
      setLoadingQueueSongs(true);
      try {
        const queueEntries = Object.entries(queueObj);
        const songsWithData = await Promise.all(
          queueEntries.map(async ([key, item]) => {
            try {
              const songData = await songsApi.getById(String(item.songId));
              const mapped = songData ? mapToPlayerSong(songData as any) : null;
              return {
                key,
                songId: item.songId,
                suggestedBy: item.suggestedBy,
                suggestedAt: item.suggestedAt,
                songData: mapped ? {
                  id: mapped.id,
                  songName: mapped.songName || "Unknown Song",
                  name: mapped.songName || "Unknown Song",
                  artist: mapped.artist || "",
                  album: mapped.album || "",
                  duration: mapped.duration || 0,
                  cover: mapped.cover || "",
                  audioUrl: (mapped as any).audioUrl,
                } : undefined,
              };
            } catch (e) {
              console.error(`Failed to load song ${item.songId}:`, e);
              return {
                key,
                songId: item.songId,
                suggestedBy: item.suggestedBy,
                suggestedAt: item.suggestedAt,
                songData: undefined,
              };
            }
          })
        );
        // Sắp xếp theo suggestedAt (cũ nhất trước)
        songsWithData.sort((a, b) => a.suggestedAt - b.suggestedAt);
        setQueueSongs(songsWithData);
      } catch (error) {
        console.error("Failed to load queue songs:", error);
      } finally {
        setLoadingQueueSongs(false);
      }
    };

    void loadQueueSongs();
  }, [listeningSession?.queue]);

  const handlePlayFromQueue = useCallback(async (song: Song) => {
    if (!listeningSession) return;
    const isHost = Number(meId) === Number(listeningSession.hostId);
    if (!isHost) {
      toast({
        title: "Chỉ host mới có thể phát bài hát",
        description: "Chỉ người tạo phòng mới có thể phát bài hát từ queue.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
      await playSongWithStreamUrl(song as any, playSong);
      const numericSongId = Number(song.id);
      if (Number.isFinite(numericSongId)) {
        await playlistChatApi.startListening(playlistId, meId, numericSongId, 0, true);
      }
    } catch (e) {
      console.error("Failed to play from queue:", e);
      toast({
        title: "Lỗi phát bài hát",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  }, [listeningSession, meId, playlistId, playSong, toast]);

  const handleGetAISuggestions = useCallback(async () => {
    if (!currentSong || !listeningSession) return;
    
    setIsLoadingSuggestions(true);
    try {
      // Lấy genre và mood từ bài hát hiện tại
      const songIdNum = Number(currentSong.id);
      if (!Number.isFinite(songIdNum)) return;

      const songData = await songsApi.getById(String(songIdNum));
      if (!songData) return;

      const genreIds = songData.genreIds || (songData.genres?.map(g => g.id) || []);
      const moodIds: number[] = []; // Có thể lấy từ songData.moodIds nếu có

      let suggestions: any[] = [];

      // Nếu có genre, lấy recommendations theo genre
      if (genreIds.length > 0 && genreIds[0]) {
        try {
          const genreRecs = await songsApi.recommendByGenre(genreIds[0], 10);
          suggestions = genreRecs.map((s) => mapToPlayerSong(s));
        } catch (e) {
          console.error("Failed to get genre recommendations:", e);
        }
      }

      // Nếu có mood, lấy recommendations theo mood
      if (moodIds.length > 0) {
        try {
          const moodRecs = await songsApi.getRecommendationsByMoods(moodIds, 10);
          const moodMapped = moodRecs.map((s) => mapToPlayerSong(s));
          // Merge và loại bỏ trùng lặp
          const merged = [...suggestions, ...moodMapped];
          const unique = merged.filter((song, index, self) =>
            index === self.findIndex((s) => s.songId === song.songId)
          );
          suggestions = unique;
        } catch (e) {
          console.error("Failed to get mood recommendations:", e);
        }
      }

      // Loại bỏ bài hát hiện tại
      suggestions = suggestions.filter(s => Number(s.songId || s.id) !== songIdNum);

      // Fallback 1: AI picks chung nếu chưa có gợi ý
      if (suggestions.length === 0) {
        try {
          const aiPicks = await songsApi.getAiPicksForYou(30);
          suggestions = aiPicks.map((s) => mapToPlayerSong(s));
        } catch (e) {
          console.error("Failed to get AI picks fallback:", e);
        }
      }

      // Fallback 2: lấy danh sách bài hát public (giống Discover)
      if (suggestions.length === 0) {
        try {
          const anySongs = await songsApi.getAll({ page: 0, size: 30, status: "ACTIVE" });
          const content = Array.isArray((anySongs as any)?.content)
            ? (anySongs as any).content
            : (anySongs as any)?.songs ?? [];
          suggestions = content.map((s: any) => mapToPlayerSong(s));
        } catch (e) {
          console.error("Failed to fallback with public songs:", e);
        }
      }

      if (suggestions.length > 0) {
        setSuggestedSongs(suggestions.slice(0, 10).map(s => ({
          id: String(s.songId || s.id || ""),
          songName: s.songName || s.name || "Unknown Song",
          name: s.songName || s.name || "Unknown Song",
          artist: s.artist || "",
          album: s.album || "",
          duration: s.duration || 0,
          cover: s.cover || "",
          audioUrl: s.audioUrl,
        })));
        setShowSuggestModal(true);
      } else {
        toast({
          title: "Không tìm thấy đề xuất",
          description: "Không có bài hát phù hợp để đề xuất.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
      toast({
        title: "Lỗi lấy đề xuất",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [currentSong, listeningSession, toast]);

  const handleAddSuggestedSong = useCallback(async (song: Song) => {
    if (!listeningSession) return;
    const songIdNum = Number(song.id);
    if (!Number.isFinite(songIdNum)) return;

    try {
      await playlistChatApi.suggestSong(playlistId, meId, songIdNum);
      toast({
        title: "Đã thêm vào queue",
        description: `${song.songName || song.name} đã được thêm vào queue`,
      });
      // Xóa bài hát khỏi danh sách đề xuất
      setSuggestedSongs(prev => prev.filter(s => s.id !== song.id));
    } catch (e) {
      console.error("Failed to add suggested song:", e);
      toast({
        title: "Lỗi thêm bài hát",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  }, [playlistId, meId, listeningSession, toast]);

  const handleStartListening = useCallback(async () => {
    // Nếu chưa có bài hát, hiển thị modal chọn genre/mood
    if (!currentSong) {
      setShowGenreMoodModal(true);
      return;
    }
    const numericSongId = Number(currentSong.id);
    if (!Number.isFinite(numericSongId)) {
      console.warn("[PlaylistChatWindow] Invalid currentSong id for listening session:", currentSong.id);
      return;
    }
    try {
      const posMs = typeof position === "number" && Number.isFinite(position) ? position : 0;
      await playlistChatApi.startListening(playlistId, meId, numericSongId, posMs, true);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to start listening session:", e);
    }
  }, [playlistId, meId, currentSong, position]);

  const handleJoinListening = useCallback(async () => {
    if (!listeningSession) return;
    try {
      await playlistChatApi.joinListening(playlistId, meId);
      manualLeaveRef.current = false;
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to join listening session:", e);
    }
  }, [playlistId, meId, listeningSession]);

  // Reset manual-leave flag when session truly changes (new host/song/update)
  useEffect(() => {
    const key = listeningSession
      ? `${listeningSession.hostId || ""}-${listeningSession.songId || ""}-${listeningSession.updatedAt || ""}`
      : "";
    if (lastSessionKeyRef.current !== key) {
      lastSessionKeyRef.current = key;
      manualLeaveRef.current = false;
    }
  }, [listeningSession]);

  // Tự động join listening session khi có session và user chưa join
  useEffect(() => {
    if (!listeningSession) return;
    if (!listeningSession.hostId) return;
    if (manualLeaveRef.current) return; // User đã rời thủ công, không auto-join lại
    
    const isHost = Number(meId) === Number(listeningSession.hostId);
    if (isHost) return; // Host không cần join

    // Kiểm tra xem đã join chưa
    const hasJoined = listeningSession.participants && listeningSession.participants[String(meId)];
    if (!hasJoined) {
      // Tự động join sau 1 giây (để tránh spam)
      const timer = setTimeout(() => {
        handleJoinListening().catch(err => {
          console.error("[PlaylistChatWindow] Auto-join failed:", err);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [listeningSession, meId, handleJoinListening]);

  const handleLeaveListening = useCallback(async () => {
    if (!listeningSession) return;
    try {
      await playlistChatApi.leaveListening(playlistId, meId);
      manualLeaveRef.current = true; // Đã rời thủ công, không auto-join lại session hiện tại
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to leave listening session:", e);
    }
  }, [playlistId, meId, listeningSession]);

  const handleStopListening = useCallback(async () => {
    if (!listeningSession) return;
    try {
      await playlistChatApi.stopListening(playlistId, meId);
      // Clear local state ngay lập tức để dừng phòng không bị trễ
      setListeningSession(undefined);
      setQueue([]);
      setQueueSongs([]);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to stop listening session:", e);
    }
  }, [playlistId, meId, listeningSession, setQueue]);

  // Nếu đang là host của session, tự broadcast state mới mỗi khi đổi bài / play-pause / position
  useEffect(() => {
    const syncAsHost = async () => {
      if (!listeningSession) return;
      const isHost = Number(meId) === Number(listeningSession.hostId);
      if (!isHost) return;

      if (!currentSong) return;

      const songId = Number(currentSong.id);
      if (!Number.isFinite(songId)) return;

      const currentSongIdInSession = typeof listeningSession.songId === "number"
        ? listeningSession.songId
        : Number(listeningSession.songId || 0);
      const changedSong = !Number.isFinite(currentSongIdInSession) || currentSongIdInSession !== songId;
      const changedPlaying = Boolean(listeningSession.isPlaying) !== Boolean(isPlaying);
      
      // Broadcast position mỗi 1 giây khi đang phát
      const posMs = typeof position === "number" && Number.isFinite(position) ? position : 0;
      const positionChanged = Math.abs((listeningSession.positionMs ?? 0) - posMs) > 1000; // Chỉ update nếu khác > 1s

      if (!changedSong && !changedPlaying && !positionChanged) return;

      try {
        await playlistChatApi.startListening(playlistId, meId, songId, posMs, Boolean(isPlaying));
      } catch (e) {
        console.error("[PlaylistChatWindow] Failed to sync listening state as host:", e);
      }
    };

    void syncAsHost();
  }, [currentSong, isPlaying, listeningSession, meId, playlistId, position]);

  // Broadcast position realtime mỗi 1 giây khi host đang phát
  useEffect(() => {
    if (!listeningSession) return;
    const isHost = Number(meId) === Number(listeningSession.hostId);
    if (!isHost || !isPlaying || !currentSong) return;

    const interval = setInterval(async () => {
      try {
        const songId = Number(currentSong.id);
        if (!Number.isFinite(songId)) return;
        const posMs = typeof position === "number" && Number.isFinite(position) ? position : 0;
        await playlistChatApi.startListening(playlistId, meId, songId, posMs, true);
      } catch (e) {
        console.error("[PlaylistChatWindow] Failed to broadcast position:", e);
      }
    }, 1000); // Broadcast mỗi 1 giây

    return () => clearInterval(interval);
  }, [listeningSession, meId, isPlaying, currentSong, playlistId, position]);

  // Sync player with listening session for non-host participants (realtime)
  useEffect(() => {
    const sync = async () => {
      if (!listeningSession) return;
      if (!listeningSession.hostId || !listeningSession.songId) return;
      const isHost = Number(meId) === Number(listeningSession.hostId);
      if (isHost) return; // Host tự control, không sync

      // Chỉ sync cho user đã join (có trong participants)
      if (!listeningSession.participants || !listeningSession.participants[String(meId)]) {
        return;
      }

      const songId = listeningSession.songId;
      const positionMs = listeningSession.positionMs ?? 0;
      const updatedAt = typeof listeningSession.updatedAt === "number" ? listeningSession.updatedAt : null;
      const drift = updatedAt && targetPlaying ? Math.max(0, Date.now() - updatedAt) : 0;
      const targetPositionMs = positionMs + drift;
      const targetPlaying = Boolean(listeningSession.isPlaying);

      // Load bài hát nếu khác bài hiện tại
      const needLoadSong = !currentSong || Number(currentSong.id) !== Number(songId);
      if (needLoadSong) {
        try {
          const apiSong = await songsApi.getById(String(songId));
          const mapped = mapToPlayerSong(apiSong as unknown as { [key: string]: unknown });
          const songToPlay: Song = {
            id: mapped.id,
            name: mapped.songName,
            songName: mapped.songName,
            artist: mapped.artist,
            album: mapped.album,
            duration: mapped.duration,
            cover: mapped.cover,
            audioUrl: mapped.audioUrl,
          };
          await playSong(songToPlay, true);
          // Sau khi load bài hát mới, đặt vị trí ngay theo host để không bắt đầu từ 0
          if (positionMs > 0) {
            try {
              await updatePosition(positionMs);
            } catch {
              // ignore
            }
          }
        } catch (e) {
          console.error("[PlaylistChatWindow] Failed to sync song for listening session:", e);
          return;
        }
      }

      // Sync position realtime (chỉ khi đã có bài hát và khác biệt > 1 giây)
      // Sử dụng threshold lớn hơn để tránh sync liên tục khi đang phát
      // Với participant đã có bài hát, vẫn sync vị trí nếu lệch > 1s
      if (currentSong && Math.abs(position - targetPositionMs) > 800) {
        try {
          await updatePosition(targetPositionMs);
        } catch {
          // ignore
        }
      }

      // Sync play/pause state
      if (targetPlaying !== isPlaying) {
        try {
          if (targetPlaying && !isPlaying) {
            // Host đang play, participant phải play
            if (currentSong) {
              await playSong(currentSong, true);
            }
          } else if (!targetPlaying && isPlaying) {
            // Host đã pause, participant phải pause
            if (togglePlay) {
              await togglePlay();
            }
          }
        } catch (e) {
          console.error("[PlaylistChatWindow] Failed to adjust playing state:", e);
        }
      }
    };

    void sync();
  }, [listeningSession, meId, currentSong, isPlaying, playSong, updatePosition, position, togglePlay]);

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Typing indicator handlers
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Start typing indicator
    if (e.target.value.trim()) {
      chatApi.typingStart(roomId, meId).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        chatApi.typingStop(roomId, meId).catch(() => {});
      }, 3000);
    } else {
      chatApi.typingStop(roomId, meId).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [roomId, meId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        chatApi.typingStop(roomId, meId).catch(() => {});
      }
    };
  }, [roomId, meId]);

  const renderMessage = (msg: FirebaseMessage, index: number) => {
    const isMe = Number(msg.senderId) === Number(meId);
    const raw = (msg as unknown) as { type?: string; sharedContentType?: string; sharedContent?: unknown };
    const rawType = raw.type ?? raw.sharedContentType ?? "text";
    const type = typeof rawType === "string" ? rawType.toLowerCase() : "text";
    const content = msg.contentPlain ?? msg.content ?? "";
    const shared = (raw.sharedContent ?? null) as
      | {
          type?: string;
          id?: number;
          playlist?: unknown;
          album?: unknown;
          song?: unknown;
          title?: string;
          coverUrl?: string | null;
        }
      | null;

    if (type === "system") {
      return (
        <div key={msg.id ?? index} className="flex justify-center my-3">
          <span className="px-3 py-1.5 text-[12px] text-muted-foreground bg-muted/30 dark:bg-muted/20 rounded-full">
            {content}
          </span>
        </div>
      );
    }

    if (shared?.type === "PLAYLIST") {
      return (
        <div key={msg.id ?? index} className="my-1 flex">
          <SharedPlaylistCard
            playlist={shared.playlist ?? shared}
            _link={shared.id ? `/playlist/${shared.id}` : undefined}
            isSentByMe={isMe}
          />
        </div>
      );
    }

    if (shared?.type === "ALBUM") {
      return (
        <div key={msg.id ?? index} className="my-1 flex">
          <SharedAlbumCard
            album={shared.album ?? shared}
            _link={shared.id ? `/album/${shared.id}` : undefined}
            isSentByMe={isMe}
          />
        </div>
      );
    }

    if (shared?.type === "SONG") {
      const songData = (shared.song ?? shared) as {
        id?: number;
        title?: string;
        name?: string;
        coverUrl?: string | null;
        audioUrl?: string | null;
        artists?: string[] | Array<string | { name?: string }>;
      };
      const handlePlay = () => {
        const fakeSong: Song = {
          id: String(songData.id ?? ""),
          songName: songData.title ?? songData.name ?? "Unknown Song",
          name: songData.title ?? songData.name ?? "Unknown Song",
          artist: "",
          album: "",
          duration: 0,
          cover: songData.coverUrl ?? "",
          audioUrl: songData.audioUrl ?? undefined,
          url: undefined,
          audio: undefined,
          genre: undefined,
          plays: undefined,
          uuid: undefined,
        };
        playSong(fakeSong);
      };
      return (
        <div key={msg.id ?? index} className="my-1 flex">
          <SharedSongCard
            song={songData}
            _link={songData.id ? `/song/${songData.id}` : undefined}
            isSentByMe={isMe}
            onPlay={handlePlay}
          />
        </div>
      );
    }

    const bubbleCls = isMe
      ? "bg-primary text-primary-foreground rounded-tr-sm border border-primary/40"
      : "bg-muted/60 text-foreground rounded-tl-sm border border-muted/40";

    const displayName =
      isMe
        ? "You"
        : msg.senderName && msg.senderName.trim().length > 0
        ? msg.senderName
        : `User ${msg.senderId}`;

    const avatarUrl = msg.senderAvatar || undefined;
    const timestampMs =
      typeof msg.sentAt === "number" && Number.isFinite(msg.sentAt)
        ? msg.sentAt
        : Date.now();
    const timestampLabel = new Date(timestampMs).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return (
      <div
        key={msg.id ?? index}
        className={`group flex items-end gap-2 my-1 ${isMe ? "justify-end" : "justify-start"}`}
      >
        {!isMe && (
          <Avatar className="w-8 h-8 flex-shrink-0 self-start">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div className="max-w-[80%] sm:max-w-lg space-y-0.5">
          {/* Tên người gửi: chỉ hiện khi hover, giống logic timestamp trong MessageCard */}
          {!isMe && (
            <div className="text-[11px] font-medium text-muted-foreground/80 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {displayName}
            </div>
          )}
          <div className={`px-4 py-2 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed ${bubbleCls} relative group/message`}>
            {content}
            {/* Reactions */}
            {msg.id && reactions[String(msg.id)] && Object.keys(reactions[String(msg.id)]).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(reactions[String(msg.id)]).map(([userIdStr, reaction]) => (
                  <span
                    key={userIdStr}
                    className="text-xs bg-background/80 px-1.5 py-0.5 rounded-full border border-border/60"
                    title={`${Number(userIdStr) === Number(meId) ? "Bạn" : `User ${userIdStr}`}: ${reaction.emoji}`}
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}
            {/* Reaction button (hover) */}
            {msg.id && onReact && (
              <button
                type="button"
                className="absolute -bottom-1 right-1 opacity-0 group-hover/message:opacity-100 transition-opacity w-6 h-6 rounded-full bg-background/90 border border-border/60 flex items-center justify-center hover:bg-background"
                onClick={() => {
                  const messageIdNum = typeof msg.id === "string" ? Number(msg.id) : (typeof msg.id === "number" ? msg.id : 0);
                  if (messageIdNum > 0) {
                    onReact(messageIdNum, "👍");
                  }
                }}
                title="Thêm reaction"
              >
                <span className="text-xs">👍</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {timestampLabel}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Modal chọn Genre/Mood */}
      <Dialog open={showGenreMoodModal} onOpenChange={setShowGenreMoodModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Chọn Genre & Mood để tạo playlist
            </DialogTitle>
            <DialogDescription>
              Chọn genre và/hoặc mood để hệ thống đề xuất danh sách nhạc phù hợp cho phòng nghe chung
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Mục tiêu nghe (Listening Goals) */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Mục tiêu nghe
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3 mb-4">
                {listeningGoals.map((goal) => {
                  const isSelected = selectedListeningGoal === goal.id;
                  return (
                    <Card
                      key={goal.id}
                      className={`group cursor-pointer transition-all duration-300 hover:scale-105 ${
                        isSelected
                          ? "bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary shadow-lg shadow-primary/20"
                          : "bg-muted/50 hover:bg-muted border"
                      }`}
                      onClick={() => setSelectedListeningGoal(isSelected ? null : goal.id)}
                    >
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <div className={`text-3xl ${isSelected ? "scale-110" : ""} transition-transform`}>
                          {goal.icon}
                        </div>
                        <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {goal.label}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Hiển thị gợi ý dựa trên lịch sử nghe */}
              {isLoadingOverview ? (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              ) : userOverview && (userOverview.genres.length > 0 || userOverview.moods.length > 0) && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Dựa trên lịch sử nghe của bạn
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {userOverview.moods.slice(0, 3).map((mood) => (
                      <span
                        key={mood.id}
                        className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30"
                      >
                        {mood.name} ({Math.round(mood.percentage)}%)
                      </span>
                    ))}
                    {userOverview.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre.id}
                        className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border"
                      >
                        {genre.name} ({Math.round(genre.percentage)}%)
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Hệ thống sẽ đề xuất bài hát dựa trên sở thích của bạn
                  </p>
                </div>
              )}
            </div>

            {/* Genre Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                Music Genres
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availableGenres.length === 0 ? (
                  [...Array(10)].map((_, idx) => (
                    <Card key={idx} className="bg-muted/50 border animate-pulse">
                      <CardContent className="p-3 h-20" />
                    </Card>
                  ))
                ) : (
                  availableGenres.map((genre) => {
                    const isSelected = selectedGenreIds.includes(genre.id);
                    return (
                      <Card
                        key={genre.id}
                        className={`group cursor-pointer transition-all duration-300 hover:scale-105 ${
                          isSelected
                            ? "bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary shadow-lg shadow-primary/20"
                            : "bg-muted/50 hover:bg-muted border"
                        }`}
                        onClick={() => handleToggleGenre(genre.id)}
                      >
                        <CardContent className="p-3 flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? "bg-primary/20"
                              : "bg-muted group-hover:bg-muted/80"
                          } transition-colors`}>
                            {(() => {
                              const preset = GENRE_ICON_OPTIONS.find((opt) => opt.value === genre.iconUrl);
                              if (preset) {
                                const IconComp = preset.icon;
                                return (
                                  <IconComp className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                );
                              }
                              if (isRemoteIcon(genre.iconUrl)) {
                                return (
                                  <img
                                    src={genre.iconUrl}
                                    alt={genre.name}
                                    className="w-8 h-8 object-cover rounded-lg"
                                  />
                                );
                              }
                              return <Music className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />;
                            })()}
                          </div>
                          <p className={`text-xs font-semibold truncate w-full text-center ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}>
                            {genre.name}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Mood Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Moods & Emotions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availableMoods.length === 0 ? (
                  [...Array(10)].map((_, idx) => (
                    <Card key={idx} className="bg-muted/50 border animate-pulse">
                      <CardContent className="p-3 h-24" />
                    </Card>
                  ))
                ) : (
                  availableMoods.map((mood) => {
                    const isSelected = selectedMoodIds.includes(mood.id);
                    const MoodIcon = getMoodIcon(mood.name, mood.tone);
                    const toneColors = {
                      positive: {
                        bg: "from-emerald-500/30 to-teal-500/10",
                        border: "border-emerald-400/40",
                        iconBg: "bg-emerald-500/20",
                        iconColor: "text-emerald-300",
                      },
                      negative: {
                        bg: "from-rose-500/30 to-pink-500/10",
                        border: "border-rose-400/40",
                        iconBg: "bg-rose-500/20",
                        iconColor: "text-rose-300",
                      },
                      neutral: {
                        bg: "from-blue-500/30 to-cyan-500/10",
                        border: "border-blue-400/40",
                        iconBg: "bg-blue-500/20",
                        iconColor: "text-blue-300",
                      }
                    };
                    const colors = toneColors[mood.tone];
                    
                    return (
                      <Card
                        key={mood.id}
                        className={`group cursor-pointer transition-all duration-300 hover:scale-105 ${
                          isSelected
                            ? `bg-gradient-to-br ${colors.bg} border-2 ${colors.border} shadow-lg`
                            : "bg-muted/50 hover:bg-muted border"
                        }`}
                        onClick={() => handleToggleMood(mood.id)}
                      >
                        <CardContent className="p-3 flex flex-col items-center gap-2">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isSelected ? colors.iconBg : "bg-muted group-hover:bg-muted/80"
                          } transition-colors`}>
                            {(() => {
                              const preset = MOOD_ICON_OPTIONS.find((opt) => opt.value === mood.iconUrl);
                              if (preset) {
                                const IconComp = preset.icon;
                                return (
                                  <IconComp className={`w-6 h-6 ${isSelected ? colors.iconColor : "text-muted-foreground"}`} />
                                );
                              }
                              if (isRemoteIcon(mood.iconUrl)) {
                                return (
                                  <img
                                    src={mood.iconUrl}
                                    alt={mood.name}
                                    className="w-8 h-8 object-cover rounded-lg"
                                  />
                                );
                              }
                              return <MoodIcon className={`w-6 h-6 ${isSelected ? colors.iconColor : "text-muted-foreground"}`} />;
                            })()}
                          </div>
                          <div className="text-center w-full">
                            <p className={`text-xs font-semibold truncate ${
                              isSelected ? colors.iconColor : "text-foreground"
                            }`}>
                              {mood.name}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenreMoodModal(false)}
              disabled={isLoadingRecommendations}
            >
              Hủy
            </Button>
            <Button
              onClick={handleStartListeningWithGenreMood}
              disabled={isLoadingRecommendations}
              className="gap-2"
            >
              {isLoadingRecommendations ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo playlist...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Tạo playlist và bắt đầu nghe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal đề xuất bài hát AI */}
      <Dialog open={showSuggestModal} onOpenChange={setShowSuggestModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Đề xuất bài hát AI
            </DialogTitle>
            <DialogDescription>
              Các bài hát được đề xuất dựa trên bài hát hiện tại. Chọn bài hát để thêm vào queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {suggestedSongs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không có đề xuất nào</p>
            ) : (
              suggestedSongs.map((song) => (
                <Card
                  key={song.id}
                  className="group cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {song.cover ? (
                        <img src={song.cover} alt={song.songName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{song.songName || song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist || "Unknown Artist"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSuggestedSong(song)}
                      className="flex-shrink-0"
                    >
                      Thêm vào queue
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestModal(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="fixed bottom-28 right-24 z-50 w-full max-w-md">
      <Card className="bg-background/95 border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[480px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 via-background to-background">
          <Avatar className="h-9 w-9">
            {coverUrl ? (
              <AvatarImage src={coverUrl || undefined} alt={playlistName} />
            ) : (
              <AvatarFallback>
                <Music className="w-4 h-4" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{playlistName}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Collab room
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Owner: {ownerName} · {memberCount} collaborator{memberCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* Nút tạo/dừng phòng nghe chung (chỉ host) */}
            {(!listeningSession || Number(listeningSession.hostId) === Number(meId)) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  // Nếu chưa có session, luôn mở modal chọn genre/mood
                  if (!listeningSession) {
                    setShowGenreMoodModal(true);
                  } else {
                    // Nếu đã có session, gọi handleStartListening để sync
                    handleStartListening();
                  }
                }}
                title={
                  listeningSession
                    ? "Đồng bộ phòng nghe nhạc chung"
                    : "Bắt đầu phòng nghe nhạc chung - Chọn genre/mood"
                }
              >
                <Radio className="w-4 h-4" />
              </Button>
            )}
            {/* Nút đề xuất bài hát hiện tại (chỉ participants) */}
            {listeningSession && Number(listeningSession.hostId) !== Number(meId) && currentSong && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSuggestCurrentSong}
                title="Đề xuất bài hát này vào queue"
                disabled={sending}
              >
                <Music className="w-4 h-4" />
              </Button>
            )}
            {/* Nút đề xuất bài hát AI (mọi người khi đang có session) */}
            {listeningSession && currentSong && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleGetAISuggestions}
                title="Đề xuất bài hát AI dựa trên bài hiện tại"
                disabled={isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            )}
            {listeningSession && listeningSession.hostId && Number(listeningSession.hostId) !== Number(meId) && (
              listeningSession.participants && listeningSession.participants[String(meId)] ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={handleLeaveListening}
                >
                  Rời phòng
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={handleJoinListening}
                >
                  Tham gia nghe chung
                </Button>
              )
            )}
            {listeningSession && listeningSession.hostId && Number(listeningSession.hostId) === Number(meId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={handleStopListening}
              >
                Tắt phòng
              </Button>
            )}
            {listeningSession && (
              <span className="ml-1 text-[10px] text-muted-foreground/80 hidden sm:inline">
                Đang nghe chung
                {listeningSession.participants
                  ? ` • ${Object.keys(listeningSession.participants).length} người`
                  : ""}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Queue Section - Danh sách bài hát realtime (giống Discover) */}
        {listeningSession && (
          <div className="border-b border-border bg-muted/20">
            <div className="px-3 py-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  Danh sách phát ({queueSongs.length} bài)
                </h4>
                {queueSongs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {listeningSession.participants ? `${Object.keys(listeningSession.participants).length + 1} người đang nghe` : "1 người đang nghe"}
                  </span>
                )}
              </div>
            </div>
            
            <div className="max-h-32 overflow-y-auto">
              {loadingQueueSongs ? (
                <div className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-primary" />
                  <span className="text-sm text-muted-foreground">Đang tải danh sách...</span>
                </div>
              ) : queueSongs.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Music className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Chưa có bài hát trong queue</p>
                  <p className="text-xs text-muted-foreground/70">Đề xuất bài hát để thêm vào danh sách phát</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {queueSongs.map((item, index) => {
                    if (!item.songData) return null;
                    const isHost = Number(meId) === Number(listeningSession.hostId);
                    const isCurrent = currentSong && Number(currentSong.id) === item.songId;
                    return (
                      <div
                        key={`${item.key}-${item.suggestedAt}-${index}`}
                        className={`group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors ${
                          isCurrent ? "bg-primary/10 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        {/* Số thứ tự */}
                        <div className="w-6 flex-shrink-0 text-center">
                          {isCurrent ? (
                            <div className="w-4 h-4 mx-auto">
                              <div className="w-4 h-4 border-2 border-primary rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{index + 1}</span>
                          )}
                        </div>

                        {/* Cover */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.songData.cover ? (
                            <img 
                              src={item.songData.cover} 
                              alt={item.songData.songName} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Thông tin bài hát */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate text-sm ${isCurrent ? "text-primary" : "text-foreground"}`}>
                            {item.songData.songName || item.songData.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.songData.artist || "Unknown Artist"}
                          </p>
                          {item.suggestedBy !== Number(meId) && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              Đề xuất bởi User {item.suggestedBy}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isHost && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handlePlayFromQueue(item.songData!)}
                                disabled={isCurrent}
                                title="Phát bài này"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={async () => {
                                  try {
                                    await playlistChatApi.removeFromQueue(playlistId, item.songId);
                                    toast({
                                      title: "Đã xóa khỏi queue",
                                      description: `${item.songData.songName} đã được xóa khỏi danh sách`,
                                    });
                                  } catch (e) {
                                    console.error("Failed to remove from queue:", e);
                                    toast({
                                      title: "Lỗi xóa bài hát",
                                      description: "Vui lòng thử lại sau.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                title="Xóa khỏi queue"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {!isHost && (
                            <span className="text-[10px] text-muted-foreground/70">
                              {isCurrent ? "Đang phát" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-gradient-to-b from-background via-background/95 to-background"
        >
          {messages.map((m, idx) => renderMessage(m, idx))}
          <div ref={messagesEndRef} className="h-0 w-full shrink-0" />
        </div>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && Object.values(typingUsers).some(Boolean) && (
          <div className="px-3 py-2 border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '0ms' }} />
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '200ms' }} />
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-primary font-medium">
                {Object.entries(typingUsers)
                  .filter(([_, isTyping]) => isTyping)
                  .map(([userId]) => {
                    const msg = messages.find(m => Number(m.senderId) === Number(userId));
                    return msg?.senderName || `User ${userId}`;
                  })
                  .join(", ")} đang nhập...
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-2 bg-background/95">
          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn gì đó về playlist này…"
            className="text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <SendHorizonal className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
};


