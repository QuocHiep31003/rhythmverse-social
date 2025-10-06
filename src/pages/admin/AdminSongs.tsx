import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMusic } from "@/contexts/MusicContext";
import { Play, Pause, Pencil, Trash2, Plus, Search } from "lucide-react";
import { SongFormDialog } from "@/components/admin/SongFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { songsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const AdminSongs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentSong, isPlaying, playSong, togglePlay } = useMusic();

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const data = await songsApi.getAll();
      setSongs(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách bài hát",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedSong(null);
    setFormOpen(true);
  };

  const handleEdit = (song: any) => {
    setFormMode("edit");
    setSelectedSong({
      ...song,
      audio: song.audio,
    });
    setFormOpen(true);
  };

  const handleDeleteClick = (song: any) => {
    setSelectedSong(song);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        await songsApi.create(data);
        toast({
          title: "Thành công",
          description: "Đã tạo bài hát mới",
        });
      } else {
        await songsApi.update(selectedSong.id, data);
        toast({
          title: "Thành công",
          description: "Đã cập nhật bài hát",
        });
      }
      setFormOpen(false);
      loadSongs();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu bài hát",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await songsApi.delete(selectedSong.id);
      toast({
        title: "Thành công",
        description: "Đã xóa bài hát",
      });
      setDeleteOpen(false);
      loadSongs();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa bài hát",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSongs = songs.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayClick = (song: any) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý bài hát</h1>
          <p className="text-muted-foreground">Tổng số: {songs.length} bài hát</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm bài hát
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bài hát, nghệ sĩ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Bài hát</TableHead>
                <TableHead>Nghệ sĩ</TableHead>
                <TableHead>Album</TableHead>
                <TableHead>Thể loại</TableHead>
                <TableHead>Lượt phát</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : filteredSongs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Không tìm thấy bài hát
                  </TableCell>
                </TableRow>
              ) : (
                filteredSongs.map((song) => (
                <TableRow key={song.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlayClick(song)}
                    >
                      {currentSong?.id === song.id && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={song.cover}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <span className="font-medium">{song.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{song.artist}</TableCell>
                  <TableCell>{song.album}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                      {song.genre}
                    </span>
                  </TableCell>
                  <TableCell>{song.plays}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(song)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(song)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SongFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedSong}
        isLoading={isSubmitting}
        mode={formMode}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Xóa bài hát?"
        description={`Bạn có chắc muốn xóa bài hát "${selectedSong?.title}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AdminSongs;