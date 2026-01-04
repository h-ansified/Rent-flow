import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Tenant, Property } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";


const tenantFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  propertyId: z.string().min(1, "Property is required"),
  unit: z.string().optional(),
  leaseStart: z.string().min(1, "Lease start date is required"),
  leaseEnd: z.string().min(1, "Lease end date is required"),
  rentAmount: z.coerce.number().min(1, "Rent amount is required"),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

type TenantWithProperty = Tenant & { propertyName: string };

function TenantStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { label: "Active", variant: "default" as const },
    pending: { label: "Pending", variant: "secondary" as const },
    ended: { label: "Ended", variant: "outline" as const },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function TableSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );
}

export default function Tenants() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<TenantWithProperty | null>(null);

  const { data: tenants, isLoading: tenantsLoading } = useQuery<TenantWithProperty[]>({
    queryKey: ["/api/tenants"],
    enabled: !!user,
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: !!user,
  });

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyId: "",
      unit: "",
      leaseStart: "",
      leaseEnd: "",
      rentAmount: 0,
    },
  });

  const currencySymbol = user?.currency || "KSH";

  const createMutation = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      return apiRequest("POST", "/api/tenants", {
        ...data,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Tenant added",
        description: "The tenant has been successfully added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tenant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setDeleteId(null);
      toast({
        title: "Tenant removed",
        description: "The tenant has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove tenant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      toast({
        title: "Link Sent",
        description: `Login link sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTenants = tenants?.filter((tenant) => {
    const fullName = `${tenant.firstName} ${tenant.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage your tenant information</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tenant">
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-tenant-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} data-testid="input-tenant-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} data-testid="input-tenant-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} data-testid="input-tenant-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tenant-property">
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties?.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="1A" {...field} data-testid="input-tenant-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaseStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease Start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-tenant-lease-start" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaseEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease End</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-tenant-lease-end" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent ({getCurrencySymbol(user?.currency || undefined)})</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} data-testid="input-tenant-rent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-tenant">
                    {createMutation.isPending ? "Adding..." : "Add Tenant"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tenants"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Lease End</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsLoading ? (
                <>
                  <TableSkeleton />
                  <TableSkeleton />
                  <TableSkeleton />
                </>
              ) : filteredTenants && filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {tenant.firstName[0]}{tenant.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {tenant.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.propertyName}</TableCell>
                    <TableCell>{tenant.unit || "-"}</TableCell>
                    <TableCell>{tenant.leaseEnd}</TableCell>
                    <TableCell>{formatCurrency(tenant.rentAmount, user?.currency ?? undefined)}</TableCell>
                    <TableCell>
                      <TenantStatusBadge status={tenant.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-tenant-menu-${tenant.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTenant(tenant)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendMagicLink(tenant.email)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Login Link
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`tel:${tenant.phone}`} className="flex items-center w-full cursor-pointer">
                              <Phone className="h-4 w-4 mr-2" />
                              Call Tenant
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(tenant.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tenants found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Get started by adding your first tenant"}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Tenant Details Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {selectedTenant.firstName[0]}{selectedTenant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedTenant.firstName} {selectedTenant.lastName}</h3>
                  <Badge variant={selectedTenant.status === 'active' ? 'default' : 'secondary'}>
                    {selectedTenant.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">{selectedTenant.propertyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium">{selectedTenant.unit || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email</p>
                  <p className="font-medium">{selectedTenant.email}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</p>
                  <p className="font-medium">{selectedTenant.phone}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Start</p>
                    <p className="font-medium">{selectedTenant.leaseStart}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease End</p>
                    <p className="font-medium">{selectedTenant.leaseEnd}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedTenant.rentAmount, user?.currency ?? undefined)}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedTenant(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this tenant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
