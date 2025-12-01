import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { bannersApi, type Banner } from "@/services/api/bannerApi";
import { Plus, RefreshCw, Tag, Pencil, Trash2, Upload as UploadIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import BannerFormDialog, { BannerFormValues } from "@/components/admin/BannerFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

const AdminBanners = () => {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<Banner | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"activatedDesc" | "activatedAsc" | "idDesc">("activatedDesc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await bannersApi.getAll({ page, size, sort: "id,desc", search: query || undefined });
      setItems(res.content || []);
      setTotalElements((res as any).totalElements || 0);
      setTotalPages((res as any).totalPages || 0);
    } catch (e) {
      toast.error("Unable to load banners");
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
      await bannersApi.setActive(id, value);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, active: value } : p)));
      toast.success(value ? "Active enabled" : "Active disabled");
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleCreate = async (data: BannerFormValues) => {
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
        await bannersApi.create(payload);
        toast.success("Banner created");
      } else if (formMode === "edit" && selected) {
        await bannersApi.update(selected.id, payload);
        toast.success("Banner updated");
      }
      setOpenForm(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || (formMode === "create" ? "Failed to create banner" : "Failed to update banner"));
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

  const handleEditClick = (p: Banner) => {
    setSelected(p);
    setFormMode("edit");
    setOpenForm(true);
  };

  const handleDeleteClick = (p: Banner) => {
    setSelected(p);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      await bannersApi.delete(selected.id);
      toast.success("Banner deleted");
      setDeleteOpen(false);
      load();
    } catch (e) {
      toast.error("Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setSubmitting(true);
      await bannersApi.deleteMany(selectedIds);
      toast.success("Selected banners deleted");
      setSelectedIds([]);
      load();
    } catch (e) {
      toast.error("Delete failed");
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
      const msg = await bannersApi.import(file);
      toast.success(msg || "Banners imported successfully");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="h-screen overflow-hidden p-4 md:p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-4 md:p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Tag className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Banner Management</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Hiển thị nhãn Active và cho phép bật/tắt</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input ref={fileInputRef as any} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            <Button variant="outline" onClick={load} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" onClick={handleClickImport} disabled={importing} className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
              <UploadIcon className="w-4 h-4" /> {importing ? "Importing..." : "Import"}
            </Button>
           
            <Button variant="destructive" disabled={selectedIds.length === 0} onClick={handleDeleteSelected} className="gap-2 text-xs sm:text-sm">
              <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete Selected</span> <span className="sm:hidden">Delete</span> ({selectedIds.length})
            </Button>
            <Button onClick={() => { setFormMode("create"); setSelected(null); setOpenForm(true); }} className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg text-xs sm:text-sm">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create Banner</span> <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search banners..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    className="bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Display:</span>
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
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">No banners available</div>
            ) : (
              <div className="overflow-x-auto h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 min-w-[48px]">
                        <input type="checkbox" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} />
                      </TableHead>
                      <TableHead className="w-16 min-w-[64px]">No.</TableHead>
                      <TableHead className="w-24 min-w-[96px]">Image</TableHead>
                      <TableHead className="min-w-[150px] max-w-[200px]">Title</TableHead>
                      <TableHead className="min-w-[150px] max-w-[250px]">Subtitle</TableHead>
                      <TableHead className="w-28 min-w-[112px] text-center">Status</TableHead>
                      <TableHead className="w-28 min-w-[112px] text-center">Active</TableHead>
                      <TableHead className="w-32 min-w-[128px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider>
                      {sortedItems.map((p, idx) => (
                        <TableRow key={p.id}>
                          <TableCell className="w-12">
                            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(e) => toggleSelectRow(p.id, e.target.checked)} />
                          </TableCell>
                          <TableCell className="w-16">{page * size + idx + 1}</TableCell>
                          <TableCell className="w-24">
                            <img
                              src={p.imageUrl || (p as any).image || "/placeholder.svg"}
                              alt={p.title}
                              className="w-10 h-10 rounded object-cover"
                              onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                            />
                          </TableCell>
                          <TableCell className="font-medium min-w-[150px] max-w-[200px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate">{p.title}</div>
                              </TooltipTrigger>
                              {p.title.length > 30 && (
                                <TooltipContent>
                                  <p className="max-w-xs">{p.title}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TableCell>
                          <TableCell className="min-w-[150px] max-w-[250px]">
                            {p.subtitle ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate text-muted-foreground">{p.subtitle}</div>
                                </TooltipTrigger>
                                {p.subtitle.length > 40 && (
                                  <TooltipContent>
                                    <p className="max-w-xs">{p.subtitle}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center w-28">
                            {p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                          </TableCell>
                          <TableCell className="text-center w-28">
                            <Switch checked={!!p.active} onCheckedChange={(v) => handleToggleActive(p.id, v)} />
                          </TableCell>
                          <TableCell className="text-right w-32">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(p)}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(p)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TooltipProvider>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Showing {items.length} of {totalElements}
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

        <BannerFormDialog
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
            icon: (selected as any).icon || "",
            active: !!selected.active,
          } : undefined}
        />

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleConfirmDelete}
          title="Delete banner?"
          description={`Are you sure you want to delete banner "${selected?.title || ""}"? This action cannot be undone.`}
          isLoading={submitting}
        />
      </div>
    </div>
  );
};

export default AdminBanners;

