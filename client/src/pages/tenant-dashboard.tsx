import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency-utils";
import { useAuth } from "@/hooks/use-auth";
import { Home, Calendar, CreditCard, Wrench, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";

export default function TenantDashboard() {
    const { user } = useAuth();

    const { data, isLoading, error } = useQuery({
        queryKey: ["/api/tenant/dashboard"],
        // Determine if we should retry or not? Default is fine.
    });

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (error || !data) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Could not load your tenant profile. Please ensure you have been added as a tenant by your landlord.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { tenant, property, nextPayment, payments, maintenance } = data;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Welcome, {tenant.firstName}!</h1>
                <p className="text-muted-foreground">{property?.name} • Unit {tenant.unit || "N/A"}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Rent Status Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rent Status</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {nextPayment ? (
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">
                                    {formatCurrency(nextPayment.amount, user?.currency)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Due {nextPayment.dueDate}
                                </p>
                                <div className="pt-2">
                                    <Badge variant={nextPayment.status === 'overdue' ? 'destructive' : 'secondary'}>
                                        {nextPayment.status === 'overdue' ? 'Overdue' : 'Due Soon'}
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-medium">All caught up!</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lease Info Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lease Information</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Start Date</span>
                                <span className="font-medium">{tenant.leaseStart}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">End Date</span>
                                <span className="font-medium">{tenant.leaseEnd}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Monthly Rent</span>
                                <span className="font-medium">{formatCurrency(tenant.rentAmount, user?.currency)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Maintenance Summary Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Active Requests</span>
                                <Badge variant="outline">{maintenance.filter((m: any) => m.status !== 'completed').length}</Badge>
                            </div>
                            <Link href="/maintenance">
                                <Button className="w-full" size="sm" variant="outline">Request Maintenance</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent History Section */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Payments</CardTitle>
                        <CardDescription>Your last 5 transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {payments.slice(0, 5).map((payment: any) => (
                                <div key={payment.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-sm">{payment.dueDate}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{payment.status}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-sm">{formatCurrency(payment.amount, user?.currency)}</p>
                                        {payment.paidDate && <p className="text-xs text-green-600">Paid {payment.paidDate}</p>}
                                    </div>
                                </div>
                            ))}
                            {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Maintenance Requests</CardTitle>
                        <CardDescription>Recent service tickets</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {maintenance.slice(0, 5).map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-sm truncate max-w-[200px]">{req.title}</p>
                                        <p className="text-xs text-muted-foreground">{req.createdAt.split('T')[0]}</p>
                                    </div>
                                    <Badge variant={req.status === 'completed' ? 'default' : 'secondary'}>
                                        {req.status}
                                    </Badge>
                                </div>
                            ))}
                            {maintenance.length === 0 && <p className="text-sm text-muted-foreground">No maintenance requests.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>
    );
}
