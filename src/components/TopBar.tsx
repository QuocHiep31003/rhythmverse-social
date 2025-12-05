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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { stopTokenRefreshInterval, clearTokens, getAuthToken } from "@/services/api/config";

import { Badge } from "@/components/ui/badge";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

import { arcApi, authApi } from "@/services/api";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";
import {
  watchNotifications,
  NotificationDTO,
} from "@/services/firebase/notifications";
import { markNotificationsAsRead } from "@/services/api/notificationsApi";
import { CHAT_TAB_OPENED_EVENT } from "@/utils/chatEvents";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { watchAllRoomUnreadCounts } from "@/services/firebase/chat";
import { chatApi } from "@/services/api/chatApi";

import {
  premiumSubscriptionApi,
  PremiumSubscriptionDTO,
} from "@/services/api/premiumSubscriptionApi";

import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureLimitType, FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";
import PremiumExpiringModal from "@/components/PremiumExpiringModal";

const cleanPlanLabel = (label?: string | null) =>
  label ? label.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim() : "";

const resolvePlanLabel = (planName?: string | null, planCode?: string | null) => {
  const cleaned = cleanPlanLabel(planName);
  // Show the actual plan name if available; fall back to plan code, then generic label
  return cleaned || planCode || "Premium";
};

