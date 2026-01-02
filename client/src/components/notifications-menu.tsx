import { Bell, AlertCircle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Payment, Tenant } from "@shared/schema";

export function NotificationsMenu() {
    const { data: upcomingPayments, isLoading: isLoadingPayments } = useQuery<(Payment & { tenantName: string; propertyName: string })[]>({
        queryKey: ["/api/dashboard/upcoming-payments"],
    });

    const { data: expiringLeases, isLoading: isLoadingLeases } = useQuery<(Tenant & { propertyName: string })[]>({
        queryKey: ["/api/dashboard/expiring-leases"],
    });

    const overduePayments = upcomingPayments?.filter(p => p.status === "overdue") || [];
    const pendingPayments = upcomingPayments?.filter(p => p.status === "pending") || [];

    // Calculate total notifications
    const totalNotifications = overduePayments.length + (expiringLeases?.length || 0);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalNotifications > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-red-500 hover:bg-red-600"
                        >
                            {totalNotifications}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>
                    Notifications
                    {totalNotifications > 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            You have {totalNotifications} unread messages
                        </span>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {isLoadingPayments || isLoadingLeases ? (
                        <div className="p-4 space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : totalNotifications === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="p-1">
                            {overduePayments.map((payment) => (
                                <DropdownMenuItem key={payment.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                                    <div className="flex w-full items-center justify-between">
                                        <span className="font-semibold text-red-500 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> Overdue Payment
                                        </span>
                                        <span className="text-xs text-muted-foreground">{payment.dueDate}</span>
                                    </div>
                                    <p className="text-sm">
                                        {payment.tenantName} owes {payment.amount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {payment.propertyName}
                                    </p>
                                </DropdownMenuItem>
                            ))}

                            {expiringLeases && expiringLeases.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    {expiringLeases.map((lease) => (
                                        <DropdownMenuItem key={lease.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                                            <div className="flex w-full items-center justify-between">
                                                <span className="font-semibold text-amber-500 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" /> Lease Expiring
                                                </span>
                                                <span className="text-xs text-muted-foreground">{lease.leaseEnd}</span>
                                            </div>
                                            <p className="text-sm">
                                                {lease.firstName} {lease.lastName}'s lease is ending
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {lease.propertyName}
                                            </p>
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
