import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Mic } from "lucide-react";

interface CosmicSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const CosmicSearchBar = ({ 
  placeholder = "Tìm kiếm bài hát, nghệ sĩ, album...", 
  onSearch,
  className = ""
}: CosmicSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    if (query.trim() && onSearch) {
      onSearch(query.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* Glow effect when focused */}
      <div className={`absolute inset-0 bg-gradient-glow rounded-2xl transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
      
      <div className="relative flex items-center">
        {/* AI Sparkles icon */}
        <div className="absolute left-4 z-10">
          <Sparkles className={`w-5 h-5 transition-all duration-300 ${isFocused ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        </div>

        {/* Search Input */}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={`
            pl-12 pr-24 py-3 h-12 
            bg-gradient-glass backdrop-blur-sm 
            border-2 border-border/30
            rounded-2xl text-foreground placeholder:text-muted-foreground
            focus:border-primary focus:shadow-glow
            transition-all duration-300
            ${isFocused ? 'shadow-glow' : ''}
          `}
        />

        {/* Voice Search Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-14 z-10 h-8 w-8 p-0 hover:bg-muted/20 hover:text-neon-pink transition-colors"
        >
          <Mic className="w-4 h-4" />
        </Button>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className={`
            absolute right-2 z-10 h-8 w-8 p-0 rounded-xl
            bg-gradient-primary hover:shadow-neon
            transition-all duration-300
            ${isFocused || query ? 'scale-100 opacity-100' : 'scale-95 opacity-80'}
          `}
        >
          <Search className="w-4 h-4 text-white" />
        </Button>
      </div>

      {/* Animated border */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-neon opacity-0 transition-opacity duration-300 -z-10 ${isFocused ? 'opacity-20' : ''}`} />
    </div>
  );
};

export default CosmicSearchBar;