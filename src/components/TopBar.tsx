import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // 🔐 Hàm xử lý logout
  const handleLogout = () => {
    // Xoá token ở cả localStorage và sessionStorage
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    // Chuyển về trang login
    navigate("/login");
  };

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
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
              3
            </Badge>
          </Button>

          {/* Messages */}
          <Button variant="ghost" size="icon" className="relative">
            <MessageCircle className="h-5 w-5" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
              5
            </Badge>
          </Button>

          {/* Get Premium */}
          <Button variant="hero" size="sm">
            Get Premium
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background/95 backdrop-blur-sm border-border/40" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">John Doe</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    john.doe@example.com
                  </p>
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
              
              {/* ✅ Nút logout có logic thực tế */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-destructive cursor-pointer"
              >
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
