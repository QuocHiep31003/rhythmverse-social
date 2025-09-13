import { Music } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-music-dark border-t border-border/40 mt-auto">
      <div className="container px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoVerse
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            © 2024 EchoVerse
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;