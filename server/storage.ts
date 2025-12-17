import { 
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Tenant, type InsertTenant,
  type Payment, type InsertPayment,
  type MaintenanceRequest, type InsertMaintenanceRequest,
  type DashboardMetrics, type RevenueData, type Activity
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Properties
  getAllProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<Property>): Promise<Property | undefined>;
  
  // Tenants
  getAllTenants(): Promise<(Tenant & { propertyName: string })[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined>;
  
  // Payments
  getAllPayments(): Promise<(Payment & { tenantName: string; propertyName: string })[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined>;
  
  // Maintenance
  getAllMaintenanceRequests(): Promise<(MaintenanceRequest & { propertyName: string; tenantName?: string })[]>;
  getMaintenanceRequest(id: string): Promise<MaintenanceRequest | undefined>;
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: string, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest | undefined>;
  deleteMaintenanceRequest(id: string): Promise<boolean>;
  
  // Delete operations
  deleteProperty(id: string): Promise<boolean>;
  deleteTenant(id: string): Promise<boolean>;
  deletePayment(id: string): Promise<boolean>;
  
  // Dashboard
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getRevenueData(): Promise<RevenueData[]>;
  getRecentActivities(): Promise<Activity[]>;
  getUpcomingPayments(): Promise<(Payment & { tenantName: string; propertyName: string })[]>;
  getExpiringLeases(): Promise<(Tenant & { propertyName: string })[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private tenants: Map<string, Tenant>;
  private payments: Map<string, Payment>;
  private maintenanceRequests: Map<string, MaintenanceRequest>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.tenants = new Map();
    this.payments = new Map();
    this.maintenanceRequests = new Map();
    
    this.seedData();
  }

  private seedData() {
    // Seed Properties
    const propertiesData: Property[] = [
      {
        id: "prop-1",
        name: "Sunset View Apartments",
        address: "1234 Sunset Boulevard",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90028",
        type: "apartment",
        units: 12,
        occupiedUnits: 10,
        monthlyRent: 2500,
        imageUrl: null,
      },
      {
        id: "prop-2",
        name: "Oak Street Townhomes",
        address: "567 Oak Street",
        city: "Pasadena",
        state: "CA",
        zipCode: "91101",
        type: "townhouse",
        units: 6,
        occupiedUnits: 6,
        monthlyRent: 3200,
        imageUrl: null,
      },
      {
        id: "prop-3",
        name: "Marina Heights Condo",
        address: "890 Harbor Drive",
        city: "Marina del Rey",
        state: "CA",
        zipCode: "90292",
        type: "condo",
        units: 8,
        occupiedUnits: 7,
        monthlyRent: 3500,
        imageUrl: null,
      },
      {
        id: "prop-4",
        name: "Wilshire Garden Home",
        address: "2468 Wilshire Place",
        city: "Santa Monica",
        state: "CA",
        zipCode: "90403",
        type: "house",
        units: 1,
        occupiedUnits: 1,
        monthlyRent: 4500,
        imageUrl: null,
      },
      {
        id: "prop-5",
        name: "Downtown Lofts",
        address: "100 Main Street",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90012",
        type: "apartment",
        units: 20,
        occupiedUnits: 18,
        monthlyRent: 2800,
        imageUrl: null,
      },
      {
        id: "prop-6",
        name: "Hillside Estates",
        address: "789 Hill Road",
        city: "Beverly Hills",
        state: "CA",
        zipCode: "90210",
        type: "house",
        units: 1,
        occupiedUnits: 0,
        monthlyRent: 8500,
        imageUrl: null,
      },
    ];
    
    propertiesData.forEach(p => this.properties.set(p.id, p));

    // Seed Tenants
    const tenantsData: Tenant[] = [
      {
        id: "tenant-1",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.j@email.com",
        phone: "(555) 234-5678",
        propertyId: "prop-1",
        unit: "3A",
        leaseStart: "2024-01-15",
        leaseEnd: "2025-01-14",
        rentAmount: 2500,
        status: "active",
      },
      {
        id: "tenant-2",
        firstName: "Michael",
        lastName: "Chen",
        email: "m.chen@email.com",
        phone: "(555) 345-6789",
        propertyId: "prop-1",
        unit: "5B",
        leaseStart: "2024-03-01",
        leaseEnd: "2025-02-28",
        rentAmount: 2650,
        status: "active",
      },
      {
        id: "tenant-3",
        firstName: "Emily",
        lastName: "Rodriguez",
        email: "emily.r@email.com",
        phone: "(555) 456-7890",
        propertyId: "prop-2",
        unit: "1",
        leaseStart: "2023-06-01",
        leaseEnd: "2024-12-31",
        rentAmount: 3200,
        status: "active",
      },
      {
        id: "tenant-4",
        firstName: "David",
        lastName: "Kim",
        email: "dkim@email.com",
        phone: "(555) 567-8901",
        propertyId: "prop-3",
        unit: "702",
        leaseStart: "2024-02-15",
        leaseEnd: "2025-02-14",
        rentAmount: 3500,
        status: "active",
      },
      {
        id: "tenant-5",
        firstName: "Jessica",
        lastName: "Thompson",
        email: "jess.t@email.com",
        phone: "(555) 678-9012",
        propertyId: "prop-4",
        unit: null,
        leaseStart: "2024-04-01",
        leaseEnd: "2025-03-31",
        rentAmount: 4500,
        status: "active",
      },
      {
        id: "tenant-6",
        firstName: "Robert",
        lastName: "Martinez",
        email: "r.martinez@email.com",
        phone: "(555) 789-0123",
        propertyId: "prop-5",
        unit: "1501",
        leaseStart: "2024-01-01",
        leaseEnd: "2024-12-31",
        rentAmount: 2800,
        status: "active",
      },
      {
        id: "tenant-7",
        firstName: "Amanda",
        lastName: "Lee",
        email: "amanda.lee@email.com",
        phone: "(555) 890-1234",
        propertyId: "prop-5",
        unit: "1203",
        leaseStart: "2024-05-15",
        leaseEnd: "2025-05-14",
        rentAmount: 2900,
        status: "active",
      },
      {
        id: "tenant-8",
        firstName: "William",
        lastName: "Brown",
        email: "w.brown@email.com",
        phone: "(555) 901-2345",
        propertyId: "prop-2",
        unit: "4",
        leaseStart: "2023-09-01",
        leaseEnd: "2024-12-30",
        rentAmount: 3200,
        status: "active",
      },
    ];
    
    tenantsData.forEach(t => this.tenants.set(t.id, t));

    // Seed Payments
    const paymentsData: Payment[] = [
      {
        id: "pay-1",
        tenantId: "tenant-1",
        propertyId: "prop-1",
        amount: 2500,
        dueDate: "2024-12-01",
        paidDate: "2024-11-28",
        status: "paid",
        method: "online",
      },
      {
        id: "pay-2",
        tenantId: "tenant-2",
        propertyId: "prop-1",
        amount: 2650,
        dueDate: "2024-12-01",
        paidDate: null,
        status: "pending",
        method: null,
      },
      {
        id: "pay-3",
        tenantId: "tenant-3",
        propertyId: "prop-2",
        amount: 3200,
        dueDate: "2024-12-01",
        paidDate: "2024-12-01",
        status: "paid",
        method: "bank_transfer",
      },
      {
        id: "pay-4",
        tenantId: "tenant-4",
        propertyId: "prop-3",
        amount: 3500,
        dueDate: "2024-12-01",
        paidDate: null,
        status: "overdue",
        method: null,
      },
      {
        id: "pay-5",
        tenantId: "tenant-5",
        propertyId: "prop-4",
        amount: 4500,
        dueDate: "2024-12-01",
        paidDate: "2024-11-30",
        status: "paid",
        method: "check",
      },
      {
        id: "pay-6",
        tenantId: "tenant-6",
        propertyId: "prop-5",
        amount: 2800,
        dueDate: "2024-12-01",
        paidDate: null,
        status: "pending",
        method: null,
      },
      {
        id: "pay-7",
        tenantId: "tenant-7",
        propertyId: "prop-5",
        amount: 2900,
        dueDate: "2024-12-01",
        paidDate: "2024-12-02",
        status: "paid",
        method: "online",
      },
      {
        id: "pay-8",
        tenantId: "tenant-8",
        propertyId: "prop-2",
        amount: 3200,
        dueDate: "2024-12-01",
        paidDate: null,
        status: "overdue",
        method: null,
      },
      {
        id: "pay-9",
        tenantId: "tenant-1",
        propertyId: "prop-1",
        amount: 2500,
        dueDate: "2025-01-01",
        paidDate: null,
        status: "pending",
        method: null,
      },
      {
        id: "pay-10",
        tenantId: "tenant-5",
        propertyId: "prop-4",
        amount: 4500,
        dueDate: "2025-01-01",
        paidDate: null,
        status: "pending",
        method: null,
      },
    ];
    
    paymentsData.forEach(p => this.payments.set(p.id, p));

    // Seed Maintenance Requests
    const maintenanceData: MaintenanceRequest[] = [
      {
        id: "maint-1",
        propertyId: "prop-1",
        tenantId: "tenant-1",
        title: "Leaky faucet in bathroom",
        description: "The bathroom sink faucet has been dripping constantly for the past week. Water is pooling in the cabinet below.",
        priority: "medium",
        status: "new",
        category: "plumbing",
        createdAt: "2024-12-10",
        completedAt: null,
        assignedTo: null,
      },
      {
        id: "maint-2",
        propertyId: "prop-2",
        tenantId: "tenant-3",
        title: "HVAC not heating properly",
        description: "The heating system is blowing cold air. Temperature won't go above 60 degrees even when set to 72.",
        priority: "urgent",
        status: "in_progress",
        category: "hvac",
        createdAt: "2024-12-08",
        completedAt: null,
        assignedTo: "Mike's HVAC Services",
      },
      {
        id: "maint-3",
        propertyId: "prop-3",
        tenantId: "tenant-4",
        title: "Dishwasher not draining",
        description: "Water remains at the bottom of the dishwasher after each cycle. Tried running it empty but same issue.",
        priority: "low",
        status: "new",
        category: "appliance",
        createdAt: "2024-12-12",
        completedAt: null,
        assignedTo: null,
      },
      {
        id: "maint-4",
        propertyId: "prop-5",
        tenantId: "tenant-6",
        title: "Ceiling light flickering",
        description: "Living room ceiling light flickers randomly throughout the day. Already tried replacing the bulb.",
        priority: "medium",
        status: "in_progress",
        category: "electrical",
        createdAt: "2024-12-05",
        completedAt: null,
        assignedTo: "ABC Electric",
      },
      {
        id: "maint-5",
        propertyId: "prop-1",
        tenantId: "tenant-2",
        title: "Garbage disposal jammed",
        description: "Kitchen garbage disposal is stuck and making a humming sound when turned on.",
        priority: "low",
        status: "completed",
        category: "appliance",
        createdAt: "2024-12-01",
        completedAt: "2024-12-03",
        assignedTo: "Building Maintenance",
      },
      {
        id: "maint-6",
        propertyId: "prop-4",
        tenantId: "tenant-5",
        title: "Water heater pilot light out",
        description: "No hot water in the house. The pilot light on the water heater won't stay lit.",
        priority: "high",
        status: "new",
        category: "plumbing",
        createdAt: "2024-12-14",
        completedAt: null,
        assignedTo: null,
      },
    ];
    
    maintenanceData.forEach(m => this.maintenanceRequests.set(m.id, m));
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Property methods
  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = { ...insertProperty, id };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    const updated = { ...property, ...updates };
    this.properties.set(id, updated);
    return updated;
  }

  // Tenant methods
  async getAllTenants(): Promise<(Tenant & { propertyName: string })[]> {
    const tenants = Array.from(this.tenants.values());
    return tenants.map(tenant => {
      const property = this.properties.get(tenant.propertyId);
      return {
        ...tenant,
        propertyName: property?.name || "Unknown Property",
      };
    });
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const tenant: Tenant = { ...insertTenant, id };
    this.tenants.set(id, tenant);
    
    // Update property occupied units
    const property = this.properties.get(insertTenant.propertyId);
    if (property) {
      property.occupiedUnits = Math.min(property.occupiedUnits + 1, property.units);
      this.properties.set(property.id, property);
    }
    
    return tenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    const updated = { ...tenant, ...updates };
    this.tenants.set(id, updated);
    return updated;
  }

  // Payment methods
  async getAllPayments(): Promise<(Payment & { tenantName: string; propertyName: string })[]> {
    const payments = Array.from(this.payments.values());
    return payments.map(payment => {
      const tenant = this.tenants.get(payment.tenantId);
      const property = this.properties.get(payment.propertyId);
      return {
        ...payment,
        tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown Tenant",
        propertyName: property?.name || "Unknown Property",
      };
    });
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = { ...insertPayment, id };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    const updated = { ...payment, ...updates };
    this.payments.set(id, updated);
    return updated;
  }

  // Maintenance methods
  async getAllMaintenanceRequests(): Promise<(MaintenanceRequest & { propertyName: string; tenantName?: string })[]> {
    const requests = Array.from(this.maintenanceRequests.values());
    return requests.map(request => {
      const property = this.properties.get(request.propertyId);
      const tenant = request.tenantId ? this.tenants.get(request.tenantId) : null;
      return {
        ...request,
        propertyName: property?.name || "Unknown Property",
        tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : undefined,
      };
    });
  }

  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest | undefined> {
    return this.maintenanceRequests.get(id);
  }

  async createMaintenanceRequest(insertRequest: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const id = randomUUID();
    const request: MaintenanceRequest = { ...insertRequest, id };
    this.maintenanceRequests.set(id, request);
    return request;
  }

  async updateMaintenanceRequest(id: string, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const request = this.maintenanceRequests.get(id);
    if (!request) return undefined;
    const updated = { ...request, ...updates };
    this.maintenanceRequests.set(id, updated);
    return updated;
  }

  async deleteMaintenanceRequest(id: string): Promise<boolean> {
    return this.maintenanceRequests.delete(id);
  }

  // Delete operations
  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }

  async deleteTenant(id: string): Promise<boolean> {
    const tenant = this.tenants.get(id);
    if (tenant) {
      const property = this.properties.get(tenant.propertyId);
      if (property && property.occupiedUnits > 0) {
        property.occupiedUnits -= 1;
        this.properties.set(property.id, property);
      }
    }
    return this.tenants.delete(id);
  }

  async deletePayment(id: string): Promise<boolean> {
    return this.payments.delete(id);
  }

  // Dashboard methods
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const properties = Array.from(this.properties.values());
    const payments = Array.from(this.payments.values());
    const maintenance = Array.from(this.maintenanceRequests.values());

    const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
    const occupiedUnits = properties.reduce((sum, p) => sum + p.occupiedUnits, 0);
    const monthlyRevenue = properties.reduce((sum, p) => sum + (p.monthlyRent * p.occupiedUnits), 0);
    const pendingPayments = payments.filter(p => p.status === "pending").length;
    const overduePayments = payments.filter(p => p.status === "overdue").length;
    const openMaintenanceRequests = maintenance.filter(m => m.status !== "completed").length;

    return {
      totalProperties: properties.length,
      totalUnits,
      occupiedUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      monthlyRevenue,
      pendingPayments,
      overduePayments,
      openMaintenanceRequests,
    };
  }

  async getRevenueData(): Promise<RevenueData[]> {
    return [
      { month: "Jul", revenue: 68500, expenses: 12400 },
      { month: "Aug", revenue: 71200, expenses: 15800 },
      { month: "Sep", revenue: 74800, expenses: 11200 },
      { month: "Oct", revenue: 76400, expenses: 18600 },
      { month: "Nov", revenue: 78200, expenses: 14200 },
      { month: "Dec", revenue: 82100, expenses: 16800 },
    ];
  }

  async getRecentActivities(): Promise<Activity[]> {
    return [
      {
        id: "act-1",
        type: "payment",
        description: "Sarah Johnson paid $2,500 for December rent",
        timestamp: "2 hours ago",
        tenantId: "tenant-1",
        propertyId: "prop-1",
      },
      {
        id: "act-2",
        type: "maintenance",
        description: "New maintenance request: Water heater pilot light out",
        timestamp: "5 hours ago",
        propertyId: "prop-4",
      },
      {
        id: "act-3",
        type: "payment",
        description: "Amanda Lee paid $2,900 for December rent",
        timestamp: "1 day ago",
        tenantId: "tenant-7",
        propertyId: "prop-5",
      },
      {
        id: "act-4",
        type: "maintenance",
        description: "Garbage disposal repair completed at Sunset View Apartments",
        timestamp: "2 days ago",
        propertyId: "prop-1",
      },
      {
        id: "act-5",
        type: "lease",
        description: "Lease renewal reminder: Emily Rodriguez's lease expires Dec 31",
        timestamp: "3 days ago",
        tenantId: "tenant-3",
        propertyId: "prop-2",
      },
      {
        id: "act-6",
        type: "tenant",
        description: "New tenant inquiry for Hillside Estates",
        timestamp: "4 days ago",
        propertyId: "prop-6",
      },
    ];
  }

  async getUpcomingPayments(): Promise<(Payment & { tenantName: string; propertyName: string })[]> {
    const allPayments = await this.getAllPayments();
    return allPayments.filter(p => p.status === "pending" || p.status === "overdue").slice(0, 5);
  }

  async getExpiringLeases(): Promise<(Tenant & { propertyName: string })[]> {
    const allTenants = await this.getAllTenants();
    // Sort by lease end date and return those expiring within 60 days
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    
    return allTenants
      .filter(tenant => {
        const leaseEnd = new Date(tenant.leaseEnd);
        return leaseEnd <= sixtyDaysFromNow && tenant.status === "active";
      })
      .sort((a, b) => new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime())
      .slice(0, 5);
  }
}

export const storage = new MemStorage();
