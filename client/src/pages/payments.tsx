import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Banknote,
  Plus,
  Eye,
  Mail,
  FileText,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import type { Payment, Tenant, Property, Expense, PaymentHistory } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import { InvoiceTemplate } from "@/components/invoice-template";
import { createPortal } from "react-dom";
import { generatePropertyReportPDF } from "@/lib/pdf-generators";

type PaymentWithDetails = Payment & { tenantName: string; propertyName: string };

function PaymentStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    paid: { label: "Paid", variant: "default" as const, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
    pending: { label: "Pending", variant: "secondary" as const, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
    overdue: { label: "Overdue", variant: "destructive" as const, icon: AlertCircle, color: "text-red-600 dark:text-red-400" },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function PaymentMethodBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-muted-foreground">-</span>;

  const methodConfig: Record<string, { label: string; icon: React.ElementType }> = {
    bank_transfer: { label: "Bank Transfer", icon: Banknote },
    check: { label: "Check", icon: CreditCard },
    cash: { label: "Cash", icon: DollarSign },
    online: { label: "Online", icon: CreditCard },
  };
  const config = methodConfig[method] || { label: method, icon: CreditCard };
  const Icon = config.icon;

  return (
    <span className="flex items-center gap-1 text-sm">
      <Icon className="h-3 w-3 text-muted-foreground" />
      {config.label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-9 w-9 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
    </TableRow>
  );
}

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const { toast } = useToast();

  const { user } = useAuth();
  const currencySymbol = user?.currency || "KSH";
  const [method, setMethod] = useState<string>("m_pesa");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [viewingPayment, setViewingPayment] = useState<PaymentWithDetails | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<PaymentWithDetails | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const canDeletePayment = (paymentDateStr: string) => {
    try {
      const paymentDate = new Date(paymentDateStr);
      const now = new Date();
      const monthDiff = (now.getFullYear() - paymentDate.getFullYear()) * 12 + (now.getMonth() - paymentDate.getMonth());
      return monthDiff <= 1 && monthDiff >= 0;
    } catch (e) {
      return false;
    }
  };

  const handleDownloadInvoice = (payment: PaymentWithDetails) => {
    setInvoiceToPrint(payment);
    // Give react a moment to render the portal content
    setTimeout(() => {
      window.print();
      setInvoiceToPrint(null);
    }, 100);
  };

  const handleGenerateReport = () => {
    if (!user || !payments || payments.length === 0) {
      toast({
        title: "No Data",
        description: "No payments to generate report from.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, generate a simple payments report
      // In the future, this could be expanded to include property selection
      generatePropertyReportPDF(
        user,
        { name: "All Properties", address: "", city: "", state: "", zipCode: "" } as any,
        payments,
        [] // Empty expenses array for now
      );
      toast({
        title: "Success",
        description: "Payment report PDF downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newPaymentTenantId, setNewPaymentTenantId] = useState<string>("");
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentDueDate, setNewPaymentDueDate] = useState<string>("");

  const { data: payments, isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: paymentHistory } = useQuery<PaymentHistory[]>({
    queryKey: [`/api/payments/${viewingPayment?.id}/transactions`],
    enabled: !!viewingPayment?.id,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiRequest("POST", `/api/payments/${paymentId}/transactions`, {
        amount: parseFloat(paidAmount),
        date: new Date().toISOString().split("T")[0],
        method,
        reference,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSelectedPayment(null);
      setReference("");
      setNotes("");
      setPaidAmount("");
      toast({
        title: "Payment Recorded",
        description: "Transaction added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const tenant = tenants?.find(t => t.id === data.tenantId);
      if (!tenant) throw new Error("Tenant not found");
      return apiRequest("POST", "/api/payments", {
        ...data,
        propertyId: tenant.propertyId,
        status: "pending",
        paidAmount: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsNewDialogOpen(false);
      setNewPaymentTenantId("");
      setNewPaymentAmount("");
      setNewPaymentDueDate("");
      toast({
        title: "Payment record created",
        description: "A new pending payment has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create payment record.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeletePaymentId(null);
      toast({
        title: "Payment deleted",
        description: "The payment record has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete payment record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalReceived = payments?.filter(p => p.status === "paid").reduce((sum, p) => sum + (p.paidAmount || 0), 0) || 0;
  const pendingAmount = payments?.filter(p => p.status === "pending").reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0) || 0;
  const overdueAmount = payments?.filter(p => p.status === "overdue").reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0) || 0;
  const totalPayments = payments?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage rent payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateReport}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button onClick={() => setIsNewDialogOpen(true)} data-testid="button-new-payment">
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Received"
          value={formatCurrency(totalReceived, user?.currency ?? undefined)}
          subtitle="This month"
          icon={TrendingUp}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <MetricCard
          title="Pending"
          value={formatCurrency(pendingAmount, user?.currency ?? undefined)}
          subtitle="Awaiting payment"
          icon={Clock}
          color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
        />
        <MetricCard
          title="Overdue"
          value={formatCurrency(overdueAmount, user?.currency ?? undefined)}
          subtitle="Past due date"
          icon={AlertCircle}
          color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        />
        <MetricCard
          title="Total Transactions"
          value={totalPayments}
          subtitle="All time"
          icon={CreditCard}
          color="bg-accent text-accent-foreground"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-payments"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Total Rent</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  <TableSkeleton />
                  <TableSkeleton />
                  <TableSkeleton />
                  <TableSkeleton />
                  <TableSkeleton />
                </>
              ) : filteredPayments && filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell className="font-medium">{payment.tenantName}</TableCell>
                    <TableCell>{payment.propertyName}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount, user?.currency ?? undefined)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(payment.paidAmount || 0, user?.currency ?? undefined)}</TableCell>
                    <TableCell className="font-bold text-red-600">{formatCurrency(payment.amount - (payment.paidAmount || 0), user?.currency ?? undefined)}</TableCell>
                    <TableCell>{payment.dueDate}</TableCell>
                    <TableCell>
                      <PaymentMethodBadge method={payment.method} />
                      {payment.reference && (
                        <div className="text-xs text-muted-foreground">{payment.reference}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Download Invoice"
                          onClick={() => handleDownloadInvoice(payment)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {payment.status !== "paid" && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                            data-testid={`button-record-payment-${payment.id}`}
                          >
                            Record Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingPayment(payment)}
                        >
                          View Details
                        </Button>
                        {canDeletePayment(payment.dueDate) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletePaymentId(payment.id)}
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No payments found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Payments will appear here once tenants are added"}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      {/* Record Payment Dialog (Marking existing as paid) */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium text-lg">{currencySymbol} {selectedPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-medium text-green-600">{currencySymbol} {(selectedPayment.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground font-semibold font-lg">Remaining Balance</span>
                  <span className="font-bold text-xl text-red-600">{currencySymbol} {(selectedPayment.amount - (selectedPayment.paidAmount || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Amount ({currencySymbol})</label>
                <Input
                  type="number"
                  placeholder="Enter amount collected..."
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m_pesa">M-Pesa</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reference / Trans ID
                  {(method === 'm_pesa' || method === 'bank_transfer') && <span className="text-red-500">*</span>}
                </label>
                <Input
                  placeholder={method === 'm_pesa' ? "e.g. QHB456..." : "Transaction Ref"}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes / SMS Message</label>
                <Textarea
                  placeholder="Paste M-Pesa message or add custom notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedPayment(null)} data-testid="button-cancel-payment">
                  Cancel
                </Button>
                <Button
                  onClick={() => markPaidMutation.mutate(selectedPayment.id)}
                  disabled={markPaidMutation.isPending}
                  data-testid="button-confirm-payment"
                >
                  {markPaidMutation.isPending ? "Processing..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Payment Dialog (Creating new record) */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Payment Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant</label>
              <Select value={newPaymentTenantId} onValueChange={setNewPaymentTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount ({currencySymbol})</label>
              <Input
                type="number"
                placeholder="0.00"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={newPaymentDueDate}
                onChange={(e) => setNewPaymentDueDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createPaymentMutation.mutate({
                  tenantId: newPaymentTenantId,
                  amount: parseFloat(newPaymentAmount),
                  dueDate: newPaymentDueDate,
                })}
                disabled={createPaymentMutation.isPending || !newPaymentTenantId || !newPaymentAmount || !newPaymentDueDate}
              >
                {createPaymentMutation.isPending ? "Sharing..." : "Create Record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payment Details Dialog */}
      <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {viewingPayment && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-md space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tenant</span>
                  <span className="font-semibold">{viewingPayment.tenantName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-semibold">{viewingPayment.propertyName}</span>
                </div>
                <div className="flex justify-between items-center text-lg border-t pt-2">
                  <span className="font-medium text-muted-foreground">Total Rent</span>
                  <span className="font-bold">{currencySymbol} {viewingPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-green-600">{currencySymbol} {(viewingPayment.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-lg border-t pt-2">
                  <span className="font-bold">Remaining Balance</span>
                  <span className="font-extrabold text-red-600">{currencySymbol} {(viewingPayment.amount - (viewingPayment.paidAmount || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Due Date</p>
                  <p className="font-medium">{viewingPayment.dueDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status</p>
                  <PaymentStatusBadge status={viewingPayment.status} />
                </div>
                {viewingPayment.paidDate && (
                  <div>
                    <p className="text-muted-foreground mb-1">Last Paid On</p>
                    <p className="font-medium">{viewingPayment.paidDate}</p>
                  </div>
                )}
                {viewingPayment.method && (
                  <div>
                    <p className="text-muted-foreground mb-1">Payment Method</p>
                    <PaymentMethodBadge method={viewingPayment.method} />
                  </div>
                )}
              </div>

              {viewingPayment.reference && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Reference / Transaction ID</p>
                  <p className="font-mono bg-accent p-2 rounded">{viewingPayment.reference}</p>
                </div>
              )}

              {viewingPayment.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <div className="bg-accent p-3 rounded italic whitespace-pre-wrap">
                    "{viewingPayment.notes}"
                  </div>
                </div>
              )}

              {/* Payment History Table */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Transaction History
                </h4>
                {paymentHistory && paymentHistory.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="h-8">Date</TableHead>
                          <TableHead className="h-8">Amount</TableHead>
                          <TableHead className="h-8">Method</TableHead>
                          <TableHead className="h-8">Ref</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="py-2">{h.date}</TableCell>
                            <TableCell className="py-2 font-medium">{currencySymbol} {h.amount.toLocaleString()}</TableCell>
                            <TableCell className="py-2 capitalize">{h.method?.replace('_', ' ') || '-'}</TableCell>
                            <TableCell className="py-2 font-mono text-xs">{h.reference || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No transactions recorded yet.</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewingPayment(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Render Portal - Only visible when printing */}
      {invoiceToPrint && user && createPortal(
        <div className="fixed inset-0 z-[9999] bg-white print:static print:block hidden">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * { visibility: hidden; }
              #invoice-to-print, #invoice-to-print * { visibility: visible; }
              #invoice-to-print { position: absolute; left: 0; top: 0; width: 100%; }
            }
          ` }} />
          <div id="invoice-to-print">
            <InvoiceTemplate payment={invoiceToPrint} user={user} />
          </div>
        </div>,
        document.body
      )}
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePaymentId && deletePaymentMutation.mutate(deletePaymentId)}
            >
              {deletePaymentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
