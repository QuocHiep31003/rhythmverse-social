import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Search, Download, Upload } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/Pagination";
import { genresApi } from "@/services/api";
import { GenreFormDialog } from "@/components/admin/GenreFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { toast } from "sonner";

const AdminGenres = () => {
  const [genres, setGenres] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGenres = async (page = 0) => {
    try {
      setLoading(true);
      const data = await genresApi.getAll({
        page,
        size: 10,
        sort: "name,asc",
        search: searchQuery || undefined
      });
      setGenres(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setCurrentPage(page);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách thể loại");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGenres(0);
  }, [searchQuery]);

  const handleCreate = () => {
    setFormMode("create");
    setSelectedGenre(null);
    setFormOpen(true);
  };

  const handleEdit = (genre: any) => {
    setFormMode("edit");
    setSelectedGenre(genre);
    setFormOpen(true);
  };

  const handleDeleteClick = (genre: any) => {
    setSelectedGenre(genre);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        await genresApi.create(data);
        toast.success("Tạo thể loại thành công");
      } else {
        await genresApi.update(selectedGenre.id, data);
        toast.success("Cập nhật thể loại thành công");
      }
      setFormOpen(false);
      loadGenres();
    } catch (error) {
      toast.error(`Lỗi khi ${formMode === "create" ? "tạo" : "cập nhật"} thể loại`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await genresApi.delete(selectedGenre.id);
      toast.success("Xóa thể loại thành công");
      setDeleteDialogOpen(false);
      loadGenres(currentPage);
    } catch (error) {
      toast.error("Lỗi khi xóa thể loại");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      await genresApi.exportExcel();
      toast.success("Xuất file Excel thành công");
    } catch (error) {
      toast.error("Lỗi khi xuất file Excel");
      console.error(error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await genresApi.importExcel(file);
      toast.success(result);
      loadGenres(0);
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi nhập file Excel");
      console.error(error);
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý Thể loại</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tổng số:</span>
            <span className="text-lg font-semibold text-primary">{totalElements}</span>
            <span className="text-sm text-muted-foreground">thể loại</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={isSubmitting}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Thể loại
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm thể loại..."
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
              <TableHead>ID</TableHead>
              <TableHead>Tên thể loại</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : genres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy thể loại nào
                </TableCell>
              </TableRow>
            ) : (
              genres.map((genre) => (
                <TableRow key={genre.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {genre.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{genre.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(genre)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(genre)}
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

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage + 1}
          totalPages={totalPages}
          onPageChange={(page) => loadGenres(page - 1)}
        />
      )}

      <GenreFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={
          formMode === "edit" && selectedGenre
            ? {
                name: selectedGenre.name,
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
        title="Xóa thể loại?"
        description={`Bạn có chắc chắn muốn xóa thể loại "${selectedGenre?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AdminGenres;