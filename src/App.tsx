import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicProvider } from "@/contexts/MusicContext";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/components/AdminLayout";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Playlist from "./pages/Playlist";
import TrendingMusic from "./pages/TrendingMusic";
import Top100 from "./pages/Top100";
import PlaylistDetail from "./pages/PlaylistDetail";
import CreatePlaylist from "./pages/CreatePlaylist";
import PlaylistLibrary from "./pages/PlaylistLibrary";
import Quiz from "./pages/Quiz";
import CreateQuiz from "./pages/CreateQuiz";
import SearchResults from "./pages/SearchResults";
import Login from "./pages/Login";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import Social from "./pages/Social";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import SongDetail from "./pages/SongDetail";
import AlbumDetail from "./pages/AlbumDetail";
import ArtistDetail from "./pages/ArtistDetail";
import MusicPlayer from "./components/MusicPlayer";
import ChatBubble from "./components/ChatBubble";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminHome from "./pages/admin/AdminHome";
import AdminSongs from "./pages/admin/AdminSongs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlaylists from "./pages/admin/AdminPlaylists";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="echoverse-ui-theme">
      <MusicProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <AdminLayout>
                <Routes>
                  <Route path="login" element={<AdminLogin />} />
                  <Route path="home" element={<AdminHome />} />
                  <Route path="songs" element={<AdminSongs />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="playlists" element={<AdminPlaylists />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Routes>
              </AdminLayout>
            } />

            {/* Main App Routes */}
            <Route path="*" element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/playlist" element={<Playlist />} />
                  <Route path="/playlists" element={<PlaylistLibrary />} />
                  <Route path="/playlist/:id" element={<PlaylistDetail />} />
                  <Route path="/create-playlist" element={<CreatePlaylist />} />
                  <Route path="/trending" element={<TrendingMusic />} />
                  <Route path="/top100" element={<Top100 />} />
                  <Route path="/quiz" element={<Quiz />} />
                  <Route path="/quiz/create" element={<CreateQuiz />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/premium" element={<Premium />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/social" element={<Social />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/song/:id" element={<SongDetail />} />
                  <Route path="/album/:id" element={<AlbumDetail />} />
                  <Route path="/artist/:id" element={<ArtistDetail />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
          <MusicPlayer />
          <ChatBubble />
        </BrowserRouter>
        </TooltipProvider>
      </MusicProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
