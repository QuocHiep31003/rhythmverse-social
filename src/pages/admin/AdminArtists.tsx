import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Download, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Music } from "lucide-react";
import { ArtistFormDialog } from "@/components/admin/ArtistFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { artistsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { debounce } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DEFAULT_AVATAR_URL = "https://res-console.cloudinary.com/dhylbhwvb/thumbnails/v1/image/upload/v1759805930/eG5vYjR5cHBjbGhzY2VrY3NzNWU";

const COUNTRIES = [
  "Vietnam", "Korea", "Japan", "China", "Thailand", "United States", "United Kingdom",
  "Canada", "Australia", "France", "Germany", "Italy", "Spain", "Brazil", "Mexico",
  "India", "Indonesia", "Philippines", "Malaysia", "Singapore", "Taiwan", "Hong Kong",
  "Russia", "Turkey", "Netherlands", "Sweden", "Norway", "Denmark", "Finland",
  "Switzerland", "Austria", "Belgium", "Poland", "Argentina", "Chile", "Colombia"
].sort();

const DEBUT_YEARS = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => (new Date().getFullYear() - i).toString());

const SORT_OPTIONS = [
  { label: "Name (A-Z)", value: "name,asc" },
  { label: "Name (Z-A)", value: "name,desc" },
  { label: "Date created (Newest)", value: "createdAt,desc" },
  { label: "Date created (Oldest)", value: "createdAt,asc" },
  { label: "Date modified (Newest)", value: "updatedAt,desc" },
  { label: "Date modified (Oldest)", value: "updatedAt,asc" },
];

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
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [debutYearFilter, setDebutYearFilter] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>(SORT_OPTIONS[0].value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadArtists();
  }, [currentPage, pageSize, searchQuery, countryFilter, debutYearFilter, sortOption]);

  const loadArtists = async () => {
    try {
      setLoading(true);
      const data = await artistsApi.getAll({
        page: currentPage,
        size: pageSize,
        sort: sortOption,
        name: searchQuery || undefined,
        country: countryFilter || undefined,
        debutYear: debutYearFilter || undefined
      });

      setArtists(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load artists list", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleCreate = () => { setFormMode("create"); setSelectedArtist(null); setFormOpen(true); };
  const handleEdit = (artist: any) => { setFormMode("edit"); setSelectedArtist(artist); setFormOpen(true); };
  const handleDeleteClick = (artist: any) => { setSelectedArtist(artist); setDeleteOpen(true); };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") { await artistsApi.create(data); toast({ title: "Success", description: "Artist created successfully" }); }
      else { await artistsApi.update(selectedArtist.id, data); toast({ title: "Success", description: "Artist updated successfully" }); }
      setFormOpen(false); loadArtists();
    } catch (error) { toast({ title: "Error", description: "Failed to save artist", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true); await artistsApi.delete(selectedArtist.id);
      toast({ title: "Success", description: "Artist deleted successfully" }); setDeleteOpen(false); loadArtists();
    } catch (error) { toast({ title: "Error", description: "Failed to delete artist", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleExport = async () => {
    try { await artistsApi.exportExcel(); toast({ title: "Success", description: "Excel file exported successfully" }); }
    catch (error) { toast({ title: "Error", description: "Failed to export Excel file", variant: "destructive" }); }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) { toast({ title: "Error", description: "Please select an Excel file", variant: "destructive" }); return; }
    try { setIsSubmitting(true); const result = await artistsApi.importExcel(file); toast({ title: "Success", description: result }); loadArtists(); }
    catch (error: any) { toast({ title: "Error", description: error.message || "Failed to import Excel file", variant: "destructive" }); }
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
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section with modern design (aligned with Songs) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">Artist Management</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">{totalElements} artists</Badge>
                {loading && <span className="text-xs">Loading...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport} className="border-[hsl(var(--admin-border))] gap-2 hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><Download className="w-4 h-4" />Export</Button>
            <Button variant="outline" onClick={handleImportClick} disabled={isSubmitting} className="border-[hsl(var(--admin-border))] gap-2 hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><Upload className="w-4 h-4" />Import</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <Button onClick={handleCreate} className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg"><Plus className="w-4 h-4" />Add Artist</Button>
          </div>
        </div>
        <Card className="bg-card/50 border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search artists..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }} className="pl-10 bg-background" /></div>
                <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Show:</span><select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="bg-background border border-border rounded px-2 py-1 text-sm"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select><span className="text-sm text-muted-foreground">per page</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={countryFilter}
                  onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(0); }}
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Countries</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <select
                  value={debutYearFilter}
                  onChange={(e) => { setDebutYearFilter(e.target.value); setCurrentPage(0); }}
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-[150px] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Debut Years</option>
                  {DEBUT_YEARS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
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
            {loading ? <div className="text-center py-8">Loading...</div> : artists.length === 0 ? <div className="text-center py-8 text-muted-foreground">{searchQuery || countryFilter || debutYearFilter ? "No artists found" : "No artists yet"}</div> : (
              <>
                {/* Fixed Header */}
                <div className="flex-shrink-0 border-b-2 border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr>
                        <th className="w-16 text-center text-sm font-medium text-muted-foreground p-3">#</th>
                        <th className="w-48 text-left text-sm font-medium text-muted-foreground p-3">Country</th>
                        <th className="w-96 text-left text-sm font-medium text-muted-foreground p-3">Artist</th>
                        <th className="w-32 text-left text-sm font-medium text-muted-foreground p-3">Debut Year</th>
                        <th className="w-32 text-right text-sm font-medium text-muted-foreground p-3">Actions</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
                  <table className="w-full table-fixed">
                    <tbody>
                      {artists.map((artist, index) => (
                        <tr key={artist.id} className="border-b border-border hover:bg-muted/50">
                          <td className="w-16 p-3 text-center">{currentPage * pageSize + index + 1}</td>
                          <td className="w-48 p-3">{artist.country || '—'}</td>
                          <td className="w-96 p-3">
                            <div className="flex items-center gap-3">
                              <img src={artist.avatar || DEFAULT_AVATAR_URL} alt={artist.name} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR_URL; }} className="w-10 h-10 rounded-full object-cover" />
                              <span className="font-medium truncate">{artist.name}</span>
                            </div>
                          </td>
                          <td className="w-32 p-3">{artist.debutYear || '—'}</td>
                          <td className="w-32 text-right p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(artist)} className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(artist)} className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors">
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
            <div className="text-sm text-muted-foreground">Showing {artists.length} of {totalElements} artists</div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><ChevronsLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 0} className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"><ChevronLeft className="w-4 h-4" /></Button>
              {getPageNumbers().map(page => (
                <Button
                  key={page}
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(page)}
                  className={`h-8 w-8 border-[hsl(var(--admin-border))] ${currentPage === page
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
      </div>

      <ArtistFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleFormSubmit} defaultValues={selectedArtist} isLoading={isSubmitting} mode={formMode} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} title="Delete Artist?" description={`Are you sure you want to delete artist "${selectedArtist?.name}"?`} isLoading={isSubmitting} />
    </div>
  );
};

export default AdminArtists;
