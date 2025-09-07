import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Music, User, Menu } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <a href="/social" className="text-sm font-medium hover:text-primary transition-colors">
            Social
          </a>
          <a href="/profile" className="text-sm font-medium hover:text-primary transition-colors">
            Profile
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

        {/* Auth Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="hidden md:flex">
            <User className="h-4 w-4 mr-2" />
            Login
          </Button>
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
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Home
              </a>
              <a href="#discover" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Discover
              </a>
              <a href="#playlist" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Playlist
              </a>
              <a href="#album" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Album
              </a>
              <a href="#quiz" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Quiz
              </a>
              <a href="#premium" className="text-sm font-medium hover:text-primary transition-colors py-2">
                Premium
              </a>
            </nav>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;