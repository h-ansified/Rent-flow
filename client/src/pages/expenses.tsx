import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
    Plus,
    TrendingUp,
    Clock,
    AlertCircle,
    CheckCircle2,
    Zap,
    Repeat,
    FileText,
    Loader2,
    ZapIcon,
    Droplets,
    Wrench,
    Shield,
    Receipt,
    LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Expense, Property } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency-utils";
import { generateExpenseReportPDF } from "@/lib/pdf-generators";

type ExpenseWithProperty = Expense & { propertyName?: string };

interface CategoryStats {
    totalAmount: number;
    paidAmount: number;
    pendingCount: number;
    overdueCount: number;
    count: number;
}

const categoryIcons: Record<string, any> = {
    electricity: ZapIcon,
    water: Droplets,
    maintenance: Wrench,
    insurance: Shield,
    tax: Receipt,
    other: LayoutGrid,
};

function ExpenseStatusBadge({ status }: { status: string }) {
    const statusConfig = {
        paid: { label: "Paid", variant: "default" as const, icon: CheckCircle2 },
        pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
        overdue: { label: "Overdue", variant: "destructive" as const, icon: AlertCircle },
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

function CategoryBadge({ category }: { category: string }) {
    const categoryConfig: Record<string, { label: string; color: string }> = {
        electricity: { label: "Electricity", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" },
        water: { label: "Water", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30" },
        maintenance: { label: "Maintenance", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30" },
        insurance: { label: "Insurance", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30" },
        tax: { label: "Tax", color: "bg-red-100 text-red-700 dark:bg-red-900/30" },
        other: { label: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30" },
    };
    const config = categoryConfig[category] || categoryConfig.other;

    return (
        <Badge variant="outline" className={config.color}>
            {config.label}
        </Badge>
    );
}

function CategoryCard({
    category,
    stats,
    isSelected,
    onClick
}: {
    category: string;
    stats: CategoryStats;
    isSelected: boolean;
    onClick: () => void;
}) {
    const { user } = useAuth();
    const Icon = categoryIcons[category] || LayoutGrid;
    const balance = stats.totalAmount - stats.paidAmount;

    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}
            onClick={onClick}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-medium capitalize">{category}</CardTitle>
                            <p className="text-xs text-muted-foreground">{stats.count} expenses</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">{formatCurrency(stats.totalAmount, user?.currency ?? undefined)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Paid</span>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(stats.paidAmount, user?.currency ?? undefined)}</span>
                </div>
                <div className="flex justify-between items-baseline border-t pt-2">
                    <span className="text-xs font-medium">Balance</span>
                    <span className="text-base font-bold text-red-600">{formatCurrency(balance, user?.currency ?? undefined)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                    {stats.pendingCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {stats.pendingCount} pending
                        </Badge>
                    )}
                    {stats.overdueCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {stats.overdueCount} overdue
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Expenses() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const { toast } = useToast();
    const { user } = useAuth();

    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<ExpenseWithProperty | null>(null);
    const [viewingExpense, setViewingExpense] = useState<ExpenseWithProperty | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("electricity");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState("monthly");
    const [propertyId, setPropertyId] = useState<string>("");
    const [notes, setNotes] = useState("");

    // Payment recording state
    const [paidAmount, setPaidAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("m_pesa");
    const [reference, setReference] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");

    const { data: expenses, isLoading, error } = useQuery<ExpenseWithProperty[]>({
        queryKey: ["/api/expenses"],
        retry: 1,
    });

    const { data: properties } = useQuery<Property[]>({
        queryKey: ["/api/properties"],
    });

    // Handle error state
    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Database Error</AlertTitle>
                    <AlertDescription>
                        Failed to load expenses. This usually means the expenses table hasn't been created yet.
                        <br /><br />
                        <strong>To fix this:</strong> Run <code className="bg-muted px-2 py-1 rounded">npm run db:push</code> in your terminal.
                        <br /><br />
                        If PowerShell gives an error, first run: <code className="bg-muted px-2 py-1 rounded">Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser</code>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const createExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest("POST", "/api/expenses", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            resetForm();
            setIsNewDialogOpen(false);
            toast({
                title: "Success",
                description: "Expense created successfully.",
            });
        },
        onError: (error: any) => {
            console.error("Expense creation error:", error);
            toast({
                title: "Error",
                description: error?.message || "Failed to create expense. Please try again.",
                variant: "destructive",
            });
        },
    });

    const recordPaymentMutation = useMutation({
        mutationFn: async (expenseId: string) => {
            return apiRequest("PATCH", `/api/expenses/${expenseId}`, {
                paidAmount: parseFloat(paidAmount),
                paymentMethod,
                reference,
                notes: paymentNotes,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            setSelectedExpense(null);
            setPaidAmount("");
            setReference("");
            setPaymentNotes("");
            toast({
                title: "Success",
                description: "Payment recorded successfully.",
            });
        },
        onError: (error: any) => {
            console.error("Payment recording error:", error);
            toast({
                title: "Error",
                description: error?.message || "Failed to record payment. Please try again.",
                variant: "destructive",
            });
        },
    });

    const resetForm = () => {
        setTitle("");
        setCategory("electricity");
        setAmount("");
        setDueDate("");
        setExpiryDate("");
        setIsRecurring(false);
        setFrequency("monthly");
        setPropertyId("");
        setNotes("");
    };

    const handleCreateExpense = () => {
        if (!title || !amount || !dueDate) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        createExpenseMutation.mutate({
            title,
            category,
            amount: parseFloat(amount),
            dueDate,
            expiryDate: expiryDate || null,
            isRecurring,
            frequency: isRecurring ? frequency : null,
            propertyId: propertyId || null,
            notes,
            status: "pending",
        });
    };

    const handleGenerateReport = () => {
        if (!user || !expenses || expenses.length === 0) {
            toast({
                title: "No Data",
                description: "No expenses to generate report from.",
                variant: "destructive",
            });
            return;
        }

        try {
            generateExpenseReportPDF(user, expenses);
            toast({
                title: "Success",
                description: "Expense report PDF downloaded successfully.",
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

    // Calculate category stats
    const categoryStats = expenses?.reduce((acc, expense) => {
        if (!acc[expense.category]) {
            acc[expense.category] = {
                totalAmount: 0,
                paidAmount: 0,
                pendingCount: 0,
                overdueCount: 0,
                count: 0,
            };
        }
        acc[expense.category].totalAmount += expense.amount;
        acc[expense.category].paidAmount += expense.paidAmount;
        if (expense.status === 'pending') acc[expense.category].pendingCount++;
        if (expense.status === 'overdue') acc[expense.category].overdueCount++;
        acc[expense.category].count++;
        return acc;
    }, {} as Record<string, CategoryStats>) || {};

    const filteredExpenses = expenses?.filter((expense) => {
        const matchesSearch = expense.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    // Calculate metrics
    const totalExpenses = expenses?.reduce((sum, e) => sum + e.paidAmount, 0) || 0;
    const pendingExpenses = expenses?.filter(e => e.status === "pending").length || 0;
    const overdueExpenses = expenses?.filter(e => e.status === "overdue").length || 0;
    const recurringCount = expenses?.filter(e => e.isRecurring).length || 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold">Expenses</h1>
                    <p className="text-muted-foreground mt-1">Track and manage recurring and one-time expenses</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerateReport}>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                    </Button>
                    <Button onClick={() => setIsNewDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
                        <div className="h-9 w-9 rounded-md flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{formatCurrency(totalExpenses, user?.currency ?? undefined)}</div>
                        <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                        <div className="h-9 w-9 rounded-md flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{pendingExpenses}</div>
                        <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
                        <div className="h-9 w-9 rounded-md flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{overdueExpenses}</div>
                        <p className="text-xs text-muted-foreground mt-1">Past due date</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Recurring</CardTitle>
                        <div className="h-9 w-9 rounded-md flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Repeat className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{recurringCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Auto-tracked</p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Tiles */}
            {Object.keys(categoryStats).length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Expenses by Category</h2>
                        {categoryFilter !== "all" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCategoryFilter("all")}
                            >
                                Clear Filter
                            </Button>
                        )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(categoryStats).map(([cat, stats]) => (
                            <CategoryCard
                                key={cat}
                                category={cat}
                                stats={stats}
                                isSelected={categoryFilter === cat}
                                onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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

            {/* Expenses Table */}
            {categoryFilter !== "all" && (
                <Alert>
                    <LayoutGrid className="h-4 w-4" />
                    <AlertTitle>Filtered by Category</AlertTitle>
                    <AlertDescription>
                        Showing only <strong className="capitalize">{categoryFilter}</strong> expenses. Click the category tile again or use the "Clear Filter" button to show all.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Paid</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    {[1, 2, 3].map((i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            ) : filteredExpenses && filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {expense.isRecurring && <Repeat className="h-3 w-3 text-muted-foreground" />}
                                                {expense.title}
                                            </div>
                                        </TableCell>
                                        <TableCell><CategoryBadge category={expense.category} /></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{expense.propertyName || "General"}</TableCell>
                                        <TableCell className="font-medium">{formatCurrency(expense.amount, user?.currency ?? undefined)}</TableCell>
                                        <TableCell className="text-green-600">{formatCurrency(expense.paidAmount, user?.currency ?? undefined)}</TableCell>
                                        <TableCell className="font-bold text-red-600">{formatCurrency(expense.amount - expense.paidAmount, user?.currency ?? undefined)}</TableCell>
                                        <TableCell>{expense.dueDate}</TableCell>
                                        <TableCell><ExpenseStatusBadge status={expense.status} /></TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {expense.status !== "paid" && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setSelectedExpense(expense)}
                                                    >
                                                        Record Payment
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setViewingExpense(expense)}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center">
                                        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No expenses found</h3>
                                        <p className="text-muted-foreground">
                                            {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                                                ? "Try adjusting your search or filters"
                                                : "Add your first expense to start tracking"}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Expense Dialog */}
            <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., KPLC - Main Building"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="electricity">Electricity</SelectItem>
                                        <SelectItem value="water">Water</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                        <SelectItem value="insurance">Insurance</SelectItem>
                                        <SelectItem value="tax">Tax</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="property">Property (Optional)</Label>
                                <Select value={propertyId} onValueChange={setPropertyId}>
                                    <SelectTrigger id="property">
                                        <SelectValue placeholder="General expense" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">General</SelectItem>
                                        {properties?.map(prop => (
                                            <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount ({user?.currency || "KES"}) *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Due Date *</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="expiryDate">Expiry/Cutoff Date (Optional)</Label>
                                <Input
                                    id="expiryDate"
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isRecurring"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="isRecurring" className="cursor-pointer">Recurring Expense</Label>
                                </div>
                            </div>
                            {isRecurring && (
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="frequency">Frequency</Label>
                                    <Select value={frequency} onValueChange={setFrequency}>
                                        <SelectTrigger id="frequency">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="annually">Annually</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add any additional notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => { setIsNewDialogOpen(false); resetForm(); }}>Cancel</Button>
                            <Button onClick={handleCreateExpense} disabled={createExpenseMutation.isPending}>
                                {createExpenseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {createExpenseMutation.isPending ? "Creating..." : "Create Expense"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Record Payment Dialog */}
            <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    {selectedExpense && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-md space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Amount</span>
                                    <span className="font-medium text-lg">{formatCurrency(selectedExpense.amount, user?.currency ?? undefined)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Already Paid</span>
                                    <span className="font-medium text-green-600">{formatCurrency(selectedExpense.paidAmount, user?.currency ?? undefined)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2">
                                    <span className="text-muted-foreground font-semibold">Remaining Balance</span>
                                    <span className="font-bold text-xl text-red-600">{formatCurrency(selectedExpense.amount - selectedExpense.paidAmount, user?.currency ?? undefined)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Payment Amount ({user?.currency || "KES"}) *</Label>
                                <Input
                                    type="number"
                                    placeholder="Enter amount paid..."
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="m_pesa">M-Pesa</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="check">Check</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Reference / Trans ID</Label>
                                <Input
                                    placeholder="Transaction reference..."
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    placeholder="Add notes..."
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" onClick={() => setSelectedExpense(null)}>Cancel</Button>
                                <Button
                                    onClick={() => recordPaymentMutation.mutate(selectedExpense.id)}
                                    disabled={recordPaymentMutation.isPending || !paidAmount}
                                >
                                    {recordPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {recordPaymentMutation.isPending ? "Processing..." : "Confirm Payment"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={!!viewingExpense} onOpenChange={() => setViewingExpense(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Expense Details</DialogTitle>
                    </DialogHeader>
                    {viewingExpense && (
                        <div className="space-y-6">
                            <div className="p-4 bg-muted rounded-md space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Title</span>
                                    <span className="font-semibold">{viewingExpense.title}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Category</span>
                                    <CategoryBadge category={viewingExpense.category} />
                                </div>
                                {viewingExpense.propertyName && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Property</span>
                                        <span className="font-semibold">{viewingExpense.propertyName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-lg border-t pt-2">
                                    <span className="font-medium text-muted-foreground">Total Amount</span>
                                    <span className="font-bold">{formatCurrency(viewingExpense.amount, user?.currency ?? undefined)}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium text-muted-foreground">Amount Paid</span>
                                    <span className="font-bold text-green-600">{formatCurrency(viewingExpense.paidAmount, user?.currency ?? undefined)}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg border-t pt-2">
                                    <span className="font-bold">Balance</span>
                                    <span className="font-extrabold text-red-600">{formatCurrency(viewingExpense.amount - viewingExpense.paidAmount, user?.currency ?? undefined)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1">Due Date</p>
                                    <p className="font-medium">{viewingExpense.dueDate}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Status</p>
                                    <ExpenseStatusBadge status={viewingExpense.status} />
                                </div>
                                {viewingExpense.expiryDate && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Expiry Date</p>
                                        <p className="font-medium">{viewingExpense.expiryDate}</p>
                                    </div>
                                )}
                                {viewingExpense.isRecurring && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Recurring</p>
                                        <div className="flex items-center gap-1">
                                            <Repeat className="h-3 w-3" />
                                            <p className="font-medium capitalize">{viewingExpense.frequency}</p>
                                        </div>
                                    </div>
                                )}
                                {viewingExpense.paidDate && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Last Paid Date</p>
                                        <p className="font-medium">{viewingExpense.paidDate}</p>
                                    </div>
                                )}
                                {viewingExpense.paymentMethod && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Payment Method</p>
                                        <p className="font-medium capitalize">{viewingExpense.paymentMethod.replace('_', ' ')}</p>
                                    </div>
                                )}
                            </div>

                            {viewingExpense.reference && (
                                <div className="text-sm">
                                    <p className="text-muted-foreground mb-1">Reference / Transaction ID</p>
                                    <p className="font-mono bg-accent p-2 rounded">{viewingExpense.reference}</p>
                                </div>
                            )}

                            {viewingExpense.notes && (
                                <div className="text-sm">
                                    <p className="text-muted-foreground mb-1">Notes</p>
                                    <div className="bg-accent p-3 rounded italic whitespace-pre-wrap">
                                        "{viewingExpense.notes}"
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setViewingExpense(null)}>Close</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
