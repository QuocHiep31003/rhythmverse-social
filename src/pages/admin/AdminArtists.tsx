import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Download, Upload, ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { ArtistFormDialog } from "@/components/admin/ArtistFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { artistsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { debounce } from "@/lib/utils";

const AdminArtists = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadArtists();
  }, [currentPage, pageSize, searchQuery]);

  const loadArtists = async () => {
    try {
      setLoading(true);
      const data = await artistsApi.getAll({ page: currentPage, size: pageSize, sort: "name,asc", search: searchQuery || undefined });
      setArtists(data.content || []); setTotalPages(data.totalPages || 0); setTotalElements(data.totalElements || 0);
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể tải danh sách nghệ sĩ", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleCreate = () => { setFormMode("create"); setSelectedArtist(null); setFormOpen(true); };
  const handleEdit = (artist: any) => { setFormMode("edit"); setSelectedArtist(artist); setFormOpen(true); };
  const handleDeleteClick = (artist: any) => { setSelectedArtist(artist); setDeleteOpen(true); };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") { await artistsApi.create(data); toast({ title: "Thành công", description: "Đã tạo nghệ sĩ mới" }); }
      else { await artistsApi.update(selectedArtist.id, data); toast({ title: "Thành công", description: "Đã cập nhật nghệ sĩ" }); }
      setFormOpen(false); loadArtists();
    } catch (error) { toast({ title: "Lỗi", description: "Không thể lưu nghệ sĩ", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true); await artistsApi.delete(selectedArtist.id);
      toast({ title: "Thành công", description: "Đã xóa nghệ sĩ" }); setDeleteOpen(false); loadArtists();
    } catch (error) { toast({ title: "Lỗi", description: "Không thể xóa nghệ sĩ", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleExport = async () => {
    try { await artistsApi.exportExcel(); toast({ title: "Thành công", description: "Xuất file Excel thành công" }); }
    catch (error) { toast({ title: "Lỗi", description: "Lỗi khi xuất file Excel", variant: "destructive" }); }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) { toast({ title: "Lỗi", description: "Vui lòng chọn file Excel", variant: "destructive" }); return; }
    try { setIsSubmitting(true); const result = await artistsApi.importExcel(file); toast({ title: "Thành công", description: result }); loadArtists(); }
    catch (error: any) { toast({ title: "Lỗi", description: error.message || "Lỗi khi nhập file Excel", variant: "destructive" }); }
    finally { setIsSubmitting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const goToPage = (page: number) => setCurrentPage(page);
  const goToFirstPage = () => setCurrentPage(0);
  const goToLastPage = () => setCurrentPage(totalPages - 1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  const handlePageSizeChange = (newSize: number) => { setPageSize(newSize); setCurrentPage(0); };
  const getPageNumbers = () => {
    const pages = []; const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(0, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-dark text-white p-6 flex flex-col">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6"><ArrowLeft className="w-4 h-4 mr-2" />Quay lại</Button>
        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between">
            <div><h1 className="text-3xl font-bold">Quản lý Nghệ sĩ</h1><p className="text-muted-foreground">Tổng số: {totalElements} nghệ sĩ • Trang {currentPage + 1} / {totalPages}</p></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
              <Button variant="outline" onClick={handleImportClick} disabled={isSubmitting}><Upload className="w-4 h-4 mr-2" />Import</Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
              <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />Thêm nghệ sĩ</Button>
            </div>
          </div>
          <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Tìm kiếm nghệ sĩ..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }} className="pl-10 bg-background/50" /></div>
                <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Hiển thị:</span><select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="bg-background/50 border border-border rounded px-2 py-1 text-sm"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select><span className="text-sm text-muted-foreground">mỗi trang</span></div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {loading ? <div className="text-center py-8">Đang tải...</div> : artists.length === 0 ? <div className="text-center py-8">{searchQuery ? "Không tìm thấy nghệ sĩ" : "Chưa có nghệ sĩ nào"}</div> : (
                <>
                  <Table><TableHeader><TableRow><TableHead className="w-16">STT</TableHead><TableHead>Nghệ sĩ</TableHead><TableHead>Quốc gia</TableHead><TableHead>Năm ra mắt</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader><TableBody>{artists.map((artist, index) => (<TableRow key={artist.id}><TableCell className="text-center">{currentPage * pageSize + index + 1}</TableCell><TableCell><div className="flex items-center gap-3"><img src={artist.avatar || "https://via.placeholder.com/40"} alt={artist.name} className="w-10 h-10 rounded-full object-cover" /><span className="font-medium">{artist.name}</span></div></TableCell><TableCell>{artist.country || '—'}</TableCell><TableCell>{artist.debutYear || '—'}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => handleEdit(artist)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteClick(artist)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div></TableCell></TableRow>))}</TableBody></Table>
                  {totalPages > 1 && (<div className="flex items-center justify-between mt-6 pt-4 border-t border-border"><div className="text-sm text-muted-foreground">Hiển thị {artists.length} trên tổng số {totalElements} nghệ sĩ</div><div className="flex items-center gap-1"><Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0} className="h-8 w-8"><ChevronsLeft className="w-4 h-4" /></Button><Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 0} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>{getPageNumbers().map(page => (<Button key={page} variant={currentPage === page ? "default" : "outline"} size="icon" onClick={() => goToPage(page)} className="h-8 w-8">{page + 1}</Button>))}<Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= totalPages - 1} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button><Button variant="outline" size="icon" onClick={goToLastPage} disabled={currentPage >= totalPages - 1} className="h-8 w-8"><ChevronsRight className="w-4 h-4" /></Button></div></div>)}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <ArtistFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleFormSubmit} defaultValues={selectedArtist} isLoading={isSubmitting} mode={formMode} />
        <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} title="Xóa nghệ sĩ?" description={`Bạn có chắc muốn xóa nghệ sĩ "${selectedArtist?.name}"?`} isLoading={isSubmitting} />
      </div>
    </div>
  );
};

export default AdminArtists;
