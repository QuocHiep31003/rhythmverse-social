import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicProvider } from "@/contexts/MusicContext";
import { StreakProvider } from "@/contexts/StreakContext";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/components/AdminLayout";

import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Playlist from "./pages/Playlist";
import Top100 from "./pages/Top100";
import PlaylistDetail from "./pages/PlaylistDetail";
import FavoriteSongs from "./pages/FavoriteSongs";
import CreatePlaylist from "./pages/CreatePlaylist";
import PlaylistLibrary from "./pages/PlaylistLibrary";
import SearchResults from "./pages/SearchResults";
import Login from "./pages/Login";
import OAuthCallback from "./pages/OAuthCallback";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import Social from "./pages/Social";
import Settings from "./pages/Settings";
import AlbumDetail from "./pages/AlbumDetail";
import ArtistDetail from "./pages/ArtistDetail";
import MusicPlayer from "./components/MusicPlayer";
import ControlMusicPlayer from "./components/ControlMusicPlayer";
import ChatBubble from "./components/ChatBubble";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import { StreakNotificationCenter } from "./components/streak/StreakNotificationCenter";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminHome from "./pages/admin/AdminHome";
import AdminSongs from "./pages/admin/AdminSongs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlaylists from "./pages/admin/AdminPlaylists";
import AdminSystemPlaylists from "./pages/admin/AdminSystemPlaylists";
import AdminAlbums from "./pages/admin/AdminAlbums";
import AdminArtists from "./pages/admin/AdminArtists";
import AdminGenres from "./pages/admin/AdminGenres";
import AdminMoods from "./pages/admin/AdminMoods";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTrending from "./pages/admin/AdminTrending";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminSnapshots from "./pages/admin/AdminSnapshots";
import AdminPremiumSubscriptions from "./pages/admin/AdminPremiumSubscriptions";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminSubscriptionPlans from "./pages/admin/AdminSubscriptionPlans";
import AdminPremiumDashboard from "./pages/admin/AdminPremiumDashboard";

import MusicRecognition from "./pages/MusicRecognition";
import MusicRecognitionResult from "./pages/MusicRecognitionResult";
import AcrHummingTest from "./pages/AcrHummingTest";

import PaymentCancel from "./pages/PaymentCancel";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentHistory from "./pages/PaymentHistory";

import FriendRequestWatcher from "./components/FriendRequestWatcher";
import ChatMessageWatcher from "./components/ChatMessageWatcher";
import PresenceManager from "./components/PresenceManager";

// ⭐ Missing import from main branch
import InviteFriend from "./pages/InviteFriend";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="echoverse-ui-theme">
      <MusicProvider>
        <StreakProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/oauth2/callback" element={<OAuthCallback />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              {/* Admin Routes */}
              <Route path="/admin/*" element={
                <AdminLayout>
                  <Routes>
                    <Route path="login" element={<AdminLogin />} />
                    <Route path="home" element={<AdminHome />} />
                    <Route path="songs" element={<AdminSongs />} />
                    <Route path="albums" element={<AdminAlbums />} />
                    <Route path="artists" element={<AdminArtists />} />
                    <Route path="genres" element={<AdminGenres />} />
                    <Route path="moods" element={<AdminMoods />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="playlists" element={<AdminPlaylists />} />
                    <Route path="system-playlists" element={<AdminSystemPlaylists />} />
                    <Route path="banners" element={<AdminBanners />} />
                    <Route path="trending" element={<AdminTrending />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="snapshots" element={<AdminSnapshots />} />
                    <Route path="subscription-plans" element={<AdminSubscriptionPlans />} />
                    <Route path="premium-dashboard" element={<AdminPremiumDashboard />} />
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
                    <Route path="/playlist/:slug" element={<PlaylistDetail />} />
                    <Route path="/album/:slug" element={<AlbumDetail />} />
                    <Route path="/albums/:slug" element={<AlbumDetail />} />{/* backward compat */}
                    <Route path="/create-playlist" element={<Navigate to="/playlist/create" replace />} />
                    <Route path="/favorites/songs" element={<FavoriteSongs />} />
                    <Route path="/trending" element={<Top100 />} />
                    <Route path="/top100" element={<Top100 />} />
              
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/premium" element={<Premium />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/social" element={<Social />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/album/:slug" element={<AlbumDetail />} />
                    <Route path="/artist/:id" element={<ArtistDetail />} />
                    <Route path="/music-recognition" element={<MusicRecognition />} />
                    <Route path="/music-recognition-result" element={<MusicRecognitionResult />} />
                    <Route path="/acr-humming-test" element={<AcrHummingTest />} />

                    {/* ⭐ Public profile is inline via /social?u=... */}

                    {/* ⭐ Invite link route from main */}
                    <Route path="/invite/friend/:code" element={<InviteFriend />} />

                    {/* Payments */}
                    <Route path="/payment/cancel" element={<PaymentCancel />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/history" element={<PaymentHistory />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              } />
            </Routes>

            <MusicPlayer />
            <ControlMusicPlayer />

            {(() => {
              try {
                const token = typeof window !== 'undefined'
                  ? (localStorage.getItem('token')
                    || localStorage.getItem('adminToken')
                    || sessionStorage.getItem('token'))
                  : null;

                return token ? <ChatBubble /> : null;
              } catch {
                return null;
              }
            })()}

            <FriendRequestWatcher />
            <ChatMessageWatcher />
            <PresenceManager />
          </BrowserRouter>
        </TooltipProvider>
      </StreakProvider>
      </MusicProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