const TopBar = () => {
  const [searchText, setSearchText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");
  const [showRecordingDialog, setShowRecordingDialog] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [inviteCount, setInviteCount] = useState<number>(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);
  const [messageNotifications, setMessageNotifications] = useState<NotificationDTO[]>([]);
  const [alertNotifications, setAlertNotifications] = useState<NotificationDTO[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profileAvatar, setProfileAvatar] = useState<string>("");

  const [profileIsPremium, setProfileIsPremium] = useState<boolean>(false);
  const [profilePlanLabel, setProfilePlanLabel] = useState<string>("");
  const [currentSubscription, setCurrentSubscription] = useState<PremiumSubscriptionDTO | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPremiumExpiringModal, setShowPremiumExpiringModal] = useState(false);

  // Feature limit hook for AI Search
  const {
    canUse,
    remaining,
    limit,
    limitType,
    checkUsage,
    isLoading: isCheckingLimit,
  } = useFeatureLimit({
    featureName: FeatureName.AI_SEARCH,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" ? !!getAuthToken() : false;
    } catch {
      return false;
    }
  });

  // Firebase authentication state
  const { firebaseReady } = useFirebaseAuth(currentUserId);

  const navigate = useNavigate();
  const location = useLocation();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Check nếu đang ở social/chat page - không tăng unread count
  const isOnSocialPage = location.pathname === '/social' || location.pathname.startsWith('/social');

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
      setShowRecordingDialog(true);
      setRecordingTime(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setError("");

        stream.getTracks().forEach((track) => track.stop());

        // Auto recognize after stopping
        if (blob) {
          await handleRecognizeFromDialog(blob, url);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
      setShowRecordingDialog(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleRecognizeFromDialog = async (blob: Blob, url: string) => {
    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    setIsRecognizing(true);
    setError("");

    try {
      const result = await arcApi.recognizeMusic(blob);
      await checkUsage();
      navigate("/music-recognition-result", {
        state: {
          result,
          audioUrl: url,
        },
      });
      setShowRecordingDialog(false);
      setAudioBlob(null);
      setAudioUrl("");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || err?.message?.toLowerCase?.().includes("limit")) {
        setShowLimitModal(true);
        await checkUsage();
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to recognize music. Please try again.";
        setError(errorMessage);
      }
    } finally {
      setIsRecognizing(false);
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

    // Check feature limit - dùng canUse từ backend (backend đã xử lý tất cả logic)
    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    setIsRecognizing(true);
    setError("");

    try {
      const result = await arcApi.recognizeMusic(audioBlob);
      await checkUsage();
      navigate("/music-recognition-result", {
        state: {
          result,
          audioUrl,
        },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || err?.message?.toLowerCase?.().includes("limit")) {
        setShowLimitModal(true);
        await checkUsage();
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to recognize music. Please try again.";
        setError(errorMessage);
      }
    } finally {
      setIsRecognizing(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setIsPlaying(false);
    setError("");
    setShowRecordingDialog(false);
    setRecordingTime(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /** ================= LOAD USER PROFILE + PREMIUM ================= **/
  useEffect(() => {
    const loadMe = async (isNewLogin: boolean = false) => {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setProfileName("");
        setProfileEmail("");
        setProfileAvatar("");
        setProfileIsPremium(false);
        setProfilePlanLabel("Free");
        return;
      }

      try {
        const me = await authApi.me();
        if (me) {
          setIsAuthenticated(true);
          if (typeof me?.id === "number") {
            setCurrentUserId(me.id);
          }
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

            setCurrentSubscription(subscription);

            if (subscription) {
              const status =
                subscription.status ||
                subscription.subscriptionStatus ||
                "";
              const normalizedStatus = status.toUpperCase();

              const endDateString =
                subscription.expiresAt ||
                subscription.endDate ||
                subscription.currentPeriodEnd ||
                null;

              let isExpired = false;
              if (endDateString) {
                const end = new Date(endDateString);
                if (!Number.isNaN(end.getTime())) {
                  isExpired = end.getTime() < Date.now();
                }
              }

              // Treat SUCCESS/PAID as active to show plan label for freshly purchased users
              const activeByStatus =
                normalizedStatus === "ACTIVE" ||
                normalizedStatus === "TRIALING" ||
                normalizedStatus === "SUCCESS" ||
                normalizedStatus === "PAID" ||
                subscription?.isActive ||
                subscription?.active;

              const active = activeByStatus && !isExpired;

              if (active) {
                setProfileIsPremium(true);
                const planLabel = resolvePlanLabel(
                  subscription.planName || (me as any)?.plan,
                  subscription.planCode
                );
                setProfilePlanLabel(planLabel);

                // Check if premium expires within 1 day
                if (endDateString) {
                  const expirationDate = new Date(endDateString);
                  const now = new Date();
                  const diffTime = expirationDate.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  // Show modal if expires within 1 day (0 or 1 day remaining)
                  if (diffDays >= 0 && diffDays <= 1) {
                    const today = new Date().toDateString(); // Get date string (e.g., "Mon Jan 01 2024")
                    const sessionKey = `premiumExpiringModal_shown_${me.id}_${today}`;
                    const alreadyShownToday = sessionStorage.getItem(sessionKey);

                    // Show modal if:
                    // 1. New login → always show
                    // 2. Reload → show once per day (not just once per session)
                    if (isNewLogin || !alreadyShownToday) {
                      setShowPremiumExpiringModal(true);
                      sessionStorage.setItem(sessionKey, "true");
                    }
                  }
                }
              } else if (isExpired) {
                // Force downgrade on FE when subscription is expired by time
                setProfileIsPremium(false);
                setProfilePlanLabel("Free");
              } else {
                // Cancelled or inactive: revert to base plan label
                setProfileIsPremium(false);
                setProfilePlanLabel("Free");
              }
            }
          } catch (e) {
            console.warn("Failed to load premium subscription", e);
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
    };

    // Initial load (reload) - not a new login
    loadMe(false);

    // Listen for storage changes (when user logs in/out in another tab or same tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'adminToken' || e.key === 'refreshToken' || e.key === 'adminRefreshToken') {
        console.log('[TopBar] Token storage changed, reloading profile...');
        // If token was added (new value exists, old value was null) → it's a login
        const isNewLogin = e.newValue !== null && (e.oldValue === null || e.oldValue === '');
        loadMe(isNewLogin);
      }
    };

    // Also listen for custom event (when login happens in same tab)
    const handleTokenUpdate = () => {
      console.log('[TopBar] Token updated event received, reloading profile...');
      // tokenUpdated event means new login
      loadMe(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenUpdated', handleTokenUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, []);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  /** ================= LOAD COLLAB INVITES ================= **/
  useEffect(() => {
    const loadInvites = async () => {
      try {
        const token = getAuthToken();
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
    if (!currentUserId) return;

    const unsubscribe = watchNotifications(
      currentUserId,
      (notifications: NotificationDTO[]) => {
        const messageNotifs = notifications.filter((n) => n.type === "MESSAGE");
        const alertNotifs = notifications.filter((n) => n.type !== "MESSAGE");
        setMessageNotifications(messageNotifs);
        setAlertNotifications(alertNotifs);
        // Note: unreadMsgCount is now managed by Firebase rooms listener below
        // Only count notification unread here, not chat message unread
        setUnreadAlertCount(alertNotifs.filter((n) => n.read !== true).length);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  /** ================= FIREBASE CHAT UNREAD COUNTS ================= **/
  // Load initial unread count from API
  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const loadInitialUnreadCount = async () => {
      try {
        const data = await chatApi.getUnreadCounts(currentUserId);
        if (!cancelled) {
          console.log('[TopBar] Loaded initial unread count from API:', data.totalUnread);
          setUnreadMsgCount(data.totalUnread);
        }
      } catch (error) {
        console.warn('[TopBar] Failed to load initial unread count from API:', error);
        // Fallback: set 0, Firebase listener will update
        if (!cancelled) {
          setUnreadMsgCount(0);
        }
      }
    };

    void loadInitialUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  // Listen Firebase realtime unread counts (with API polling fallback)
  useEffect(() => {
    if (!currentUserId || !firebaseReady) return;

    console.log('[TopBar] Setting up Firebase chat unread counts listener for user:', currentUserId);

    // ✅ Track Firebase realtime activity - nếu có update thì không cần poll
    let lastFirebaseUpdateRef = Date.now();
    let pollInterval: number | null = null;

    const unsubscribe = watchAllRoomUnreadCounts(
      currentUserId,
      (unreadCounts, totalUnread) => {
        lastFirebaseUpdateRef = Date.now(); // ✅ Mark Firebase đang hoạt động

        // ✅ Nếu đang ở social page → không cập nhật unread count (để tránh tăng khi đang xem)
        if (isOnSocialPage) {
          console.log('[TopBar] Skipping unread count update - user is on social page:', totalUnread);
          return;
        }

        console.log('[TopBar] Chat unread counts updated from Firebase:', { unreadCounts, totalUnread });
        setUnreadMsgCount(totalUnread);
      }
    );

    // ✅ Fallback: Poll API chỉ khi Firebase không update trong 30s (realtime fail)
    const pollUnreadCounts = async () => {
      const timeSinceLastFirebaseUpdate = Date.now() - lastFirebaseUpdateRef;

      // Nếu Firebase đã update trong 30s gần đây → không cần poll
      if (timeSinceLastFirebaseUpdate < 30000) {
        console.log('[TopBar] Skipping poll - Firebase updated recently:', timeSinceLastFirebaseUpdate, 'ms ago');
        return;
      }

      try {
        const data = await chatApi.getUnreadCounts(currentUserId);
        console.log('[TopBar] Polled unread count from API (Firebase fallback):', data.totalUnread);
        setUnreadMsgCount(data.totalUnread);
      } catch (error) {
        console.warn('[TopBar] Failed to poll unread counts from API:', error);
      }
    };

    // ✅ Poll mỗi 30s (thay vì 10s) - chỉ poll khi Firebase không hoạt động
    pollInterval = window.setInterval(pollUnreadCounts, 30000);

    return () => {
      console.log('[TopBar] Cleaning up Firebase chat unread counts listener');
      unsubscribe();
      if (pollInterval !== null) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [currentUserId, firebaseReady, isOnSocialPage]); // ✅ Re-run khi location thay đổi

  useEffect(() => {
    if (!notifOpen || !currentUserId || !firebaseReady) return;
    const unreadIds = alertNotifications
      .filter((n) => !n.read && n.id)
      .map((n) => String(n.id));
    if (unreadIds.length > 0) {
      // Cập nhật local state ngay lập tức: đánh dấu tất cả alert notifications là đã đọc
      setAlertNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(String(n.id)) ? { ...n, read: true } : n))
      );
      setUnreadAlertCount(0); // Optimistic update
      // Đánh dấu đã đọc qua backend API (backend sẽ mirror vào Firebase)
      void markNotificationsAsRead(currentUserId, unreadIds).catch((error) => {
        console.warn('[TopBar] Failed to mark notifications as read:', error);
        // Optimistic update đã xử lý UI, nên không cần rollback
      });
    }
  }, [notifOpen, currentUserId, firebaseReady, alertNotifications]);

  // Mark message notifications as read when chat tab is opened
  // Note: Chat unread count is managed by Firebase rooms listener, not here
  useEffect(() => {
    if (!currentUserId || !firebaseReady) return;
    const handler = () => {
      const unreadIds = messageNotifications
        .filter((n) => !n.read && n.id)
        .map((n) => String(n.id));
      if (unreadIds.length) {
        // Cập nhật local state ngay lập tức: đánh dấu tất cả message notifications là đã đọc
        setMessageNotifications((prev) =>
          prev.map((n) => (unreadIds.includes(String(n.id)) ? { ...n, read: true } : n))
        );
        // Đánh dấu đã đọc qua backend API (backend sẽ mirror vào Firebase)
        // Note: Chat unread count will be updated by backend when markConversationAsRead is called
        void markNotificationsAsRead(currentUserId, unreadIds).catch((error) => {
          console.warn('[TopBar] Failed to mark message notifications as read:', error);
          // Optimistic update đã xử lý UI, nên không cần rollback
        });
      }
    };
    window.addEventListener(CHAT_TAB_OPENED_EVENT, handler);
    return () => {
      window.removeEventListener(CHAT_TAB_OPENED_EVENT, handler);
    };
  }, [currentUserId, firebaseReady, messageNotifications]);

  /** ================= LOGOUT ================= **/
  const handleLogout = () => {
    // Stop token refresh interval
    stopTokenRefreshInterval();
    clearTokens();

    // Clear sessionStorage for premium expiring modal (clear all date-based keys)
    if (currentUserId) {
      // Clear all date-based keys for this user
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`premiumExpiringModal_shown_${currentUserId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }

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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e as any);
                  }
                }}
              />
            </div>

            {/* Voice Record Button */}
            <Button
              type="button"
              variant="hero"
              className="px-4"
              onClick={startRecording}
              disabled={isRecognizing}
            >
              <Mic className="h-4 w-4" />
            </Button>
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
            <NotificationsDropdown
              userId={currentUserId ?? undefined}
              onClose={() => setNotifOpen(false)}
            />
          </DropdownMenu>

          {/* Messages */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              // Reset unread count về 0 khi nhấn vào icon message
              setUnreadMsgCount(0);
              // Chuyển đến trang social với tab chat
              navigate("/social?tab=chat");
            }}
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
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary gap-1"
              onClick={() => navigate("/premium")}
            >
              <Crown className="h-3.5 w-3.5" />
              {profilePlanLabel || "Premium"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary"
              onClick={() => navigate("/premium")}
            >
              Discover Premium
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
        limit={typeof limit === "number" ? limit : undefined}
        limitType={limitType}
        isPremium={limitType === FeatureLimitType.UNLIMITED}
        canUse={canUse}
        onRefresh={checkUsage}
      />

      {/* Recording Dialog */}
      <Dialog open={showRecordingDialog} onOpenChange={(open) => {
        if (!open) {
          if (isRecording) {
            stopRecording();
          }
          if (!isRecognizing) {
            clearAudio();
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Search</DialogTitle>
            <DialogDescription>
              Record audio to search for music
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {/* Recording Animation */}
            {isRecording && (
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                  <div className="absolute inset-4 rounded-full bg-primary/40 animate-pulse" />
                  <Mic className="w-12 h-12 text-primary relative z-10" />
                </div>
              </div>
            )}

            {/* Recording Time */}
            {isRecording && (
              <div className="text-2xl font-mono font-bold text-primary">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Status Text */}
            <div className="text-center">
              {isRecording ? (
                <p className="text-lg font-semibold text-primary">Recording...</p>
              ) : isRecognizing ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-lg font-semibold">Recognizing music...</p>
                </div>
              ) : audioBlob ? (
                <div className="space-y-4 w-full">
                  <p className="text-sm text-muted-foreground">Recording complete</p>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={isPlaying ? pauseAudio : playAudio}
                      className="w-12 h-12"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>
                    <span className="text-sm text-muted-foreground">Preview</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ready to record</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              ) : audioBlob && !isRecognizing ? (
                <>
                  <Button
                    onClick={clearAudio}
                    variant="outline"
                    className="flex-1"
                  >
                    Record Again
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Expiring Modal */}
      <PremiumExpiringModal
        open={showPremiumExpiringModal}
        onOpenChange={setShowPremiumExpiringModal}
        planName={profilePlanLabel || currentSubscription?.planName}
        planCode={currentSubscription?.planCode}
        expirationDate={
          currentSubscription?.expiresAt ||
          currentSubscription?.endDate ||
          currentSubscription?.currentPeriodEnd ||
          undefined
        }
      />
    </header>
  );
};

export default TopBar;
