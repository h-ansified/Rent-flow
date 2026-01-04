import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Home,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { DashboardMetrics, RevenueData, Activity, Payment, Tenant } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import TenantDashboard from "./tenant-dashboard";


function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        {(subtitle || trendValue) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && trendValue && (
              <span className={`flex items-center text-xs font-medium ${trend === "up" ? "text-green-600 dark:text-green-400" :
                trend === "down" ? "text-red-600 dark:text-red-400" :
                  "text-muted-foreground"
                }`}>
                {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> :
                  trend === "down" ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                {trendValue}
              </span>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const iconMap = {
    payment: DollarSign,
    maintenance: Wrench,
    lease: Home,
    tenant: Users,
  };
  const Icon = iconMap[activity.type];

  const colorMap = {
    payment: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    maintenance: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    lease: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    tenant: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colorMap[activity.type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" data-testid={`text-activity-${activity.id}`}>{activity.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
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

export default function Dashboard() {
  const { user } = useAuth();
  const currencySymbol = user?.currency || "KSH";

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: !!user,
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueData[]>({
    queryKey: ["/api/dashboard/revenue"],
    enabled: !!user,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/activities"],
    enabled: !!user,
  });

  const { data: upcomingPayments, isLoading: paymentsLoading } = useQuery<(Payment & { tenantName: string; propertyName: string })[]>({
    queryKey: ["/api/dashboard/upcoming-payments"],
    enabled: !!user,
  });

  const { data: expiringLeases, isLoading: leasesLoading } = useQuery<(Tenant & { propertyName: string })[]>({
    queryKey: ["/api/dashboard/expiring-leases"],
    enabled: !!user,
  });

  const occupancyData = metrics ? [
    { name: "Occupied", value: metrics.occupiedUnits, color: "hsl(var(--chart-1))" },
    { name: "Vacant", value: metrics.totalUnits - metrics.occupiedUnits, color: "hsl(var(--muted))" },
  ] : [];

  if (user?.role === "tenant") {
    return <TenantDashboard />;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your properties.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : metrics ? (
          <>
            <MetricCard
              title="Total Properties"
              value={metrics.totalProperties}
              subtitle={`${metrics.totalUnits} total units`}
              icon={Building2}
              trend="up"
              trendValue="+2 this month"
            />
            <MetricCard
              title="Occupancy Rate"
              value={`${metrics.occupancyRate.toFixed(0)}%`}
              subtitle={`${metrics.occupiedUnits}/${metrics.totalUnits} units`}
              icon={Users}
              trend="up"
              trendValue="+5%"
            />
            <MetricCard
              title="Monthly Revenue"
              value={formatCurrency(metrics.monthlyRevenue, user?.currency ?? undefined)}
              subtitle="Total expected rent"
              icon={DollarSign}
              trend="up"
              trendValue="+12%"
            />
            <MetricCard
              title="Maintenance"
              value={metrics.openMaintenanceRequests}
              subtitle="Open requests"
              icon={Wrench}
              trend={metrics.openMaintenanceRequests > 5 ? "down" : "neutral"}
              trendValue={metrics.openMaintenanceRequests > 5 ? "Needs attention" : "On track"}
            />
          </>
        ) : null}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenueData ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${getCurrencySymbol(user?.currency || undefined)}${(value / 1000).toFixed(0)}k`}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatCurrency(value, user?.currency ?? undefined), ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      fill="url(#colorExpenses)"
                      name="Expenses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Occupancy Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : metrics ? (
              <div className="h-[300px] w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                    <span className="text-sm text-muted-foreground">Occupied ({metrics.occupiedUnits})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted" />
                    <span className="text-sm text-muted-foreground">Vacant ({metrics.totalUnits - metrics.occupiedUnits})</span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3 py-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {paymentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : upcomingPayments && upcomingPayments.length > 0 ? (
              upcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-b-0" data-testid={`card-payment-${payment.id}`}>
                  <div>
                    <p className="text-sm font-medium">{payment.tenantName}</p>
                    <p className="text-xs text-muted-foreground">{payment.propertyName} - Due {payment.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(payment.amount, user?.currency ?? undefined)}</span>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming payments</p>
            )}
          </CardContent>
        </Card>

        {/* Expiring Leases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Expiring Leases</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {leasesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : expiringLeases && expiringLeases.length > 0 ? (
              expiringLeases.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between py-3 border-b last:border-b-0" data-testid={`card-lease-${tenant.id}`}>
                  <div>
                    <p className="text-sm font-medium">{tenant.firstName} {tenant.lastName}</p>
                    <p className="text-xs text-muted-foreground">{tenant.propertyName}{tenant.unit ? ` - Unit ${tenant.unit}` : ""}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Expires {tenant.leaseEnd}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No expiring leases</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
