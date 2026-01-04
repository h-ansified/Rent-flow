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
    Droplets,
    Wrench,
    Shield,
    Receipt,
    LayoutGrid,
    Calendar,
    ArrowUpRight,
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
    electricity: Zap,
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

    const categoryColors: Record<string, string> = {
        electricity: "from-yellow-500/20 to-yellow-600/10 text-yellow-500 border-yellow-500/20 shadow-yellow-500/5",
        water: "from-blue-500/20 to-blue-600/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
        maintenance: "from-orange-500/20 to-orange-600/10 text-orange-500 border-orange-500/20 shadow-orange-500/5",
        insurance: "from-purple-500/20 to-purple-600/10 text-purple-500 border-purple-500/20 shadow-purple-500/5",
        tax: "from-red-500/20 to-red-600/10 text-red-500 border-red-500/20 shadow-red-500/5",
        other: "from-emerald-500/20 to-emerald-600/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5",
    };

    const colorClass = categoryColors[category] || categoryColors.other;

    return (
        <div
            onClick={onClick}
            className={`liquid-glass rounded-[2rem] p-6 cursor-pointer transition-all duration-300 group ${isSelected ? 'ring-2 ring-primary border-primary/50 translate-y-[-4px] shadow-2xl' : 'hover:translate-y-[-2px] hover:shadow-xl'
                }`}
        >
            <div className="flex items-start justify-between mb-6">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colorClass} border flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Total Spent</p>
                    <p className="text-xl font-black tracking-tight">
                        {formatCurrency(stats.paidAmount, user?.currency ?? undefined)}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold capitalize mb-1">{category}</h3>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold bg-white/5 border-white/10">
                            {stats.count} {stats.count === 1 ? 'Entry' : 'Entries'}
                        </Badge>
                        {stats.overdueCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5 px-2 font-bold animate-pulse">
                                {stats.overdueCount} Overdue
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Payment Progress</span>
                        <span>{Math.round((stats.paidAmount / (stats.totalAmount || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            style={{ width: `${(stats.paidAmount / (stats.totalAmount || 1)) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExpenseTile({
    expense,
    onView,
    onRecord
}: {
    expense: ExpenseWithProperty;
    onView: () => void;
    onRecord: () => void;
}) {
    const { user } = useAuth();
    const Icon = categoryIcons[expense.category] || LayoutGrid;
    const balance = expense.amount - expense.paidAmount;
    const isPaid = expense.status === 'paid';

    const categoryColors: Record<string, string> = {
        electricity: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
        water: "bg-blue-500/20 text-blue-500 border-blue-500/30",
        maintenance: "bg-orange-500/20 text-orange-500 border-orange-500/30",
        insurance: "bg-purple-500/20 text-purple-500 border-purple-500/30",
        tax: "bg-red-500/20 text-red-500 border-red-500/30",
        other: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    };

    const colorClass = categoryColors[expense.category] || categoryColors.other;

    return (
        <div
            className="glass-card rounded-[2rem] p-6 flex flex-col gap-4 cursor-pointer group"
            onClick={onView}
        >
            <div className="flex items-start justify-between">
                <div className={`glass-icon-container ${colorClass} border`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-end gap-2">
                    <ExpenseStatusBadge status={expense.status} />
                    {expense.isRecurring && (
                        <Badge variant="outline" className="text-[10px] py-0 h-5 border-primary/30 text-primary">
                            <Repeat className="h-2.5 w-2.5 mr-1" />
                            {expense.frequency}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                    {expense.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                    {expense.propertyName || "General Expense"}
                </p>
            </div>

            <div className="mt-auto space-y-3">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remaining</p>
                        <p className={`text-xl font-black ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(balance, user?.currency ?? undefined)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p>
                        <p className="text-sm font-bold opacity-80">
                            {formatCurrency(expense.amount, user?.currency ?? undefined)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    {!isPaid && (
                        <Button
                            className="flex-1 rounded-2xl h-10 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRecord();
                            }}
                        >
                            Pay
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        className="rounded-2xl h-10 w-10 p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onView();
                        }}
                    >
                        <ArrowUpRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
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

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("electricity");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState("monthly");
    const [propertyId, setPropertyId] = useState("");
    const [notes, setNotes] = useState("");

    // Payment recording state
    const [paidAmount, setPaidAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("m_pesa");
    const [reference, setReference] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");

    const { data: expenses, isLoading, error } = useQuery<Expense[]>({
        queryKey: ["/api/expenses"],
        enabled: !!user,
    });

    const { data: properties } = useQuery<Property[]>({
        queryKey: ["/api/properties"],
        enabled: !!user,
    });

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
            const amountToRecord = parseFloat(paidAmount);
            if (isNaN(amountToRecord)) throw new Error("Invalid payment amount");

            return apiRequest("PATCH", `/api/expenses/${expenseId}`, {
                paidAmount: (selectedExpense?.paidAmount || 0) + amountToRecord,
                paymentMethod,
                reference,
                notes: paymentNotes,
                paidDate: new Date().toISOString().split("T")[0], // Explicitly set paid date
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

    // Handle error state AFTER all hooks have been called
    // REPLACED: We now show a plain empty state even on error to match other tabs
    // if (error) { ... }

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

        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid expense amount.",
                variant: "destructive",
            });
            return;
        }

        createExpenseMutation.mutate({
            title,
            category,
            amount: amountValue,
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: "Total Paid", value: totalExpenses, sub: "All time", icon: TrendingUp, color: "from-red-500 to-rose-600" },
                    { title: "Pending", value: pendingExpenses, sub: "Awaiting payment", icon: Clock, color: "from-yellow-400 to-orange-500" },
                    { title: "Overdue", value: overdueExpenses, sub: "Past due date", icon: AlertCircle, color: "from-red-600 to-red-800" },
                    { title: "Recurring", value: recurringCount, sub: "Auto-tracked", icon: Repeat, color: "from-blue-500 to-indigo-600" },
                ].map((metric, i) => (
                    <div key={i} className="liquid-glass rounded-[2rem] p-6 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${metric.color} opacity-10 blur-3xl -mr-16 -mt-16 group-hover:opacity-20 transition-opacity`} />
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{metric.title}</p>
                                <metric.icon className="h-4 w-4 text-muted-foreground opacity-50" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black tracking-tight">
                                    {typeof metric.value === 'number' ?
                                        (metric.title === 'Total Paid' ? formatCurrency(metric.value, user?.currency ?? undefined) : metric.value)
                                        : metric.value}
                                </h3>
                                <p className="text-[10px] font-medium text-muted-foreground opacity-70">{metric.sub}</p>
                            </div>
                        </div>
                    </div>
                ))}
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

            {/* Expenses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="glass-card rounded-[2rem] p-6 space-y-4 h-[280px]">
                            <Skeleton className="h-12 w-12 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <div className="mt-auto pt-8 flex justify-between items-end">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                                <Skeleton className="h-10 w-20 rounded-2xl" />
                            </div>
                        </div>
                    ))
                ) : filteredExpenses && filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                        <ExpenseTile
                            key={expense.id}
                            expense={expense}
                            onView={() => setViewingExpense(expense)}
                            onRecord={() => setSelectedExpense(expense)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center glass-card rounded-[3rem]">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                            <Zap className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">No expenses found</h3>
                        <p className="text-muted-foreground text-center max-w-sm">
                            {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                                ? "Try adjusting your search or filters to find what you're looking for."
                                : "Start tracking your business spend by adding your first expense today."}
                        </p>
                        <Button
                            variant="link"
                            className="mt-4 font-bold text-primary"
                            onClick={() => setIsNewDialogOpen(true)}
                        >
                            Add your first expense
                        </Button>
                    </div>
                )}
            </div>

            {/* Create Expense Dialog */}
            <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <div className="liquid-glass rounded-[2.5rem] overflow-hidden flex flex-col h-full max-h-[90vh]">
                        <div className="p-8 space-y-8 overflow-y-auto">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl font-black tracking-tight">Add Expense</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full hover:bg-white/10"
                                    onClick={() => { setIsNewDialogOpen(false); resetForm(); }}
                                >
                                    <Plus className="h-6 w-6 rotate-45" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Title *</Label>
                                    <Input
                                        className="rounded-2xl bg-white/5 border-white/10 h-12"
                                        placeholder="e.g., KPLC - Main Building"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Category *</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-white/10 liquid-glass">
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
                                    <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Property</Label>
                                    <Select value={propertyId} onValueChange={setPropertyId}>
                                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12">
                                            <SelectValue placeholder="General expense" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-white/10 liquid-glass text-foreground">
                                            <SelectItem value="">General</SelectItem>
                                            {properties?.map(prop => (
                                                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Amount ({user?.currency || "KES"}) *</Label>
                                    <Input
                                        className="rounded-2xl bg-white/5 border-white/10 h-12"
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Due Date *</Label>
                                    <Input
                                        className="rounded-2xl bg-white/5 border-white/10 h-12"
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>

                                <div className="col-span-2 p-4 bg-white/5 rounded-[2rem] border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                <Repeat className={`h-5 w-5 ${isRecurring ? 'text-blue-500' : 'text-blue-500/50'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Recurring Expense</p>
                                                <p className="text-[10px] text-muted-foreground tracking-tight">Toggle for monthly/annual payments</p>
                                            </div>
                                        </div>
                                        <button
                                            role="switch"
                                            aria-checked={isRecurring}
                                            onClick={() => setIsRecurring(!isRecurring)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isRecurring ? 'bg-primary' : 'bg-white/10'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {isRecurring && (
                                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2 block">Frequency</Label>
                                            <div className="flex gap-2">
                                                {['monthly', 'quarterly', 'annually'].map((freq) => (
                                                    <Button
                                                        key={freq}
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`flex-1 rounded-xl h-9 capitalize text-xs font-bold ${frequency === freq ? 'bg-primary text-white hover:bg-primary' : 'bg-white/5 hover:bg-white/10'}`}
                                                        onClick={() => setFrequency(freq)}
                                                    >
                                                        {freq}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Notes</Label>
                                    <Textarea
                                        className="rounded-2xl bg-white/5 border-white/10 min-h-[100px] resize-none"
                                        placeholder="Add any additional details..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-[1.5rem] h-14 font-bold border-white/10 hover:bg-white/5"
                                    onClick={() => { setIsNewDialogOpen(false); resetForm(); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-[2] rounded-[1.5rem] h-14 font-black text-lg shadow-xl shadow-primary/20"
                                    onClick={handleCreateExpense}
                                    disabled={createExpenseMutation.isPending}
                                >
                                    {createExpenseMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {createExpenseMutation.isPending ? "Creating..." : "Save Expense"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Record Payment Dialog */}
            <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <div className="liquid-glass rounded-[2.5rem] overflow-hidden flex flex-col h-full max-h-[90vh]">
                        {selectedExpense && (
                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black tracking-tight">Pay Expense</h2>
                                        <p className="text-xs text-muted-foreground opacity-70">{selectedExpense.title}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full hover:bg-white/10"
                                        onClick={() => setSelectedExpense(null)}
                                    >
                                        <Plus className="h-6 w-6 rotate-45" />
                                    </Button>
                                </div>

                                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Remaining Balance</p>
                                            <p className="text-3xl font-black text-red-500">{formatCurrency(selectedExpense.amount - selectedExpense.paidAmount, user?.currency ?? undefined)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total</p>
                                            <p className="text-sm font-bold opacity-60">{formatCurrency(selectedExpense.amount, user?.currency ?? undefined)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Amount to Pay ({user?.currency || "KES"}) *</Label>
                                        <Input
                                            className="rounded-2xl bg-white/5 border-white/10 h-14 text-xl font-bold"
                                            type="number"
                                            placeholder="0.00"
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Method</Label>
                                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-white/10 liquid-glass">
                                                    <SelectItem value="m_pesa">M-Pesa</SelectItem>
                                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="check">Check</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Reference</Label>
                                            <Input
                                                className="rounded-2xl bg-white/5 border-white/10 h-12"
                                                placeholder="TXN ID..."
                                                value={reference}
                                                onChange={(e) => setReference(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest px-1">Payment Notes</Label>
                                        <Textarea
                                            className="rounded-2xl bg-white/5 border-white/10 min-h-[80px] resize-none"
                                            placeholder="Optional notes..."
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-[1.5rem] h-14 font-bold border-white/10 hover:bg-white/5"
                                        onClick={() => setSelectedExpense(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-[2] rounded-[1.5rem] h-14 font-black text-lg shadow-xl shadow-primary/20"
                                        onClick={() => recordPaymentMutation.mutate(selectedExpense.id)}
                                        disabled={recordPaymentMutation.isPending || !paidAmount}
                                    >
                                        {recordPaymentMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        {recordPaymentMutation.isPending ? "Confirming..." : "Confirm Payment"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
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
