import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Download, Upload, ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Music } from "lucide-react";
import { GenreFormDialog } from "@/components/admin/GenreFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { genresApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const SORT_OPTIONS = [
  { label: "Name (A-Z)", value: "name,asc" },
  { label: "Name (Z-A)", value: "name,desc" },
  { label: "Date created (Newest)", value: "createdAt,desc" },
  { label: "Date created (Oldest)", value: "createdAt,asc" },
  { label: "Date modified (Newest)", value: "updatedAt,desc" },
  { label: "Date modified (Oldest)", value: "updatedAt,asc" },
];

const AdminGenres = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortOption, setSortOption] = useState<string>(SORT_OPTIONS[0].value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDateTime = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN", { hour12: false });
  };

  const formatWeight = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return "1.00";
    return numeric.toFixed(2);
  };

  const renderStatusBadge = (status?: string) => {
    if (!status) return null;
    const normalized = status.toUpperCase();
    if (normalized === "ACTIVE") {
      return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">Hoạt động</Badge>;
    }
    if (normalized === "INACTIVE") {
      return <Badge variant="outline" className="text-destructive border-destructive/40">Ngưng hoạt động</Badge>;
    }
    return <Badge variant="outline">{normalized}</Badge>;
  };

  useEffect(() => {
    loadGenres();
  }, [currentPage, pageSize, searchQuery, sortOption]);

  const loadGenres = async () => {
    try {
      setLoading(true);
      const data = await genresApi.getAll({ page: currentPage, size: pageSize, sort: sortOption, search: searchQuery || undefined });
      setGenres(data.content || []); setTotalPages(data.totalPages || 0); setTotalElements(data.totalElements || 0);
    } catch (error) { toast({ title: "Lỗi", description: "Không thể tải danh sách thể loại", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleCreate = () => { setFormMode("create"); setSelectedGenre(null); setFormOpen(true); };
  const handleEdit = (genre: any) => { setFormMode("edit"); setSelectedGenre(genre); setFormOpen(true); };
  const handleDeleteClick = (genre: any) => { setSelectedGenre(genre); setDeleteOpen(true); };
  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") { await genresApi.create(data); toast({ title: "Thành công", description: "Đã tạo thể loại mới" }); }
      else { await genresApi.update(selectedGenre.id, data); toast({ title: "Thành công", description: "Đã cập nhật thể loại" }); }
      setFormOpen(false); loadGenres();
    } catch (error) { toast({ title: "Lỗi", description: "Không thể lưu thể loại", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    try { setIsSubmitting(true); await genresApi.delete(selectedGenre.id); toast({ title: "Thành công", description: "Đã xóa thể loại" }); setDeleteOpen(false); loadGenres(); }
    catch (error) { toast({ title: "Lỗi", description: "Không thể xóa thể loại", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleExport = async () => {
    try { await genresApi.exportExcel(); toast({ title: "Thành công", description: "Xuất file Excel thành công" }); }
    catch (error) { toast({ title: "Lỗi", description: "Lỗi khi xuất file Excel", variant: "destructive" }); }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) { toast({ title: "Lỗi", description: "Vui lòng chọn file Excel", variant: "destructive" }); return; }
    try { setIsSubmitting(true); const result = await genresApi.importExcel(file); toast({ title: "Thành công", description: result }); loadGenres(); }
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
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Quản lý Thể loại</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">{totalElements} thể loại</Badge>
                {loading && <span className="text-xs">Đang tải...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport} className="border-[hsl(var(--admin-border))] gap-2 hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><Download className="w-4 h-4" />Export</Button>
            <Button variant="outline" onClick={handleImportClick} disabled={isSubmitting} className="border-[hsl(var(--admin-border))] gap-2 hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><Upload className="w-4 h-4" />Import</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <Button onClick={handleCreate} className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg"><Plus className="w-4 h-4" />Thêm thể loại</Button>
          </div>
        </div>
          <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search genres..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }} className="pl-10 bg-background" /></div>
                  <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Show:</span><select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="bg-background border border-border rounded px-2 py-1 text-sm"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select><span className="text-sm text-muted-foreground">per page</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={sortOption}
                    onChange={(e) => { setSortOption(e.target.value); setCurrentPage(0); }}
                    className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : genres.length === 0 ? (
                <div className="text-center py-8">{searchQuery ? "Không tìm thấy thể loại" : "Chưa có thể loại nào"}</div>
              ) : (
                <>
                  {/* Scrollable Table with Sticky Header */}
                  <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
                    <table className="w-full table-fixed border-collapse">
                      <thead className="sticky top-0 z-10 bg-[hsl(var(--admin-card))] border-b-2 border-[hsl(var(--admin-border))]">
                        <tr>
                          <th className="w-16 text-center text-sm font-medium text-muted-foreground p-3">STT</th>
                          <th className="w-1/4 text-left text-sm font-medium text-muted-foreground p-3">Tên thể loại</th>
                          <th className="w-28 text-left text-sm font-medium text-muted-foreground p-3">Icon</th>
                          <th className="w-24 text-left text-sm font-medium text-muted-foreground p-3">Trọng số</th>
                          <th className="w-40 text-left text-sm font-medium text-muted-foreground p-3">Ngày tạo</th>
                          <th className="w-40 text-left text-sm font-medium text-muted-foreground p-3">Cập nhật</th>
                          <th className="w-32 text-right text-sm font-medium text-muted-foreground p-3">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genres.map((genre, index) => (
                          <tr key={genre.id} className="border-b border-border hover:bg-muted/50">
                            <td className="w-16 p-3 text-center align-top">{currentPage * pageSize + index + 1}</td>
                            <td className="w-1/4 p-3 text-left align-top">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{genre.name}</span>
                                {renderStatusBadge(genre.status)}
                              </div>
                            </td>
                            <td className="w-28 p-3 align-top">
                              {genre.iconUrl ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/60">
                                  <img
                                    src={genre.iconUrl}
                                    alt={genre.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Không có</Badge>
                              )}
                            </td>
                            <td className="w-24 p-3 align-top">
                              <span className="font-medium">{formatWeight(genre.weight)}</span>
                            </td>
                            <td className="w-40 p-3 align-top text-sm text-muted-foreground">
                              {formatDateTime(genre.createdAt)}
                            </td>
                            <td className="w-40 p-3 align-top text-sm text-muted-foreground">
                              {formatDateTime(genre.updatedAt)}
                            </td>
                            <td className="w-32 text-right p-3 align-top">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(genre)} className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(genre)} className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Pagination outside of scrollable area */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 flex-shrink-0">
              <div className="text-sm text-muted-foreground">Showing {genres.length} of {totalElements} genres</div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><ChevronsLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><ChevronLeft className="w-4 h-4" /></Button>
                {getPageNumbers().map(page => (
                  <Button 
                    key={page} 
                    variant="outline" 
                    size="icon" 
                    onClick={() => goToPage(page)} 
                    className={`h-8 w-8 border-[hsl(var(--admin-border))] ${
                      currentPage === page 
                        ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]" 
                        : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                    }`}
                  >
                    {page + 1}
                  </Button>
                ))}
                <Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= totalPages - 1} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><ChevronRight className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={goToLastPage} disabled={currentPage >= totalPages - 1} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><ChevronsRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

        <GenreFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleFormSubmit} defaultValues={selectedGenre} isLoading={isSubmitting} mode={formMode} />
        <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} title="Xóa thể loại?" description={`Bạn có chắc muốn xóa thể loại "${selectedGenre?.name}"?`} isLoading={isSubmitting} />
      </div>
    </div>
  );
};

export default AdminGenres;
