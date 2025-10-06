import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Search, Music2 } from "lucide-react";
import { AlbumFormDialog } from "@/components/admin/AlbumFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { albumsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const AdminAlbums = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const data = await albumsApi.getAll();
      setAlbums(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách albums",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedAlbum(null);
    setFormOpen(true);
  };

  const handleEdit = (album: any) => {
    setFormMode("edit");
    setSelectedAlbum(album);
    setFormOpen(true);
  };

  const handleDeleteClick = (album: any) => {
    setSelectedAlbum(album);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        await albumsApi.create(data);
        toast({
          title: "Thành công",
          description: "Đã tạo album mới",
        });
      } else {
        await albumsApi.update(selectedAlbum.id, data);
        toast({
          title: "Thành công",
          description: "Đã cập nhật album",
        });
      }
      setFormOpen(false);
      loadAlbums();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu album",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await albumsApi.delete(selectedAlbum.id);
      toast({
        title: "Thành công",
        description: "Đã xóa album",
      });
      setDeleteOpen(false);
      loadAlbums();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa album",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAlbums = albums.filter((album) =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Albums</h1>
          <p className="text-muted-foreground">Tổng số: {albums.length} albums</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo album
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm album hoặc nghệ sĩ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : filteredAlbums.length === 0 ? (
            <div className="text-center py-8">Không tìm thấy album</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAlbums.map((album) => (
                <Card key={album.id} className="overflow-hidden">
                  <div className="relative aspect-square">
                    <img
                      src={album.cover}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-bold text-lg mb-1">{album.title}</h3>
                      <p className="text-sm text-muted-foreground">{album.artist}</p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Năm:</span>
                        <span className="font-medium">{album.year}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Thể loại:</span>
                        <span className="font-medium">{album.genre}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Music2 className="w-4 h-4" />
                        <span>{album.tracks} bài hát</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(album)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(album)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlbumFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedAlbum}
        isLoading={isSubmitting}
        mode={formMode}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Xóa album?"
        description={`Bạn có chắc muốn xóa album "${selectedAlbum?.title}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AdminAlbums;
