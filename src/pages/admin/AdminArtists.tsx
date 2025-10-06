import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { artistsApi } from "@/services/api";
import { ArtistFormDialog } from "@/components/admin/ArtistFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminArtists = () => {
  const [artists, setArtists] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadArtists = async () => {
    try {
      setLoading(true);
      const data = await artistsApi.getAll();
      setArtists(data);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách nghệ sĩ");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtists();
  }, []);

  const filteredArtists = artists.filter(
    (artist) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setFormMode("create");
    setSelectedArtist(null);
    setFormOpen(true);
  };

  const handleEdit = (artist: any) => {
    setFormMode("edit");
    setSelectedArtist(artist);
    setFormOpen(true);
  };

  const handleDeleteClick = (artist: any) => {
    setSelectedArtist(artist);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        await artistsApi.create(data);
        toast.success("Tạo nghệ sĩ thành công");
      } else {
        await artistsApi.update(selectedArtist.id, data);
        toast.success("Cập nhật nghệ sĩ thành công");
      }
      setFormOpen(false);
      loadArtists();
    } catch (error) {
      toast.error(`Lỗi khi ${formMode === "create" ? "tạo" : "cập nhật"} nghệ sĩ`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await artistsApi.delete(selectedArtist.id);
      toast.success("Xóa nghệ sĩ thành công");
      setDeleteDialogOpen(false);
      loadArtists();
    } catch (error) {
      toast.error("Lỗi khi xóa nghệ sĩ");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Nghệ sĩ</h1>
          <p className="text-muted-foreground mt-2">
            Tổng số: {artists.length} nghệ sĩ
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm Nghệ sĩ
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên hoặc quốc gia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Tên nghệ sĩ</TableHead>
              <TableHead>Quốc gia</TableHead>
              <TableHead>Năm debut</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredArtists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy nghệ sĩ nào
                </TableCell>
              </TableRow>
            ) : (
              filteredArtists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={artist.avatar} alt={artist.name} />
                      <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell>{artist.country}</TableCell>
                  <TableCell>{artist.debutYear}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {artist.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(artist)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(artist)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ArtistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={
          formMode === "edit" && selectedArtist
            ? {
                name: selectedArtist.name,
                country: selectedArtist.country,
                debutYear: selectedArtist.debutYear,
                description: selectedArtist.description,
                avatar: selectedArtist.avatar,
              }
            : undefined
        }
        isLoading={isSubmitting}
        mode={formMode}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Xóa nghệ sĩ?"
        description={`Bạn có chắc chắn muốn xóa nghệ sĩ "${selectedArtist?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AdminArtists;