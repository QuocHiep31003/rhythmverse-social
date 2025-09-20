import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Music, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaylistCreated?: (playlist: any) => void;
}

const CreatePlaylistDialog = ({ open, onOpenChange, onPlaylistCreated }: CreatePlaylistDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: true,
    songLimit: 100,
    cover: null as File | null
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Lỗi",
          description: "Kích thước ảnh không được vượt quá 5MB",
          variant: "destructive"
        });
        return;
      }

      setFormData({ ...formData, cover: file });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, cover: null });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên playlist",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPlaylist = {
        id: Date.now().toString(),
        title: formData.name,
        description: formData.description,
        cover: previewUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
        owner: {
          name: "You",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
        },
        isPublic: formData.isPublic,
        likes: 0,
        songCount: 0,
        songs: []
      };

      onPlaylistCreated?.(newPlaylist);
      
      toast({
        title: "Thành công!",
        description: "Playlist đã được tạo thành công"
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        isPublic: true,
        songLimit: 100,
        cover: null
      });
      setPreviewUrl(null);
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tạo playlist",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Playlist Mới</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tên Playlist *</Label>
              <Input
                id="name"
                placeholder="Nhập tên playlist..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả về playlist của bạn..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="songLimit">Giới hạn số bài hát</Label>
              <Input
                id="songLimit"
                type="number"
                min="1"
                max="1000"
                value={formData.songLimit}
                onChange={(e) => setFormData({ ...formData, songLimit: parseInt(e.target.value) || 100 })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
              <Label htmlFor="isPublic">
                {formData.isPublic ? "Công khai" : "Riêng tư"}
              </Label>
            </div>

            {/* Cover Upload */}
            <div>
              <Label>Ảnh bìa</Label>
              <div className="mt-2">
                {!previewUrl ? (
                  <label htmlFor="cover-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nhấp để tải ảnh lên
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG (tối đa 5MB)
                      </p>
                    </div>
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label>Xem trước</Label>
            <Card className="mt-2">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-primary flex-shrink-0">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Playlist" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {formData.name || "Tên playlist"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tạo bởi You • 0 bài hát
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.isPublic ? "Công khai" : "Riêng tư"} • 
                      Tối đa {formData.songLimit} bài hát
                    </p>
                  </div>
                </div>
                {formData.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                    {formData.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? "Đang tạo..." : "Tạo Playlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlaylistDialog;