import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Tv,
  MoreHorizontal,
  MapPin,
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Trash2,
  CreditCard,
  DollarSign,
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
import type { MaintenanceRequest, Property, Tenant } from "@shared/schema";

const maintenanceFormSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  tenantId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.string().min(1, "Priority is required"),
  category: z.string().min(1, "Category is required"),
  cost: z.number().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

type MaintenanceWithDetails = MaintenanceRequest & { propertyName: string; tenantName?: string };

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Thermometer,
  appliance: Tv,
  other: Wrench,
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  new: "border-blue-500",
  in_progress: "border-yellow-500",
  completed: "border-green-500",
};

function RequestCard({
  request,
  onStatusChange,
  onDelete
}: {
  request: MaintenanceWithDetails;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const CategoryIcon = categoryIcons[request.category] || Wrench;

  return (
    <Card
      className={`hover-elevate`}
      data-testid={`card-maintenance-${request.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center">
              <CategoryIcon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{request.title}</h3>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${priorityColors[request.priority]}`}>
                {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-maintenance-menu-${request.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {request.status === "new" && (
                <DropdownMenuItem onClick={() => onStatusChange(request.id, "in_progress")}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start Work
                </DropdownMenuItem>
              )}
              {request.status === "in_progress" && (
                <DropdownMenuItem onClick={() => onStatusChange(request.id, "completed")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              {request.status !== "new" && (
                <DropdownMenuItem onClick={() => onStatusChange(request.id, "new")}>
                  <Wrench className="h-4 w-4 mr-2" />
                  Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(request.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{request.description}</p>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {request.propertyName}
          </div>
          {request.tenantName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {request.tenantName}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {request.createdAt}
          </div>
          {request.assignedTo && (
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3" />
              Assigned to: {request.assignedTo}
            </div>
          )}
          {request.cost && (
            <div className="flex items-center gap-1.5 text-green-600 font-medium">
              <CreditCard className="h-3 w-3" />
              Cost: ${request.cost.toFixed(2)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RequestCardSkeleton() {
  return (
    <Card className="border-l-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-4 w-full mb-3" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  title,
  status,
  requests,
  isLoading,
  onStatusChange,
  onDelete,
}: {
  title: string;
  status: string;
  requests: MaintenanceWithDetails[];
  isLoading: boolean;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const statusBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
    new: "default",
    in_progress: "secondary",
    completed: "outline",
  };

  return (
    <div className="flex flex-col min-w-[300px] flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={statusBadgeVariants[status]}>{requests.length}</Badge>
        </div>
      </div>
      <div className="space-y-3 flex-1">
        {isLoading ? (
          <>
            <RequestCardSkeleton />
            <RequestCardSkeleton />
          </>
        ) : requests.length > 0 ? (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No requests</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Maintenance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tenants } = useQuery<(Tenant & { propertyName: string })[]>({
    queryKey: ["/api/tenants"],
  });

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      propertyId: "",
      tenantId: "",
      title: "",
      description: "",
      priority: "medium",
      category: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaintenanceFormValues) => {
      return apiRequest("POST", "/api/maintenance", {
        ...data,
        status: "new",
        createdAt: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Request created",
        description: "The maintenance request has been submitted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, string> = { status };
      if (status === "completed") {
        updates.completedAt = new Date().toISOString().split("T")[0];
      }
      return apiRequest("PATCH", `/api/maintenance/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Status updated",
        description: "The request status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeleteId(null);
      toast({
        title: "Request deleted",
        description: "The maintenance request has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const filteredRequests = requests?.filter((request) => {
    return request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const newRequests = filteredRequests?.filter(r => r.status === "new") || [];
  const inProgressRequests = filteredRequests?.filter(r => r.status === "in_progress") || [];
  const completedRequests = filteredRequests?.filter(r => r.status === "completed") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Maintenance</h1>
          <p className="text-muted-foreground mt-1">Track and manage maintenance requests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-request">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Maintenance Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Leaky faucet in bathroom" {...field} data-testid="input-request-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the issue in detail..."
                          className="resize-none"
                          {...field}
                          data-testid="input-request-description"
                        />
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
                            <SelectTrigger data-testid="select-request-property">
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
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-tenant">
                              <SelectValue placeholder="Select tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants?.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.firstName} {tenant.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="hvac">HVAC</SelectItem>
                            <SelectItem value="appliance">Appliance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost ($) (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            data-testid="input-request-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-request">
                    {createMutation.isPending ? "Creating..." : "Create Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-maintenance"
        />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        <KanbanColumn
          title="New"
          status="new"
          requests={newRequests}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteId}
        />
        <KanbanColumn
          title="In Progress"
          status="in_progress"
          requests={inProgressRequests}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteId}
        />
        <KanbanColumn
          title="Completed"
          status="completed"
          requests={completedRequests}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteId}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this maintenance request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
