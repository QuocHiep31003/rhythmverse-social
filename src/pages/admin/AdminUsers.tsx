import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Shield, ChevronLeft, ChevronRight, Download, Upload, Users as UsersIcon, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { usersApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortBy, setSortBy] = useState("name,asc");
  
  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, sortBy]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll(currentPage, pageSize, sortBy);
      
      // Handle Spring Boot pagination response structure
      if (response.content) {
        setUsers(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      } else {
        // Fallback if response is just an array
        setUsers(Array.isArray(response) ? response : []);
        setTotalElements(Array.isArray(response) ? response.length : 0);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: any) => {
    setFormMode("edit");
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        await usersApi.create(data);
        toast({
          title: "Success",
          description: "User created successfully",
        });
      } else {
        await usersApi.update(selectedUser.id, data);
        toast({
          title: "Success",
          description: "User updated successfully",
        });
      }
      setFormOpen(false);
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await usersApi.delete(selectedUser.id);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setDeleteOpen(false);
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to Excel
  // Excel format: ID, Name, Email, Phone, Address, Roles
  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = filteredUsers.map((user) => ({
        ID: user.id,
        Name: user.name,
        Email: user.email,
        Phone: user.phone || '',
        Address: user.address || '',
        Roles: user.roles?.join(', ') || 'User',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // ID
        { wch: 25 },  // Name
        { wch: 30 },  // Email
        { wch: 15 },  // Phone
        { wch: 30 },  // Address
        { wch: 15 },  // Roles
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `users_export_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Success",
        description: `Exported ${exportData.length} users to Excel`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  // Import from Excel
  // Excel format required: Name, Email, Phone (optional), Address (optional), Password (optional), Roles (optional)
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Check file type - ONLY accept .xlsx files
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'xlsx' && !validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Only .xlsx files are accepted",
        variant: "destructive",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('Imported data:', jsonData);

        if (jsonData.length === 0) {
          toast({
            title: "Warning",
            description: "Excel file contains no data",
            variant: "destructive",
          });
          return;
        }

        // Validate and transform data
        const importedUsers = jsonData.map((row: any) => ({
          name: row.Name || row.name,
          email: row.Email || row.email,
          phone: row.Phone || row.phone || '',
          address: row.Address || row.address || '',
          password: row.Password || row.password || 'defaultPassword123', // You should handle passwords properly
          roles: row.Roles ? row.Roles.split(',').map((r: string) => r.trim()) : ['USER'],
        }));

        // Import users one by one
        let successCount = 0;
        let errorCount = 0;

        for (const user of importedUsers) {
          try {
            await usersApi.create(user);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error('Error importing user:', user, error);
          }
        }

        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} user${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });

        loadUsers();
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Error",
          description: "Failed to read Excel file",
          variant: "destructive",
        });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    };

    reader.readAsBinaryString(file);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden bg-gradient-dark text-white p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section with Modern Design */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-xl border border-primary/10 flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">
                  {totalElements} total users
                </Badge>
                {loading && <span className="text-xs">Loading...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleImport}
              className="hidden"
            />
            
            {/* Import Button */}
            <Button 
              variant="outline" 
              onClick={handleImportClick}
              className="gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            
            {/* Export Button */}
            <Button 
              variant="outline" 
              onClick={handleExport}
              className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            {/* Add User Button */}
            <Button 
              onClick={handleCreate}
              className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>

      <Card className="border-none shadow-lg flex-1 flex flex-col overflow-hidden min-h-0">
        <CardHeader className="border-b bg-gradient-to-r from-background to-muted/20 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold">Users Directory</CardTitle>
              <CardDescription>Manage and organize your user base</CardDescription>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto min-h-0 scrollbar-custom">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-16 font-semibold">STT</TableHead>
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading users...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <UsersIcon className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery ? 'Try adjusting your search' : 'Get started by adding a new user'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-center">{currentPage * pageSize + index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-primary/10">
                          <AvatarImage src={user.avatar || user.profileImage} alt={user.name} />
                          <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                            {user.name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{user.name}</span>
                          {user.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              📱 {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={user.roles?.includes("ADMIN") ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {user.roles?.includes("ADMIN") && <Shield className="w-3 h-3" />}
                          {user.roles?.join(', ') || 'User'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(user)}
                          className="hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(user)}
                          className="hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modern Pagination Controls */}
      {totalPages > 0 && (
        <Card className="border-none shadow-md flex-shrink-0">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{currentPage * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min((currentPage + 1) * pageSize, totalElements)}</span> of{' '}
                <span className="font-semibold text-foreground">{totalElements}</span> users
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 ${currentPage === pageNum ? 'bg-gradient-primary shadow-md' : ''}`}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedUser}
        isLoading={isSubmitting}
        mode={formMode}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete User?"
        description={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        isLoading={isSubmitting}
      />
      </div>
    </div>
  );
};

export default AdminUsers;