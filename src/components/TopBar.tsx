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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { auddApi, authApi } from "@/services/api";


const TopBar = () => {
  const [searchText, setSearchText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
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
  }

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
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setError("");

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
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

    setIsRecognizing(true);
    setError("");

    try {
      const result = await auddApi.recognizeMusic(audioBlob);

      // Navigate to search results with recognition data
      navigate("/search", {
        state: {
          recognitionResult: result,
          audioUrl: audioUrl,
          searchType: 'recognition'
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
  useEffect(() => {
    const loadMe = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      try {
        // Get user info from localStorage
        const userName = localStorage.getItem('userName') || '';
        const userEmail = localStorage.getItem('userEmail') || '';
        setProfileName(userName);
        setProfileEmail(userEmail);
      } catch {
        // ignore
      }
    };
    loadMe();
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    } catch { }
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-[0_4px_20px_rgba(168,85,247,0.1)]" style={{ borderImage: 'var(--gradient-navbar) 1' }}>
      <div className="flex h-16 items-center justify-between px-4 gap-4 relative">
        <div className="absolute inset-0 bg-gradient-navbar opacity-5 pointer-events-none" />
        {/* Search Bar */}
        <div className="flex-1 max-w-lg relative z-10">
          <form onSubmit={handleSearch} className="flex gap-2">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--primary))] transition-all group-focus-within:scale-110" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search songs, artists..."
                className="pl-10 pr-4 bg-gradient-search dark:bg-none dark:bg-zinc-900 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 focus:shadow-[0_0_20px_rgba(59,130,246,0.3)] text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Music Recognition Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 hover:bg-muted/50"
                >
                  <Music className="h-4 w-4 mr-2" />
                  Music Recognition
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 bg-background/95 backdrop-blur-xl border-[hsl(var(--primary)/0.3)] shadow-[0_8px_30px_hsl(var(--primary)/0.2)]"
                align="end"
              >
                <div className="p-3 space-y-3">
                  {/* Upload Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Upload Audio File</span>
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
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Recording Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Record Audio</span>
                    </div>
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      className="w-full justify-start"
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Start Recording
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Audio Preview */}
                  {audioBlob && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Audio Preview</span>
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
                        <span className="text-xs text-muted-foreground flex-1">
                          {isRecording ? "Recording..." : "Audio ready"}
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

                      {/* Recognition Button */}
                      <Button
                        onClick={handleRecognize}
                        disabled={isRecognizing}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isRecognizing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Recognizing...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Recognize Music
                          </>
                        )}
                      </Button>

                      {/* Error Display */}
                      {error && (
                        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          {error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </form>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 relative z-10">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:bg-gradient-primary hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs animate-pulse shadow-[0_0_10px_hsl(var(--destructive)/0.5)]"
            >
              3
            </Badge>
          </Button>

          {/* Messages */}
          <Button variant="ghost" size="icon" className="relative hover:bg-gradient-secondary hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_hsl(var(--accent)/0.4)]">
            <MessageCircle className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs animate-pulse shadow-[0_0_10px_hsl(var(--destructive)/0.5)]"
            >
              5
            </Badge>
          </Button>

          {/* Get Premium */}
          <Button
            variant="hero"
            size="sm"
            className="bg-gradient-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300 hover:scale-105 font-semibold"
          >
            Get Premium
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:scale-110 transition-all duration-300">
                <Avatar className="h-8 w-8 ring-2 ring-[hsl(var(--primary)/0.5)] hover:ring-[hsl(var(--primary))] transition-all">
                  <AvatarImage src="/placeholder.svg" alt="User" />
                  <AvatarFallback className="bg-gradient-primary text-white font-semibold shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
                    {(() => {
                      const base = (profileName && profileName.trim().length > 0)
                        ? profileName
                        : (profileEmail ? profileEmail.split('@')[0] : 'U');
                      const parts = base.trim().split(' ').filter(Boolean);
                      const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : base[0];
                      return (initials || 'U').toUpperCase();
                    })()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-background/95 backdrop-blur-xl border-[hsl(var(--primary)/0.3)] shadow-[0_8px_30px_hsl(var(--primary)/0.2)]"
              align="end"
            >
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profileName || (profileEmail ? profileEmail.split('@')[0] : 'User')}</p>
                  {profileEmail && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {profileEmail}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2" onClick={handleLogout}>





                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopBar;