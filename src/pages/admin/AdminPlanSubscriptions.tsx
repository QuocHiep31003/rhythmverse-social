import { useState, useEffect, Fragment } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { premiumSubscriptionApi, PremiumSubscriptionDTO, PageResponse } from "@/services/api/premiumSubscriptionApi";
import { Users, RefreshCw, Search, Trash2, Package, Filter, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminPlanSubscriptions = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<PageResponse<PremiumSubscriptionDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [groupedSubs, setGroupedSubs] = useState<{
    userKey: string;
    userEmail: string;
    userName: string;
    primary: PremiumSubscriptionDTO | null;
    items: PremiumSubscriptionDTO[];
  }[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<PremiumSubscriptionDTO | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Filter states
  const [searchEmail, setSearchEmail] = useState("");
  const [filterPlanCode, setFilterPlanCode] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [planCodes, setPlanCodes] = useState<string[]>([]);

  useEffect(() => {
    loadSubscriptions();
  }, [page, filterPlanCode, filterStatus]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const rankSubscription = (sub: PremiumSubscriptionDTO) => {
    const status = (sub.status || sub.subscriptionStatus || "").toUpperCase();
    if (status === "ACTIVE") return 5;
    if (status === "TRIALING" || status === "SUCCESS" || status === "PAID") return 4;
    if (sub.isActive || sub.active) return 4;
    if (status === "PENDING") return 3;
    if (status === "CANCELLED") return 2;
    if (status === "EXPIRED") return 1;
    return 0;
  };

  const sortSubscriptions = (subs: PremiumSubscriptionDTO[]) => {
    return [...subs].sort((a, b) => {
      const rankDiff = rankSubscription(b) - rankSubscription(a);
      if (rankDiff !== 0) return rankDiff;
      const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
      const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
      if (bExp !== aExp) return bExp - aExp;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
  };

  const groupByUser = (list: PremiumSubscriptionDTO[]) => {
    const map = new Map<string, PremiumSubscriptionDTO[]>();
    list.forEach((sub) => {
      const key = sub.userId?.toString() || sub.userEmail || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sub);
    });
    const groups = Array.from(map.entries()).map(([key, items]) => {
      const sorted = sortSubscriptions(items);
      const primary = sorted[0] ?? null;
      return {
        userKey: key,
        userEmail: primary?.userEmail || "N/A",
        userName: primary?.userName || "N/A",
        primary,
        items: sorted,
      };
    });
    // Sort groups by primary rank then email
    return groups.sort((a, b) => {
      const rankDiff = rankSubscription(b.primary || {}) - rankSubscription(a.primary || {});
      if (rankDiff !== 0) return rankDiff;
      return (a.userEmail || "").localeCompare(b.userEmail || "");
    });
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      // Lấy tất cả subscriptions với filter
      const planCodeFilter = filterPlanCode !== "all" ? filterPlanCode : undefined;
      const statusFilter = filterStatus !== "all" ? filterStatus : undefined;
      
      console.log("Loading subscriptions with filters:", { statusFilter, page, size });
      
      const data = await premiumSubscriptionApi.listAll(
        undefined, // userId - không filter theo user
        statusFilter,
        page,
        size
      );
      
      console.log("Received subscriptions data:", data);
      
      if (!data || !data.content) {
        console.warn("No content in response");
        setSubscriptions({
          content: [],
          page: 0,
          size: size,
          totalElements: 0,
          totalPages: 0,
          last: true,
        });
        setPlanCodes([]);
        return;
      }
      
      // Loại bỏ gói FREE (admin không cần quản lý FREE)
      let filteredContent = data.content.filter(
        (sub) => sub.planCode?.toUpperCase() !== "FREE"
      );

      // Filter theo planCode nếu có
      if (planCodeFilter) {
        filteredContent = filteredContent.filter(
          sub => sub.planCode?.toUpperCase() === planCodeFilter.toUpperCase()
        );
      }
      
      // Filter theo email search nếu có
      if (searchEmail) {
        filteredContent = filteredContent.filter(
          sub => sub.userEmail?.toLowerCase().includes(searchEmail.toLowerCase())
        );
      }
      
      // Extract unique plan codes (bỏ FREE) cho filter dropdown
      const uniquePlanCodes = Array.from(
        new Set(
          data.content
            .filter(sub => sub.planCode?.toUpperCase() !== "FREE")
            .map(sub => sub.planCode)
            .filter(Boolean)
        )
      ).sort() as string[];
      setPlanCodes(uniquePlanCodes);
      
      console.log("Filtered content:", filteredContent.length, "items");
      
      // Update subscriptions với filtered data
      const grouped = groupByUser(filteredContent);
      const total = grouped.length;
      const start = page * size;
      const end = start + size;
      const pagedGroups = grouped.slice(start, end);

      setGroupedSubs(pagedGroups);
      setTotalGroups(total);

      setSubscriptions({
        ...data,
        content: filteredContent,
        totalElements: total,
        totalPages: Math.ceil(total / size),
      });
    } catch (error: any) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Error",
        description: error?.message || "Unable to load subscriptions",
        variant: "destructive",
      });
      setSubscriptions({
        content: [],
        page: 0,
        size: size,
        totalElements: 0,
        totalPages: 0,
        last: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadSubscriptions();
  };

  const handleResetFilters = () => {
    setSearchEmail("");
    setFilterPlanCode("all");
    setFilterStatus("all");
    setPage(0);
  };

  const handleCancelClick = async (subscription: PremiumSubscriptionDTO) => {
    if (!subscription.id) return;
    
    try {
      setLoadingDetail(true);
      // Lấy thông tin chi tiết subscription từ API
      const detail = await premiumSubscriptionApi.getSubscriptionById(subscription.id);
      setSubscriptionToCancel(detail);
      setCancelReason("");
      setCancelDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Unable to load subscription details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!subscriptionToCancel?.id) return;

    try {
      await premiumSubscriptionApi.cancelSubscription(subscriptionToCancel.id, cancelReason);
      toast({
        title: "Success",
        description: "Subscription cancelled successfully. User will be notified via email.",
      });
      setCancelDialogOpen(false);
      setSubscriptionToCancel(null);
      setCancelReason("");
      
      // Reload data
      await loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Unable to cancel subscription",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount?: number, currency?: string) => {
    if (!amount) return "N/A";
    return `${Number(amount).toLocaleString("vi-VN")} ${currency || "VND"}`;
  };

  const getStatusBadge = (status?: string) => {
    const statusUpper = status?.toUpperCase() || "";
    if (statusUpper === "ACTIVE") {
      return <Badge className="bg-green-500">Active</Badge>;
    } else if (statusUpper === "CANCELLED") {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else if (statusUpper === "EXPIRED") {
      return <Badge variant="secondary">Expired</Badge>;
    } else if (statusUpper === "PENDING") {
      return <Badge variant="outline">Pending</Badge>;
    }
    return <Badge variant="secondary">{status || "Unknown"}</Badge>;
  };

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[hsl(var(--admin-hover))]/20 via-[hsl(var(--admin-hover))]/10 to-transparent p-6 rounded-xl border border-[hsl(var(--admin-border))] flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[hsl(var(--admin-active))] rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-[hsl(var(--admin-active-foreground))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--admin-active-foreground))]">
                Subscriptions Management
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-normal">
                  {totalGroups || 0} users
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadSubscriptions}
              className="gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mb-4 bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search by Email</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter user email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="bg-background"
                  />
                  <Button onClick={handleSearch} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Code</label>
                <Select value={filterPlanCode} onValueChange={setFilterPlanCode}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {planCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="w-full gap-2"
                >
                  <X className="h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card className="flex-1 overflow-hidden flex flex-col bg-[hsl(var(--admin-card))] border-[hsl(var(--admin-border))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subscriptions Management
            </CardTitle>
            <CardDescription>
              One row per user. Expand to see all subscriptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Loading subscriptions...</span>
              </div>
            ) : groupedSubs && groupedSubs.length > 0 ? (
              <>
                <div className="rounded-md border border-[hsl(var(--admin-border))] overflow-auto flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>User Email</TableHead>
                        <TableHead>User Name</TableHead>
                        <TableHead>Current</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedSubs.map((group) => {
                        const sub = group.primary;
                        const isExpanded = expanded.has(group.userKey);
                        return (
                          <Fragment key={group.userKey}>
                            <TableRow key={group.userKey}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleExpand(group.userKey)}
                                  aria-label={isExpanded ? "Collapse" : "Expand"}
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{group.userEmail}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{sub?.planName || sub?.planCode || "N/A"}</span>
                                    {getStatusBadge(sub?.status)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {sub?.expiresAt ? `Expires: ${formatDate(sub.expiresAt)}` : "No expiry (Credits)"}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${group.userKey}-details`}>
                                <TableCell colSpan={4} className="bg-muted/40">
                                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                    {group.items.length} subscriptions
                                  </div>
                                  <div className="rounded border border-[hsl(var(--admin-border))]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Plan</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Started</TableHead>
                                          <TableHead>Expires</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {group.items.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>
                                              <div className="flex flex-col">
                                                <span className="font-medium">{item.planName || item.planCode || "N/A"}</span>
                                                <span className="text-xs text-muted-foreground">{item.planCode}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell>{formatPrice(item.amount, item.currency)}</TableCell>
                                            <TableCell>{formatDate(item.startsAt)}</TableCell>
                                            <TableCell>
                                              {item.expiresAt ? formatDate(item.expiresAt) : "No expiry (Credits)"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {item.status?.toUpperCase() === "ACTIVE" && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleCancelClick(item)}
                                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                  <Trash2 className="h-4 w-4 mr-1" />
                                                  Cancel
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {subscriptions?.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[hsl(var(--admin-border))]">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} of {subscriptions?.totalPages} 
                      ({totalGroups} users)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPage(page - 1);
                        }}
                        disabled={page === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPage(page + 1);
                        }}
                        disabled={page >= subscriptions.totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-semibold mb-2">No subscriptions found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchEmail || filterPlanCode !== "all" || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "No subscriptions in the system"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchEmail("");
                    setFilterPlanCode("all");
                    setFilterStatus("all");
                    setPage(0);
                    loadSubscriptions();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload All Subscriptions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription? The user will be notified via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading subscription details...</span>
              </div>
            ) : subscriptionToCancel ? (
              <div className="space-y-4">
                {/* User Information */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    User Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{subscriptionToCancel.userEmail || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{subscriptionToCancel.userName || "N/A"}</p>
                    </div>
                    {subscriptionToCancel.userPhone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <p className="font-medium">{subscriptionToCancel.userPhone}</p>
                      </div>
                    )}
                    {subscriptionToCancel.userAddress && (
                      <div>
                        <span className="text-muted-foreground">Address:</span>
                        <p className="font-medium">{subscriptionToCancel.userAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Subscription Information */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Subscription Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Plan Code:</span>
                      <p className="font-medium">{subscriptionToCancel.planCode || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Plan Name:</span>
                      <p className="font-medium">{subscriptionToCancel.planName || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">{formatPrice(subscriptionToCancel.amount, subscriptionToCancel.currency)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">{getStatusBadge(subscriptionToCancel.status)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started:</span>
                      <p className="font-medium">{formatDate(subscriptionToCancel.startsAt)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expires:</span>
                      <p className="font-medium">
                        {subscriptionToCancel.expiresAt 
                          ? formatDate(subscriptionToCancel.expiresAt) 
                          : "No expiry (Credits)"}
                      </p>
                    </div>
                    {subscriptionToCancel.orderCode && (
                      <div>
                        <span className="text-muted-foreground">Order Code:</span>
                        <p className="font-medium">{subscriptionToCancel.orderCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cancellation Reason (Optional)</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlanSubscriptions;
