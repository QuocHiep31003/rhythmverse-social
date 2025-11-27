import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Image, X, Lock, Globe, Music2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { uploadImage } from "@/config/cloudinary";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureLimitType, FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";

const playlistFormSchema = z.object({
  name: z.string().min(1, "TÃªn playlist khÃ´ng Ä‘Æ°á»£c trá»‘ng").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
  songLimit: z.number().min(1).max(1000).default(500),
  songIds: z.array(z.number()).default([]),
  coverUrl: z.string().optional().or(z.literal("")),
});

export type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

interface Song { id: number; name: string; releaseYear: number; }

interface PlaylistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlaylistFormValues) => void | Promise<unknown>;
  defaultValues?: Partial<PlaylistFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export const PlaylistFormDialog = ({ open, onOpenChange, onSubmit, defaultValues, isLoading = false, mode }: PlaylistFormDialogProps) => {
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [songSearch, setSongSearch] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Feature limit hook (only for create mode)
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
    autoCheck: mode === "create",
    onLimitReached: () => setShowLimitModal(true),
  });

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: true,
      songLimit: 500,
      songIds: [],
      coverUrl: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (!open) return;
    // load songs for selection
    (async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/songs?page=0&size=1000`);
        const data = await res.json();
        const items: Song[] = (data?.content || []).map((s: any) => ({ id: s.id, name: s.name, releaseYear: s.releaseYear }));
        setAllSongs(items);
        setFilteredSongs(items);
      } catch {
        setAllSongs([]);
        setFilteredSongs([]);
      }
    })();

    if (defaultValues) {
      form.reset({ ...form.getValues(), ...defaultValues });
      setCoverPreview(defaultValues.coverUrl || "");
    } else {
      form.reset({ name: "", description: "", isPublic: true, songLimit: 500, songIds: [], coverUrl: "" });
      setCoverPreview("");
    }
  }, [open]);

  useEffect(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) { setFilteredSongs(allSongs); return; }
    setFilteredSongs(allSongs.filter(s => s.name.toLowerCase().includes(q) || String(s.releaseYear).includes(q)));
  }, [songSearch, allSongs]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const result = await uploadImage(file);
      setCoverPreview(result.secure_url);
      form.setValue("coverUrl", result.secure_url, { shouldDirty: true, shouldValidate: true });
    } finally {
      setUploading(false);
    }
  };

  const handleSongToggle = (id: number) => {
    const current = form.getValues("songIds") || [];
    form.setValue("songIds", current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const handleSubmit = async (values: PlaylistFormValues) => {
    // Check feature limit only for create mode - dùng canUse từ backend (backend đã xử lý tất cả logic)
    if (mode === "create" && !canUse) {
      setShowLimitModal(true);
      return;
    }

    const result = onSubmit({ ...values, songIds: (values.songIds || []).map(Number) });
    if (
      result !== undefined &&
      result !== null &&
      typeof (result as PromiseLike<unknown>).then === "function"
    ) {
      await result;
    }
    if (mode === "create") {
      await refresh();
    }
  };

  const isPublic = form.watch("isPublic");
  const songLimit = form.watch("songLimit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">{mode === "create" ? "Tạo playlist mới" : "Chỉnh sửa playlist"}</DialogTitle>
          <DialogDescription className="text-gray-400">{mode === "create" ? "Nhập thông tin playlist và tải ảnh bìa." : "Cập nhật thông tin playlist và ảnh bìa."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="coverUrl" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">áº¢nh bÃ¬a</FormLabel>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                    {coverPreview ? (
                      <>
                        <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setCoverPreview(""); field.onChange(""); }} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full">
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Image className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <p className="text-xs text-gray-400">Upload áº£nh</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="bg-background/50 border-border text-white" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-400 mt-1">Khuyáº¿n nghá»‹: 1000x1000px, tá»‘i Ä‘a 5MB (JPG, PNG, WebP)</p>
                    <div className="mt-2 space-y-1">
                      <FormLabel className="text-xs text-gray-400">Hoáº·c dÃ¡n URL áº£nh</FormLabel>
                      <Input placeholder="https://...jpg" value={field.value || ""} onChange={(e) => { field.onChange(e.target.value); setCoverPreview(e.target.value); }} className="bg-background/50 border-border text-white" />
                    </div>
                  </div>
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">TÃªn playlist *</FormLabel>
                <FormControl><Input placeholder="TÃªn playlist" {...field} className="bg-background/50 border-border text-white" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">MÃ´ táº£</FormLabel>
                <FormControl><Textarea placeholder="MÃ´ táº£ playlist..." className="min-h-[60px] resize-none bg-background/50 border-border text-white" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="isPublic" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Cháº¿ Ä‘á»™ cÃ´ng khai</FormLabel>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-3">
                    {field.value ? <Globe className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-orange-500" />}
                    <div>
                      <p className="font-medium text-white">{field.value ? "CÃ´ng khai" : "RiÃªng tÆ°"}</p>
                      <p className="text-sm text-gray-400">{field.value ? "Ai cÅ©ng cÃ³ thá»ƒ xem" : "Chá»‰ báº¡n cÃ³ thá»ƒ xem"}</p>
                    </div>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-green-500" /></FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="songLimit" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Giá»›i háº¡n bÃ i hÃ¡t</FormLabel>
                <div className="flex items-center gap-4">
                  <FormControl><Input type="number" min={1} max={1000} className="w-32 bg-background/50 border-border text-white" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 500)} /></FormControl>
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">{songLimit} bÃ i hÃ¡t tá»‘i Ä‘a</Badge>
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="songIds" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Chá»n bÃ i hÃ¡t</FormLabel>
                <div className="bg-background/30 border border-border rounded-lg p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="TÃ¬m kiáº¿m bÃ i hÃ¡t..." value={songSearch} onChange={(e) => setSongSearch(e.target.value)} className="pl-10 bg-background/50 border-border text-white" />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredSongs.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">KhÃ´ng cÃ³ bÃ i hÃ¡t</p>
                    ) : (
                      filteredSongs.map((s) => {
                        const checked = (field.value || []).includes(s.id);
                        return (
                          <div key={s.id} className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white'} cursor-pointer`} onClick={() => handleSongToggle(s.id)}>
                            <Music2 className="w-3 h-3" />
                            <div className="flex-1 min-w-0"><p className="truncate">{s.name}</p></div>
                            <span className="text-xs text-gray-300">{s.releaseYear}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isCheckingLimit} className="bg-transparent border-gray-600 text-white hover:bg-gray-800">Hủy</Button>
              <Button
                type="submit"
                disabled={isLoading || isCheckingLimit}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Đang lưu..." : isCheckingLimit ? "Đang kiểm tra..." : mode === "create" ? "Tạo playlist" : "Cập nhật"}
                {mode === "create" &&
                  limitType === FeatureLimitType.LIMITED &&
                  remaining !== undefined &&
                  remaining > 0 && (
                  <span className="ml-2 text-xs opacity-75">({remaining} lượt còn lại)</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {mode === "create" && (
        <FeatureLimitModal
          open={showLimitModal}
          onOpenChange={setShowLimitModal}
          featureName={FeatureName.PLAYLIST_CREATE}
          featureDisplayName="Create Playlist"
          remaining={remaining}
          limit={typeof limit === "number" ? limit : usage?.limit ?? undefined}
          limitType={limitType}
          isPremium={limitType === FeatureLimitType.UNLIMITED}
          canUse={canUse}
          onRefresh={refresh}
        />
      )}
    </Dialog>
  );
};

export default PlaylistFormDialog;

