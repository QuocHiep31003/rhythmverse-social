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
import { useState } from "react";
const TopBar = () => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (trimmed) {
      navigate(`/search?query=${encodeURIComponent(trimmed)}`);
    }
  }
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-[0_4px_20px_rgba(168,85,247,0.1)]" style={{ borderImage: 'var(--gradient-navbar) 1' }}>
      <div className="flex h-16 items-center justify-between px-4 gap-4 relative">
        <div className="absolute inset-0 bg-gradient-navbar opacity-5 pointer-events-none" />
        {/* Search Bar */}
        <div className="flex-1 max-w-md relative z-10">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--primary))] transition-all group-focus-within:scale-110" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search songs, artists..."
                className="pl-10 pr-20 bg-gradient-search border-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))] transition-all duration-300 focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] transition-all">
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] transition-all">
                  <Mic className="h-3 w-3" />
                </Button>
              </div>
            </div>
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
                    U
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
              <DropdownMenuItem className="flex items-center gap-2">
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
