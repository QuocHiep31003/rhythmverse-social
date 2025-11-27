import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, Music, Lock, Globe, X, Users } from "lucide-react";
import { uploadImage } from "@/config/cloudinary";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import { buildJsonHeaders, authApi } from "@/services/api";
import { createSlug } from "@/utils/playlistUtils";
import { PlaylistVisibility } from "@/types/playlist";
import { createGridCover, uploadDataUrlToCloudinary } from "@/utils/imageUtils";
import { songsApi } from "@/services/api/songApi";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureLimitType, FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlaylistForm {
  name: string;
  description: string;
  visibility: PlaylistVisibility;
  coverImage: File | null;
  coverUrl?: string;
  songIds: number[];
}

const VISIBILITY_OPTIONS: Record<
  PlaylistVisibility,
  { label: string; description: string; icon: ComponentType<{ className?: string }> }
> = {
  [PlaylistVisibility.PUBLIC]: {
    label: "Public",
    description: "Anyone can search and view this playlist.",
    icon: Globe,
  },
  [PlaylistVisibility.FRIENDS_ONLY]: {
    label: "Friends Only",
    description: "Only your EchoVerse friends can discover it.",
    icon: Users,
  },
  [PlaylistVisibility.PRIVATE]: {
    label: "Private",
    description: "Only you and invited collaborators can access it.",
    icon: Lock,
  },
};

