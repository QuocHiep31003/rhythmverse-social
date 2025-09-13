import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Playlist from "./pages/Playlist";
import Quiz from "./pages/Quiz";
import CreateQuiz from "./pages/CreateQuiz";
import SearchResults from "./pages/SearchResults";
import Login from "./pages/Login";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import Social from "./pages/Social";
import Admin from "./pages/Admin";
import SongDetail from "./pages/SongDetail";
import AlbumDetail from "./pages/AlbumDetail";
import ArtistDetail from "./pages/ArtistDetail";
import MusicPlayer from "./components/MusicPlayer";
import ChatBubble from "./components/ChatBubble";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/playlist" element={<Playlist />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/quiz/create" element={<CreateQuiz />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/login" element={<Login />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/social" element={<Social />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/song/:id" element={<SongDetail />} />
          <Route path="/album/:id" element={<AlbumDetail />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MusicPlayer />
        <ChatBubble />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
