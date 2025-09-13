import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Music, 
  User, 
  Menu, 
  Bell, 
  MessageCircle, 
  Settings, 
  LogOut, 
  Heart,
  UserPlus
} from "lucide-react";
import { useState } from "react";

const AuthenticatedHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications] = useState([
    { id: 1, type: 'friend_request', message: 'Alex M. sent you a friend request', time: '2m ago' },
    { id: 2, type: 'like', message: 'Sarah K. liked your song "Cosmic Dreams"', time: '5m ago' },
    { id: 3, type: 'profile_view', message: 'Mike R. viewed your profile', time: '10m ago' },
    { id: 4, type: 'quiz_like', message: '3 people liked your quiz "90s Rock Hits"', time: '1h ago' }
  ]);
  
  const [messages] = useState([
    { id: 1, from: 'Alex M.', message: 'Hey! Check out this new playlist I made', time: '1m ago', unread: true },
    { id: 2, from: 'Sarah K.', message: 'Thanks for sharing that song!', time: '30m ago', unread: false },
    { id: 3, from: 'Mike R.', message: 'Want to collaborate on a quiz?', time: '2h ago', unread: true }
  ]);

  const unreadNotifications = notifications.length;
  const unreadMessages = messages.filter(m => m.unread).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Music className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            EchoVerse
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </a>
          <a href="/discover" className="text-sm font-medium hover:text-primary transition-colors">
            Discover
          </a>
          <a href="/playlist" className="text-sm font-medium hover:text-primary transition-colors">
            Playlist
          </a>
          <a href="/quiz" className="text-sm font-medium hover:text-primary transition-colors">
            Quiz
          </a>
          <a href="/social" className="text-sm font-medium hover:text-primary transition-colors">
            Social
          </a>
        </nav>

        {/* Search Bar */}
        <div className="hidden md:flex items-center space-x-4 flex-1 max-w-sm mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search songs, artists, genres..."
              className="pl-10 bg-muted/50 border-border/40"
            />
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-2">
          {/* Messages */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <MessageCircle className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                    {unreadMessages}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <h4 className="font-semibold">Messages</h4>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`p-3 border-b hover:bg-muted/50 cursor-pointer ${message.unread ? 'bg-primary/5' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{message.from}</span>
                      <span className="text-xs text-muted-foreground">{message.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{message.message}</p>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <h4 className="font-semibold">Notifications</h4>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{notification.message}</p>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">john@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="hero" size="sm">
            Get Premium
          </Button>
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search songs, artists, genres..."
                className="pl-10 bg-muted/50 border-border/40"
              />
            </div>
            <nav className="flex flex-col space-y-2">
              <a href="/" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Home
              </a>
              <a href="/discover" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Discover
              </a>
              <a href="/playlist" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Playlist
              </a>
              <a href="/quiz" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Quiz
              </a>
              <a href="/social" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Social
              </a>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default AuthenticatedHeader;