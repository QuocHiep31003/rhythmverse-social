import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Bell,
  MessageCircle,
  Settings,
  LogOut,
  User,
  Search,
  Paperclip,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Loader2,
  Upload,
  ChevronDown,
  Music,
  Crown,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

import { arcApi, authApi } from "@/services/api";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";
import {
  watchNotifications,
  NotificationDTO,
} from "@/services/firebase/notifications";

import {
  premiumSubscriptionApi,
  PremiumSubscriptionDTO,
} from "@/services/api/premiumSubscriptionApi";

import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";

const TopBar = () => {
  const [searchText, setSearchText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");

  const [inviteCount, setInviteCount] = useState<number>(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);

  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profileAvatar, setProfileAvatar] = useState<string>("");

  const [profileIsPremium, setProfileIsPremium] = useState<boolean>(false);
  const [profilePlanLabel, setProfilePlanLabel] = useState<string>("");

  const [notifOpen, setNotifOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Feature limit hook for AI Search
  const { canUse, remaining, isPremium, useFeature, isLoading: isCheckingLimit } = useFeatureLimit({
    featureName: FeatureName.AI_SEARCH,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined"
        ? !!localStorage.getItem("token")
        : false;
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioBlob(file);
      setError("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setError("");

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRecognize = async () => {
    if (!audioBlob) {
      setError("Please record or upload an audio file first.");
      return;
    }

    // Check feature limit - only show modal if not premium and hết lượt
    if (!isPremium && remaining === 0) {
      setShowLimitModal(true);
      return;
    }

    setIsRecognizing(true);
    setError("");

    try {
      // Use feature (increment usage count) - only if not premium
      if (!isPremium) {
        const success = await useFeature();
        if (!success) {
          setShowLimitModal(true);
          setIsRecognizing(false);
          return;
        }
      }

      const result = await arcApi.recognizeMusic(audioBlob);
      navigate("/music-recognition-result", {
        state: {
          result,
          audioUrl,
        },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to recognize music. Please try again.";
      setError(errorMessage);
    } finally {
      setIsRecognizing(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setIsPlaying(false);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /** ================= LOAD USER PROFILE + PREMIUM ================= **/
  useEffect(() => {
    const loadMe = async () => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const me = await authApi.me();
        if (me) {
          setIsAuthenticated(true);
          setProfileName(me?.name || me?.username || "");
          setProfileEmail(me?.email || "");
          setProfileAvatar(me?.avatar || "");

          let isPremiumFromUser =
            (me as any)?.isPremium ??
            (me as any)?.premium ??
            me?.roleName?.toUpperCase() === "PREMIUM";

          setProfileIsPremium(Boolean(isPremiumFromUser));

          try {
            const subscription: PremiumSubscriptionDTO | null =
              me?.id != null
                ? await premiumSubscriptionApi.getMySubscription(me.id)
                : null;

            if (subscription) {
              const status =
                subscription.status ||
                subscription.subscriptionStatus ||
                "";
              const normalizedStatus = status.toUpperCase();

              const active =
                normalizedStatus === "ACTIVE" ||
                normalizedStatus === "TRIALING" ||
                subscription?.isActive ||
                subscription?.active;

              if (active) {
                setProfileIsPremium(true);
                let rawPlanLabel =
                  subscription.planName ||
                    subscription.planCode ||
                    (me as any)?.plan ||
                    "Premium";
                
                // Convert Vietnamese plan names to English
                const planLabel = rawPlanLabel
                  ?.replace(/Premium\s*1\s*tháng/gi, "Premium Monthly")
                  ?.replace(/Premium\s*3\s*tháng/gi, "Premium Quarterly")
                  ?.replace(/Premium\s*1\s*năm/gi, "Premium Yearly")
                  ?.replace(/Premium\s*tháng/gi, "Premium Monthly")
                  ?.replace(/Premium\s*năm/gi, "Premium Yearly")
                  || "Premium";
                
                setProfilePlanLabel(planLabel);
              }
            }
          } catch (e) {
            console.warn("Failed to load premium subscription", e);
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setIsAuthenticated(false);
      }
    };
    loadMe();
  }, []);

  /** ================= LOAD COLLAB INVITES ================= **/
  useEffect(() => {
    const loadInvites = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setInviteCount(0);
          return;
        }
        const list = await playlistCollabInvitesApi.pending();
        setInviteCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setInviteCount(0);
      }
    };

    loadInvites();
    const interval = setInterval(loadInvites, 30000);

    return () => clearInterval(interval);
  }, []);

  /** ================= FIREBASE NOTIFS ================= **/
  useEffect(() => {
    const raw = localStorage.getItem("userId");
    const userId = raw ? Number(raw) : null;
    if (!userId) return;

    const unsubscribe = watchNotifications(
      userId,
      (notifications: NotificationDTO[]) => {
        const unreadMsg = notifications.filter(
          (n) => n.type === "MESSAGE" && !n.read
        ).length;
        const unreadAlert = notifications.filter(
          (n) => n.type !== "MESSAGE" && !n.read
        ).length;

        setUnreadMsgCount(unreadMsg);
        setUnreadAlertCount(unreadAlert);
      }
    );

    return () => unsubscribe();
  }, []);

  /** ================= LOGOUT ================= **/
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();

    setIsAuthenticated(false);
    setProfileName("");
    setProfileEmail("");
    setProfileAvatar("");
    setProfileIsPremium(false);

    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center justify-between px-4 gap-4 relative">
        {/* Search */}
        <div className="flex-1 max-w-lg relative z-10">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search songs, artists..."
                className="pl-10"
              />
            </div>

            <Button type="submit" className="px-4">
              <Search className="h-4 w-4" />
            </Button>

            {/* Music Recognition */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Music className="h-4 w-4 mr-2" />
                  Music Recognition
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-80" align="end">
                <div className="p-3 space-y-3">
                  {/* Upload */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Upload Audio File
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {/* Record */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Mic className="h-4 w-4" />
                      <span className="text-sm font-medium">Record Audio</span>
                    </div>
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      className="w-full justify-start"
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-4 w-4 mr-2" /> Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" /> Start Recording
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Preview */}
                  {audioBlob && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex gap-2">
                        <Music className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Audio Preview
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isPlaying ? (
                          <Button
                            onClick={playAudio}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseAudio}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}

                        <span className="text-xs flex-1 text-muted-foreground">
                          Audio ready
                        </span>

                        <Button
                          onClick={clearAudio}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>

                      <Button
                        onClick={handleRecognize}
                        disabled={isRecognizing || isCheckingLimit || (!isPremium && remaining === 0)}
                        className="w-full"
                      >
                        {isRecognizing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Recognizing...
                          </>
                        ) : isCheckingLimit ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Recognize Music
                            {!isPremium && remaining === 0 && (
                              <span className="ml-2 text-xs opacity-75">(Premium only)</span>
                            )}
                          </>
                        )}
                      </Button>

                      {error && (
                        <p className="text-xs text-red-500">{error}</p>
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </form>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 relative z-10">
          {/* Notifications */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadAlertCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 py-0 text-[10px]">
                    {unreadAlertCount > 99 ? "99+" : unreadAlertCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <NotificationsDropdown onClose={() => setNotifOpen(false)} />
          </DropdownMenu>

          {/* Messages */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/social?tab=chat")}
          >
            <MessageCircle className="h-5 w-5" />
            {unreadMsgCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 py-0 text-[10px]">
                {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
              </Badge>
            )}
          </Button>

          {/* Premium */}
          {profileIsPremium ? (
            <Badge className="gap-1 bg-primary text-white">
              <Crown className="h-3.5 w-3.5" />
              {profilePlanLabel || "Premium"}
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary"
              onClick={() => navigate("/premium")}
            >
              Khám phá Premium
            </Button>
          )}

          {/* Account */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profileAvatar || "/placeholder.svg"}
                      alt="User"
                    />
                    <AvatarFallback>
                      {(() => {
                        const base =
                          profileName ||
                          (profileEmail ? profileEmail.split("@")[0] : "U");
                        const parts = base.split(" ");
                        const initials =
                          parts.length >= 2
                            ? parts[0][0] + parts[1][0]
                            : base[0];
                        return initials.toUpperCase();
                      })()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center gap-2 p-2">
                  <div>
                    <p className="font-medium">{profileName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profileEmail}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="h-4 w-4 mr-2" /> Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/login")}>Login</Button>
          )}
        </div>
      </div>

      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.AI_SEARCH}
        featureDisplayName="AI Search"
        remaining={remaining}
        limit={0}
        isPremium={isPremium}
      />
    </header>
  );
};

export default TopBar;
