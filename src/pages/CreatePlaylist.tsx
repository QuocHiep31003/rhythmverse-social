import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Music, Lock, Globe, AlertCircle, X, Users } from "lucide-react";
import { uploadImage } from "@/config/cloudinary";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import { buildJsonHeaders, authApi } from "@/services/api";
import { createSlug } from "@/utils/playlistUtils";

interface PlaylistForm {
  name: string;
  description: string;
  isPublic: boolean;
  songLimit: number;
  coverImage: File | null;
  coverUrl?: string;
  songIds: number[];
}

const CreatePlaylist = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PlaylistForm>({
    name: "",
    description: "",
    isPublic: true,
    songLimit: 500,
    coverImage: null,
    coverUrl: "",
    songIds: [],
  });
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUrlText, setCoverUrlText] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allSongs, setAllSongs] = useState<Array<{ id: number; name: string; releaseYear: number }>>([]);
  const [songSearch, setSongSearch] = useState("");
  const filteredSongs = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) return allSongs;
    return allSongs.filter(s => s.name.toLowerCase().includes(q) || String(s.releaseYear).includes(q));
  }, [songSearch, allSongs]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/songs?page=0&size=1000`, { headers: buildJsonHeaders() });
        const data = await res.json();
        const items = (data?.content || []).map((s: any) => ({ id: s.id, name: s.name, releaseYear: s.releaseYear }));
        setAllSongs(items);
      } catch {
        setAllSongs([]);
      }
    })();
  }, []);

  const handleInputChange = (field: keyof PlaylistForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        const result = await uploadImage(file);
        setCoverPreview(result.secure_url);
        setCoverUrlText(result.secure_url);
        setFormData((prev) => ({ ...prev, coverImage: file, coverUrl: result.secure_url }));
      } catch {
        // toast handled in helper; no-op
      } finally {
        setUploading(false);
      }
    }
  };

  // Upload cover image to Cloudinary (if configured via env)
  const uploadCoverIfNeeded = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";
    const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || "";
    if (!cloudName || !uploadPreset) return null;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.secure_url || data.url || null;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Playlist name required", description: "Please enter a name for your playlist", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      let uploadedCoverUrl: string | null = null;
      if (formData.coverImage) {
        uploadedCoverUrl = await uploadCoverIfNeeded(formData.coverImage);
      }
      // Try to resolve current userId for ownership
      let ownerId: number | undefined;
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        ownerId = raw ? Number(raw) : undefined;
        if (!ownerId || !Number.isFinite(ownerId)) {
          const me = await authApi.me().catch(() => undefined);
          const uid = me && (me.id || me.userId);
          if (uid) {
            ownerId = Number(uid);
            try { localStorage.setItem('userId', String(uid)); } catch {}
          }
        }
      } catch {}

      const body: any = {
        name: formData.name,
        description: (formData.description || "").slice(0, 500),
        visibility: formData.isPublic ? "PUBLIC" : "PRIVATE",
        songLimit: formData.songLimit,
        songIds: formData.songIds || [],
        dateUpdate: today,
        coverUrl: /^https?:\/\//.test(coverUrlText) ? coverUrlText : (uploadedCoverUrl || formData.coverUrl || null),
      };
      if (ownerId) body.ownerId = ownerId;
      const headers = buildJsonHeaders();
      const res = await fetch("http://localhost:8080/api/playlists", { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed to create playlist");
      const data = await res.json();
      toast({ title: "Playlist created successfully!", description: `"${data.name}" has been added to your library` });
      navigate(`/playlist/${createSlug(data.name || 'playlist', data.id)}`);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Please try again later", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button removed as requested */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Create New Playlist</h1>
          <p className="text-muted-foreground">Build your perfect music collection</p>
        </div>

        <Card className="bg-card/50 border-border/50 max-h-[80vh] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Playlist Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-start gap-4">
                <div
                  className="relative w-56 h-56 md:w-64 md:h-64 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/60"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Playlist cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No cover selected</p>
                    </div>
                  )}
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => { setCoverPreview(""); setCoverUrlText(""); setFormData((p)=>({...p, coverImage:null, coverUrl: ""})); }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      aria-label="Remove cover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                {/* Right side empty as requested (URL/extra inputs removed) */}
              </div>
              <p className="text-xs text-muted-foreground">Recommended: 1000x1000px, max 5MB (JPG, PNG)</p>

              {/* Moved Song Limit to left column */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="song-limit">Song Limit</Label>
                <div className="flex items-center gap-4">
                  <Input id="song-limit" type="number" min={1} max={1000} value={formData.songLimit} onChange={(e) => handleInputChange("songLimit", parseInt(e.target.value) || 500)} className="bg-background/50 w-32" />
                  <Badge variant="outline" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Max songs per playlist
                  </Badge>
                </div>
              </div>

              {/* Moved Collaborators to left column */}
              <div className="space-y-2 mt-2">
                <Label>Collaborators</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>You can invite friends to collaborate after creating the playlist.</span>
                </div>
              </div>
            </div>

            {/* Right column starts */}
            <div className="space-y-4 overflow-y-auto max-h-[68vh] pr-2 scrollbar-custom">

            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name *</Label>
              <Input id="playlist-name" placeholder="My Awesome Playlist" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} className="bg-background/50" maxLength={100} />
              <p className="text-xs text-muted-foreground">{formData.name.length}/100 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe your playlist..." value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="bg-background/50 min-h-[100px] resize-none" maxLength={300} />
              <p className="text-xs text-muted-foreground">{formData.description.length}/300 characters</p>
            </div>

            <div className="space-y-4">
              <Label>Privacy Settings</Label>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background/30">
                <div className="flex items-center gap-3">
                  {formData.isPublic ? <Globe className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-orange-500" />}
                  <div>
                    <p className="font-medium">{formData.isPublic ? "Public" : "Private"}</p>
                    <p className="text-sm text-muted-foreground">{formData.isPublic ? "Anyone can search and view this playlist" : "Only you can see this playlist"}</p>
                  </div>
                </div>
                <Switch checked={formData.isPublic} onCheckedChange={(checked) => handleInputChange("isPublic", checked)} />
              </div>
            </div>

            {/* Song Limit moved to left */}

            {/* Song selection removed for create flow as requested */}

            {/* Collaborators moved to left */}

            {formData.name && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-4 rounded-lg bg-background/30 border border-border/30">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      {coverPreview ? <AvatarImage src={coverPreview} alt={formData.name} /> : <AvatarFallback className="bg-primary/20">{formData.name.charAt(0).toUpperCase()}</AvatarFallback>}
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{formData.name}</h3>
                      {formData.description && <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={formData.isPublic ? "default" : "secondary"}>{formData.isPublic ? "Public" : "Private"}</Badge>
                        <Badge variant="outline">{formData.songIds.length}/{formData.songLimit} songs</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1" disabled={isLoading}>Cancel</Button>
              <Button onClick={handleSave} className="flex-1" disabled={isLoading || !formData.name.trim()}>{isLoading ? "Creating..." : "Create Playlist"}</Button>
            </div>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default CreatePlaylist;
export { CreatePlaylist };