const CreatePlaylist = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [formData, setFormData] = useState<PlaylistForm>({
    name: "",
    description: "",
    visibility: PlaylistVisibility.PUBLIC,
    coverImage: null,
    coverUrl: "",
    songIds: [],
  });

  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUrlText, setCoverUrlText] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allSongs, setAllSongs] = useState<
    Array<{ id: number; name: string; releaseYear: number }>
  >([]);

  const [songSearch, setSongSearch] = useState("");

  const filteredSongs = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) return allSongs;
    return allSongs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.releaseYear).includes(q)
    );
  }, [songSearch, allSongs]);

  const selectedVisibilityMeta = VISIBILITY_OPTIONS[formData.visibility];

  // Feature limit hook
  const {
    canUse,
    remaining,
    refresh,
    usage,
    limit,
    limitType,
    isLoading: isCheckingLimit,
  } = useFeatureLimit({
    featureName: FeatureName.PLAYLIST_CREATE,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });
  const modalLimit =
    typeof limit === "number" ? limit : usage?.limit ?? undefined;

  // Refresh usage khi window focus lại (có thể admin đã thay đổi limit)
  useEffect(() => {
    const handleFocus = () => {
      refresh();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  // Refresh usage khi quay lại từ trang premium
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refresh]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/songs?page=0&size=1000`,
          { headers: buildJsonHeaders() }
        );
        const data = await res.json();
        const items = (data?.content || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          releaseYear: s.releaseYear,
        }));
        setAllSongs(items);
      } catch {
        setAllSongs([]);
      }
    })();
  }, []);

  const handleInputChange = (field: keyof PlaylistForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        const result = await uploadImage(file);
        setCoverPreview(result.secure_url);
        setCoverUrlText(result.secure_url);
        setFormData((prev) => ({
          ...prev,
          coverImage: file,
          coverUrl: result.secure_url,
        }));
      } finally {
        setUploading(false);
      }
    }
  };

  const uploadCoverIfNeeded = async (
    file: File | null
  ): Promise<string | null> => {
    if (!file) return null;

    const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";
    const uploadPreset =
      (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || "";

    if (!cloudName || !uploadPreset) return null;

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: fd,
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      return data.secure_url || data.url || null;
    } catch {
      return null;
    }
  };

  /** ==========================
   *   FIXED — MERGED CLEAN VERSION
   * ========================== */
  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Playlist name required",
        description: "Please enter a name for your playlist",
        variant: "destructive",
      });
      return;
    }

    if (formData.name.length > 100) {
      toast({
        title: "Name too long",
        description: "Playlist name must not exceed 100 characters",
        variant: "destructive",
      });
      return;
    }

    if (formData.description.length > 300) {
      toast({
        title: "Description too long",
        description: "Description must not exceed 300 characters",
        variant: "destructive",
      });
      return;
    }

    // Limit check - dùng canUse từ backend (backend đã xử lý tất cả logic)
    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      let uploadedCoverUrl: string | null = null;

      // Upload ảnh người dùng chọn
      if (formData.coverImage) {
        uploadedCoverUrl = await uploadCoverIfNeeded(formData.coverImage);
      }
      // Tạo cover từ songs (nếu không có ảnh)
      else if (!coverUrlText && formData.songIds.length > 0) {
        try {
          const first4SongIds = formData.songIds.slice(0, 4);
          const songPromises = first4SongIds.map((id) =>
            songsApi.getById(String(id)).catch(() => null)
          );
          const songs = (await Promise.all(songPromises)).filter(Boolean);

          if (songs.length > 0) {
            const imageUrls = songs.map(
              (song: any) =>
                song.urlImageAlbum ||
                song.albumImageUrl ||
                song.albumCoverImg ||
                null
            );

            const gridDataUrl = await createGridCover(imageUrls);
            uploadedCoverUrl = await uploadDataUrlToCloudinary(gridDataUrl);
          }
        } catch (err) {
          console.warn("Failed to generate cover:", err);
        }
      }

      // Resolve userId
      let ownerId: number | undefined;
      try {
        const raw = localStorage.getItem("userId");
        ownerId = raw ? Number(raw) : undefined;

        if (!ownerId || !Number.isFinite(ownerId)) {
          const me = await authApi.me().catch(() => undefined);
          const uid = me && (me.id || me.userId);
          if (uid) {
            ownerId = Number(uid);
            localStorage.setItem("userId", String(uid));
          }
        }
      } catch {}

      const body: any = {
        name: formData.name,
        description: (formData.description || "").slice(0, 300),
        visibility: formData.visibility,
        songIds: formData.songIds || [],
        dateUpdate: today,
        coverUrl: /^https?:\/\//.test(coverUrlText)
          ? coverUrlText
          : uploadedCoverUrl || formData.coverUrl || null,
      };

      if (ownerId) body.ownerId = ownerId;

      const headers = buildJsonHeaders();

      const res = await fetch("http://localhost:8080/api/playlists", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // Kiểm tra response status và parse error nếu có
      if (!res.ok) {
        let errorMessage = "Failed to create playlist";
        const status = res.status;
        try {
          const errorText = await res.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          // Use default error message
        }
        const error = new Error(errorMessage);
        (error as any).status = status;
        throw error;
      }

      const data = await res.json();

      // Đồng bộ lại usage sau khi backend đã tự tăng count
      await refresh();
      toast({
        title: "Playlist created successfully!",
        description: `"${data.name}" has been added to your library`,
      });

      navigate(`/playlist/${createSlug(data.name || "playlist", data.id)}`);
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.toLowerCase().includes("limit")) {
        setShowLimitModal(true);
        await refresh();
      }
      toast({
        title: "Error",
        description: err?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Create New Playlist
          </h1>
          <p className="text-muted-foreground">
            Build your perfect music collection
          </p>
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
              {/* LEFT COLUMN */}
              <div className="space-y-2">
                <Label>Cover Image</Label>

                <div
                  className="relative w-56 h-56 md:w-64 md:h-64 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/60"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Playlist cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        No cover selected
                      </p>
                    </div>
                  )}

                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverPreview("");
                        setCoverUrlText("");
                        setFormData((p) => ({
                          ...p,
                          coverImage: null,
                          coverUrl: "",
                        }));
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Recommended: 1000x1000px, max 5MB (JPG, PNG)
                </p>

                <div className="space-y-2 mt-2">
                  <Label>Collaborators</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      You can invite friends to collaborate after creating the
                      playlist.
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4 overflow-y-auto max-h-[68vh] pr-2 scrollbar-custom">
                <div className="space-y-2">
                  <Label htmlFor="playlist-name">Playlist Name *</Label>
                  <Input
                    id="playlist-name"
                    placeholder="My Awesome Playlist"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-background/50"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.name.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your playlist..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    className="bg-background/50 min-h-[100px] resize-none"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/300 characters
                  </p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="playlist-visibility">
                    Privacy Settings
                  </Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) =>
                      handleInputChange(
                        "visibility",
                        value as PlaylistVisibility
                      )
                    }
                  >
                    <SelectTrigger
                      id="playlist-visibility"
                      className="w-full border-border/60 bg-background/30 text-left"
                    >
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>

                    <SelectContent className="bg-card/95 border-border/40 text-foreground">
                      {Object.entries(VISIBILITY_OPTIONS).map(
                        ([value, option]) => {
                          const Icon = option.icon;
                          return (
                            <SelectItem
                              key={value}
                              value={value}
                              className="flex items-center gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          );
                        }
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview */}
                {formData.name && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="p-4 rounded-lg bg-background/30 border border-border/30">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          {coverPreview ? (
                            <AvatarImage
                              src={coverPreview}
                              alt={formData.name}
                            />
                          ) : (
                            <AvatarFallback className="bg-primary/20">
                              {formData.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="flex-1">
                          <h3 className="font-medium text-lg">
                            {formData.name}
                          </h3>

                          {formData.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge
                              variant={
                                formData.visibility ===
                                PlaylistVisibility.PUBLIC
                                  ? "default"
                                  : formData.visibility ===
                                    PlaylistVisibility.FRIENDS_ONLY
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {selectedVisibilityMeta?.label || "Visibility"}
                            </Badge>

                            <Badge variant="outline">
                              {formData.songIds.length}{" "}
                              {formData.songIds.length === 1
                                ? "song"
                                : "songs"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1"
                    disabled={isLoading || isCheckingLimit}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleSave}
                    className="flex-1"
                    disabled={
                      isLoading || isCheckingLimit || !formData.name.trim()
                    }
                  >
                    {isLoading
                      ? "Creating..."
                      : isCheckingLimit
                      ? "Checking..."
                      : "Create Playlist"}

                    {limitType === FeatureLimitType.LIMITED &&
                      remaining !== undefined &&
                      remaining > 0 && (
                      <span className="ml-2 text-xs opacity-75">
                        ({remaining} left)
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />

      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.PLAYLIST_CREATE}
        featureDisplayName="Create Playlist"
        remaining={remaining}
        limit={modalLimit}
        limitType={limitType}
        isPremium={limitType === FeatureLimitType.UNLIMITED}
        canUse={canUse}
        onRefresh={refresh}
      />
    </div>
  );
};

export default CreatePlaylist;
export { CreatePlaylist };
