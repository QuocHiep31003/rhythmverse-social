import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Image, Search, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

const albumSchema = z.object({
  name: z.string().min(1, "Tên album là bắt buộc"),
  artistId: z.number().min(1, "Nghệ sĩ là bắt buộc"),
  releaseDate: z.string().min(1, "Ngày phát hành là bắt buộc"),
  coverImage: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
});

export type AlbumFormValues = z.infer<typeof albumSchema>;

interface Artist {
  id: number;
  name: string;
  country: string;
  debutYear: number;
  description: string;
}

interface AlbumFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AlbumFormValues) => void;
  defaultValues?: Partial<AlbumFormValues>;
  isLoading?: boolean;
  mode: "create" | "edit";
  artists: Artist[];
}

export const AlbumFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode,
  artists,
}: AlbumFormDialogProps) => {
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [artistSearch, setArtistSearch] = useState("");
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);

  const form = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      name: "",
      artistId: 0,
      releaseDate: new Date().toISOString().split('T')[0],
      coverImage: "",
      description: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset(defaultValues);
      if (defaultValues.coverImage) {
        setCoverPreview(defaultValues.coverImage);
      }
      
      // Set artist name for display
      if (defaultValues.artistId && artists.length > 0) {
        const artist = artists.find(a => a.id === defaultValues.artistId);
        if (artist) {
          setArtistSearch(artist.name);
        }
      }
    } else if (open) {
      form.reset({
        name: "",
        artistId: 0,
        releaseDate: new Date().toISOString().split('T')[0],
        coverImage: "",
        description: "",
      });
      setCoverPreview("");
      setCoverFile(null);
      setArtistSearch("");
    }
  }, [open, defaultValues, form, artists]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        form.setError("coverImage", {
          type: "manual",
          message: "File ảnh không được vượt quá 5MB",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        form.setError("coverImage", {
          type: "manual",
          message: "File phải là định dạng ảnh",
        });
        return;
      }

      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCoverPreview(result);
        form.setValue("coverImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: AlbumFormValues) => {
    onSubmit(data);
  };

  const handleArtistSelect = (artist: Artist) => {
    form.setValue("artistId", artist.id);
    setArtistSearch(artist.name);
    setShowArtistDropdown(false);
  };

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(artistSearch.toLowerCase())
  );

  const selectedArtist = artists.find(artist => artist.id === form.watch("artistId"));

  const name = form.watch("name");
  const releaseDate = form.watch("releaseDate");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === "create" ? "Tạo album mới" : "Chỉnh sửa album"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {mode === "create"
              ? "Nhập thông tin để tạo album mới"
              : "Cập nhật thông tin album"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Cover Image Upload */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Ảnh bìa album</FormLabel>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                      {coverPreview ? (
                        <img 
                          src={coverPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Image className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                          <p className="text-xs text-gray-400">Upload ảnh</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="bg-background/50 border-border text-white"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-400 mt-1">
                        Đề xuất: 1000x1000px, tối đa 5MB (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Tên album *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nhập tên album..." 
                      {...field} 
                      className="bg-background/50 border-border text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Artist Selection */}
            <FormField
              control={form.control}
              name="artistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Nghệ sĩ *</FormLabel>
                  <div className="relative">
                    <div className="flex gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Tìm kiếm nghệ sĩ..."
                            value={artistSearch}
                            onChange={(e) => {
                              setArtistSearch(e.target.value);
                              setShowArtistDropdown(true);
                            }}
                            onFocus={() => setShowArtistDropdown(true)}
                            className="pl-10 bg-background/50 border-border text-white"
                          />
                        </div>
                      </FormControl>
                    </div>
                    
                    {showArtistDropdown && filteredArtists.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredArtists.map((artist) => (
                          <div
                            key={artist.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                            onClick={() => handleArtistSelect(artist)}
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-white font-medium">{artist.name}</p>
                              <p className="text-xs text-gray-400">
                                {artist.country} • Debut: {artist.debutYear}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedArtist && (
                      <div className="mt-2 p-3 bg-primary/20 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-white font-medium">{selectedArtist.name}</span>
                          <span className="text-xs text-gray-400">({selectedArtist.country})</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Ngày phát hành *</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field}
                      className="bg-background/50 border-border text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Mô tả album</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập mô tả về album..."
                      className="min-h-[100px] resize-none bg-background/50 border-border text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            {(name || selectedArtist) && (
              <div className="space-y-2 pt-4 border-t border-border">
                <FormLabel className="text-white">Xem trước</FormLabel>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      {coverPreview ? (
                        <AvatarImage src={coverPreview} alt={name} />
                      ) : (
                        <AvatarFallback className="bg-primary/20 text-white">
                          {name?.charAt(0).toUpperCase() || 'A'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg text-white">{name || "Tên album"}</h3>
                      {selectedArtist && (
                        <p className="text-sm text-gray-400 mt-1">
                          Nghệ sĩ: {selectedArtist.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-400">
                        Ngày phát hành: {releaseDate ? new Date(releaseDate).toLocaleDateString('vi-VN') : 'Chưa có'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Đang lưu..." : mode === "create" ? "Tạo album" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};