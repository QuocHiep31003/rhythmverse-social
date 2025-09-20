import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicProvider } from "@/contexts/MusicContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";
import Index from "@/pages/Index";
import TrendingMusic from "@/pages/TrendingMusic";
import Top100 from "@/pages/Top100";
import PlaylistDetail from "@/pages/PlaylistDetail";
import PlaylistLibrary from "@/pages/PlaylistLibrary";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <MusicProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AppLayout><Outlet /></AppLayout>}>
              <Route index element={<Index />} />
              <Route path="trending" element={<TrendingMusic />} />
              <Route path="top100" element={<Top100 />} />
              <Route path="playlist/:id" element={<PlaylistDetail />} />
              <Route path="my-library" element={<PlaylistLibrary />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster />
          <SonnerToaster />
        </Router>
      </MusicProvider>
    </ThemeProvider>
  );
}

export default App;