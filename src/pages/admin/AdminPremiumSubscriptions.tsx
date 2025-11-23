import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Crown,
  Filter,
  RefreshCw,
  Loader2
} from "lucide-react";
import { premiumSubscriptionApi, PremiumSubscriptionDTO } from "@/services/api/premiumSubscriptionApi";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminPremiumSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<PremiumSubscriptionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    loadSubscriptions();
  }, [currentPage, statusFilter, userIdFilter]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const userId = userIdFilter ? parseInt(userIdFilter) : undefined;
      const status = statusFilter !== "all" ? statusFilter : undefined;
      
      const response = await premiumSubscriptionApi.listAll(userId, status, currentPage, pageSize);
      
      let filtered = response.content;
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(sub => 
          sub.userEmail?.toLowerCase().includes(query) ||
          sub.planName?.toLowerCase().includes(query) ||
          sub.orderCode?.toString().includes(query) ||
          sub.userId?.toString().includes(query)
        );
      }
      
      setSubscriptions(filtered);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load premium subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus === "ACTIVE") {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    }
    if (normalizedStatus === "EXPIRED") {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (normalizedStatus === "CANCELLED") {
      return <Badge variant="outline">Cancelled</Badge>;
    }
    return <Badge variant="secondary">{status || "Unknown"}</Badge>;
  };

  const handleSearch = () => {
    setCurrentPage(0);
    loadSubscriptions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="w-8 h-8 text-primary" />
            Premium Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all premium subscriptions
          </p>
        </div>
        <Button onClick={loadSubscriptions} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by email, plan, order code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="User ID"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              type="number"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="w-full">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No subscriptions found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Order Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">ID: {sub.userId}</div>
                            <div className="text-sm text-muted-foreground">{sub.userEmail || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{sub.planName || sub.planCode || "-"}</div>
                          {sub.durationDays && (
                            <div className="text-xs text-muted-foreground">{sub.durationDays} days</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {sub.orderCode ? `#${sub.orderCode}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{formatCurrency(sub.amount)}</div>
                          {sub.currency && (
                            <div className="text-xs text-muted-foreground">{sub.currency}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sub.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(sub.startsAt || sub.startDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className={sub.status?.toUpperCase() === "ACTIVE" ? "text-green-500" : "text-red-500"}>
                            {formatDate(sub.expiresAt || sub.endDate || sub.currentPeriodEnd)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage + 1} / {totalPages} ({totalElements} subscriptions)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0 || loading}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1 || loading}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPremiumSubscriptions;






