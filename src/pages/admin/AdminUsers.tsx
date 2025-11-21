import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Shield, ChevronLeft, ChevronRight, Download, Upload, Users as UsersIcon, Filter, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { usersApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const DEFAULT_AVATAR_URL = "https://res-console.cloudinary.com/dhylbhwvb/thumbnails/v1/image/upload/v1759805930/eG5vYjR5cHBjbGhzY2VrY3NzNWU";

const AdminUsers = () => {
  const navigate = useNavigate();
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
      const payloadBase = {
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        address: data.address || "",
        // Đúng: 1 là USER, 2 là ADMIN
        roleId: data.role === "admin" ? 2 : 1,
      };

      if (formMode === "create") {
        // Create expects no id in body
        await usersApi.create(payloadBase);
        toast({
          title: "Success",
          description: "User created successfully",
        });
      } else {
        await usersApi.update(selectedUser.id, payloadBase);
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
        description: error instanceof Error ? error.message : "Failed to save user",
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
        Roles: isAdmin(user) ? 'ADMIN' : 'USER',
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
  // Excel format required: Name, Email, Phone (optional), Address (optional), Roles (optional)
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      setLoading(true);
      
      // Call backend API directly with the file
      const result = await usersApi.importExcel(file);
      
      toast({
        title: "Success",
        description: result || "Users imported successfully",
      });

      // Reload users list
      loadUsers();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import Excel file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Helper function to determine if user is admin
  const isAdmin = (user: any): boolean => {
    // Check multiple possible fields for role
    const role = user.role || user.roleName || '';
    const roleId = user.roleId;
    const roles = user.roles;
    
    // Check role string (case insensitive)
    if (typeof role === 'string') {
      return role.toUpperCase() === 'ADMIN';
    }
    
    // Check roleId (2 = ADMIN, 1 = USER)
    if (typeof roleId === 'number') {
      return roleId === 2;
    }
    
    // Check roles array
    if (Array.isArray(roles)) {
      return roles.some((r: any) => 
        (typeof r === 'string' && r.toUpperCase() === 'ADMIN') ||
        (typeof r === 'object' && r?.name?.toUpperCase() === 'ADMIN')
      );
    }
    
    // Default to USER
    return false;
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section with Modern Design */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <UsersIcon className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">
                Quản lý Người dùng
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">
                  {totalElements} người dùng
                </Badge>
                {loading && <span className="text-xs">Đang tải...</span>}
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
            
            {/* Export Button */}
            <Button 
              variant="outline" 
              onClick={handleExport}
              className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            {/* Import Button */}
            <Button 
              variant="outline" 
              onClick={handleImportClick}
              className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            
            {/* Add User Button */}
            <Button 
              onClick={handleCreate}
              className="gap-2 bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] hover:bg-[hsl(var(--admin-active))] hover:opacity-85 font-semibold transition-opacity shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Thêm người dùng
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
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          {/* Fixed Header */}
          <div className="flex-shrink-0 border-b-2 border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))]">
            <table className="w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-16 text-center text-sm font-medium text-muted-foreground p-3">STT</th>
                  <th className="w-96 text-left text-sm font-medium text-muted-foreground p-3">User</th>
                  <th className="w-96 text-left text-sm font-medium text-muted-foreground p-3">Email</th>
                  <th className="w-32 text-left text-sm font-medium text-muted-foreground p-3">Role</th>
                  <th className="w-32 text-right text-sm font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
            </table>
          </div>
          
          {/* Scrollable Body */}
          <div className="flex-1 overflow-auto scroll-smooth scrollbar-admin">
            <table className="w-full table-fixed">
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-[hsl(var(--admin-active))] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Đang tải...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <UsersIcon className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-sm font-medium">Không tìm thấy người dùng</p>
                        <p className="text-xs text-muted-foreground">
                          {searchQuery ? 'Thử điều chỉnh tìm kiếm' : 'Bắt đầu bằng cách thêm người dùng mới'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="w-16 p-3 text-center">{currentPage * pageSize + index + 1}</td>
                      <td className="w-96 p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-[hsl(var(--admin-active))]/10">
                            <AvatarImage 
                              src={user.avatar || user.profileImage || DEFAULT_AVATAR_URL} 
                              alt={user.name}
                              onError={(e: any) => {
                                e.currentTarget.src = DEFAULT_AVATAR_URL;
                              }}
                            />
                            <AvatarFallback className="bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold">
                              {user.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm truncate">{user.name}</span>
                            {user.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                📱 {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="w-96 p-3">
                        <span className="text-sm truncate">{user.email}</span>
                      </td>
                      <td className="w-32 p-3">
                        <div className="flex items-center gap-2">
                          {isAdmin(user) ? (
                            <Badge variant="default" className="gap-1 bg-blue-600 hover:bg-blue-700">
                              <Shield className="w-3 h-3" />
                              ADMIN
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              USER
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="w-32 text-right p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(user)}
                            className="hover:bg-[hsl(var(--admin-hover))] hover:text-[hsl(var(--admin-hover-text))] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteClick(user)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between pt-4 flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{currentPage * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-foreground">{Math.min((currentPage + 1) * pageSize, totalElements)}</span> of{' '}
            <span className="font-semibold text-foreground">{totalElements}</span> users
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
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
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 border-[hsl(var(--admin-border))] ${
                    currentPage === pageNum 
                      ? "bg-[hsl(var(--admin-active))] text-[hsl(var(--admin-active-foreground))] font-semibold dark:hover:bg-[hsl(var(--admin-active))] dark:hover:text-[hsl(var(--admin-active-foreground))]" 
                      : "hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
                  }`}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="h-8 w-8 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))] dark:hover:text-[hsl(var(--admin-hover-text))]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedUser ? {
          name: selectedUser.name,
          email: selectedUser.email,
          // Đúng: 1 là user, 2 là admin
          role: isAdmin(selectedUser) ? 'admin' : 'user',
          avatar: selectedUser.avatar || '',
          phone: selectedUser.phone || '',
          address: selectedUser.address || '',
        } : undefined}
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