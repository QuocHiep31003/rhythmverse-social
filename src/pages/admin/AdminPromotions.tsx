import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { promotionsApi, type Promotion } from "@/services/api/promotionApi";
import { Plus, RefreshCw, Tag, Pencil, Trash2, Upload as UploadIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import PromotionFormDialog, { PromotionFormValues } from "@/components/admin/PromotionFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

const AdminPromotions = () => {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"activatedDesc" | "activatedAsc" | "idDesc">("activatedDesc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await promotionsApi.getAll({ page, size, sort: "id,desc", search: query || undefined });
      setItems(res.content || []);
      setTotalElements((res as any).totalElements || 0);
      setTotalPages((res as any).totalPages || 0);
    } catch (e) {
      toast.error("Không thể tải promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, query]);

  const handleToggleActive = async (id: number, value: boolean) => {
    try {
      await promotionsApi.setActive(id, value);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, active: value } : p)));
      toast.success(value ? "Đã bật Active" : "Đã tắt Active");
    } catch (e) {
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const handleCreate = async (data: PromotionFormValues) => {
    try {
      setSubmitting(true);
      const payload: any = {
        title: data.title,
        subtitle: data.subtitle,
        imageUrl: data.imageUrl,
        ctaText: data.ctaText,
        ctaUrl: (data as any).ctaUrl || "",
        active: data.active,
      };
      if (data.gradient) payload.gradient = data.gradient;
      if (data.badge) payload.badge = data.badge;
      if ((data as any).icon) payload.icon = (data as any).icon;

      if (formMode === "create") {
        await promotionsApi.create(payload);
        toast.success("Đã tạo promotion");
      } else if (formMode === "edit" && selected) {
        await promotionsApi.update(selected.id, payload);
        toast.success("Đã cập nhật promotion");
      }
      setOpenForm(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || (formMode === "create" ? "Tạo promotion thất bại" : "Cập nhật thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const getTime = (p: any) => new Date(p?.activatedAt || p?.updatedAt || p?.createdAt || 0).getTime();
  const sortedItems = [...items].sort((a: any, b: any) => {
    // Active lên trên, Inactive xuống dưới
    const activeCompare = (b?.active ? 1 : 0) - (a?.active ? 1 : 0);
    if (activeCompare !== 0) return activeCompare;
    if (sortMode === "idDesc") return (b?.id ?? 0) - (a?.id ?? 0);
    const da = getTime(a);
    const db = getTime(b);
    return sortMode === "activatedAsc" ? da - db : db - da;
  });

  const handleEditClick = (p: Promotion) => {
    setSelected(p);
    setFormMode("edit");
    setOpenForm(true);
  };

  const handleDeleteClick = (p: Promotion) => {
    setSelected(p);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      await promotionsApi.delete(selected.id);
      toast.success("Đã xoá promotion");
      setDeleteOpen(false);
      load();
    } catch (e) {
      toast.error("Xoá thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setSubmitting(true);
      await promotionsApi.deleteMany(selectedIds);
      toast.success("Đã xoá promotions đã chọn");
      setSelectedIds([]);
      load();
    } catch (e) {
      toast.error("Xoá thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? items.map((p) => p.id) : []);
  };
  const toggleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleClickImport = () => fileInputRef.current?.click();
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const msg = await promotionsApi.import(file);
      toast.success(msg || "Đã import promotions");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Import thất bại");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Tag className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Quản lý Promotions</h1>
              <p className="text-muted-foreground mt-1">Hiển thị nhãn Active và cho phép bật/tắt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef as any} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            <Button variant="outline" onClick={load} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" onClick={handleClickImport} disabled={importing} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
              <UploadIcon className="w-4 h-4" /> {importing ? "Đang import..." : "Import"}
            </Button>
           
            <Button variant="destructive" disabled={selectedIds.length === 0} onClick={handleDeleteSelected} className="gap-2">
              <Trash2 className="w-4 h-4" /> Xoá đã chọn ({selectedIds.length})
            </Button>
            <Button onClick={() => setOpenForm(true)} className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg">
              <Plus className="w-4 h-4" /> Tạo promotion
            </Button>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Tìm kiếm promotion..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    className="bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Hiển thị:</span>
                  <select
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="bg-background border border-border rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span className="text-sm text-muted-foreground">mỗi trang</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">Không có promotion nào</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} />
                    </TableHead>
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead className="w-24">Ảnh</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Phụ đề</TableHead>
                    <TableHead className="w-28 text-center">Trạng thái</TableHead>
                    <TableHead className="w-28 text-center">Active</TableHead>
                    <TableHead className="w-28 text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((p, idx) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(e) => toggleSelectRow(p.id, e.target.checked)} />
                      </TableCell>
                      <TableCell>{page * size + idx + 1}</TableCell>
                      <TableCell>
                        <img
                          src={p.imageUrl || (p as any).image || "/placeholder.svg"}
                          alt={p.title}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                        />
                      </TableCell>
                      <TableCell className="font-medium truncate">{p.title}</TableCell>
                      <TableCell className="truncate text-muted-foreground">{p.subtitle || "—"}</TableCell>
                      <TableCell className="text-center">
                        {p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={!!p.active} onCheckedChange={(v) => handleToggleActive(p.id, v)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(p)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Hiển thị {items.length} trên tổng {totalElements}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setPage(0)} disabled={page === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const idx = start + i;
                if (idx >= totalPages) return null as any;
                return (
                  <Button key={idx} variant="outline" size="icon" onClick={() => setPage(idx)} className={`h-8 w-8 border-[hsl(var(--admin-border))] ${page === idx ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold" : "hover:bg-[hsl(var(--admin-hover))]"}`}>
                    {idx + 1}
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <PromotionFormDialog
          open={openForm}
          onOpenChange={setOpenForm}
          onSubmit={handleCreate}
          isLoading={submitting}
          mode={formMode}
          defaultValues={formMode === "edit" && selected ? {
            title: selected.title,
            subtitle: (selected as any).subtitle || "",
            imageUrl: (selected as any).imageUrl || (selected as any).image || "",
            ctaText: (selected as any).ctaText || "",
            ctaUrl: (selected as any).ctaUrl || "",
            gradient: (selected as any).gradient || "",
            badge: (selected as any).badge || "",
            iconName: (selected as any).iconName || "",
            active: !!selected.active,
          } : undefined}
        />

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleConfirmDelete}
          title="Xóa promotion?"
          description={`Bạn có chắc muốn xóa promotion "${selected?.title || ""}"? Hành động này không thể hoàn tác.`}
          isLoading={submitting}
        />
      </div>
    </div>
  );
};

export default AdminPromotions;


