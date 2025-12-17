import { db } from "./db";
import {
  users, properties, tenants, payments, maintenanceRequests,
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Tenant, type InsertTenant,
  type Payment, type InsertPayment,
  type MaintenanceRequest, type InsertMaintenanceRequest,
  type DashboardMetrics, type RevenueData, type Activity
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Database storage implementation using Drizzle ORM
 * All methods filter by userId for multi-user data isolation
 */
class DatabaseStorage {
  // ===================
  // USER METHODS
  // ===================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ===================
  // PROPERTY METHODS
  // ===================

  async getAllProperties(userId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.userId, userId))
      .orderBy(desc(properties.name));
  }

  async getProperty(id: string, userId: string): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)))
      .limit(1);
    return property;
  }

  async createProperty(insertProperty: InsertProperty, userId: string): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values({ ...insertProperty, userId })
      .returning();
    return property;
  }

  async updateProperty(
    id: string,
    updates: Partial<Property>,
    userId: string
  ): Promise<Property | undefined> {
    const [property] = await db
      .update(properties)
      .set(updates)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)))
      .returning();
    return property;
  }

  async deleteProperty(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)))
      .returning({ id: properties.id });
    return result.length > 0;
  }

  // ===================
  // TENANT METHODS
  // ===================

  async getAllTenants(userId: string): Promise<(Tenant & { propertyName: string })[]> {
    const result = await db
      .select({
        tenant: tenants,
        propertyName: properties.name,
      })
      .from(tenants)
      .leftJoin(properties, eq(tenants.propertyId, properties.id))
      .where(eq(tenants.userId, userId))
      .orderBy(desc(tenants.firstName));

    return result.map((row) => ({
      ...row.tenant,
      propertyName: row.propertyName || "Unknown Property",
    }));
  }

  async getTenant(id: string, userId: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.userId, userId)))
      .limit(1);
    return tenant;
  }

  async createTenant(insertTenant: InsertTenant, userId: string): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values({ ...insertTenant, userId })
      .returning();

    // Update property occupied units
    await db
      .update(properties)
      .set({
        occupiedUnits: sql`${properties.occupiedUnits} + 1`
      })
      .where(and(
        eq(properties.id, insertTenant.propertyId),
        eq(properties.userId, userId)
      ));

    // Create initial pending payment (Auto-billing)
    await db.insert(payments).values({
      userId,
      tenantId: tenant.id,
      propertyId: tenant.propertyId,
      amount: tenant.rentAmount,
      dueDate: tenant.leaseStart, // First payment due on lease start
      status: "pending",
    });

    return tenant;
  }

  async updateTenant(
    id: string,
    updates: Partial<Tenant>,
    userId: string
  ): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set(updates)
      .where(and(eq(tenants.id, id), eq(tenants.userId, userId)))
      .returning();
    return tenant;
  }

  async deleteTenant(id: string, userId: string): Promise<boolean> {
    const tenant = await this.getTenant(id, userId);
    if (!tenant) return false;

    await db
      .delete(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.userId, userId)));

    // Update property occupied units
    await db
      .update(properties)
      .set({
        occupiedUnits: sql`GREATEST(${properties.occupiedUnits} - 1, 0)`
      })
      .where(and(
        eq(properties.id, tenant.propertyId),
        eq(properties.userId, userId)
      ));

    return true;
  }

  // ===================
  // PAYMENT METHODS
  // ===================

  private async updateOverduePayments(userId: string): Promise<void> {
    const now = new Date().toISOString().split("T")[0];
    await db
      .update(payments)
      .set({ status: "overdue" })
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.status, "pending"),
          sql`${payments.dueDate} < ${now}`,
          sql`${payments.amount} > ${payments.paidAmount}`
        )
      );
  }

  async getAllPayments(userId: string): Promise<(Payment & { tenantName: string; propertyName: string })[]> {
    await this.updateOverduePayments(userId);
    const result = await db
      .select({
        payment: payments,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
        propertyName: properties.name,
      })
      .from(payments)
      .leftJoin(tenants, eq(payments.tenantId, tenants.id))
      .leftJoin(properties, eq(payments.propertyId, properties.id))
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.dueDate));

    return result.map((row) => ({
      ...row.payment,
      tenantName: row.tenantFirstName && row.tenantLastName
        ? `${row.tenantFirstName} ${row.tenantLastName}`
        : "Unknown Tenant",
      propertyName: row.propertyName || "Unknown Property",
    }));
  }

  async getPayment(id: string, userId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)))
      .limit(1);
    return payment;
  }

  async createPayment(insertPayment: InsertPayment, userId: string): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values({ ...insertPayment, userId })
      .returning();
    return payment;
  }

  async updatePayment(
    id: string,
    updates: Partial<Payment> & { paidAmount?: number },
    userId: string
  ): Promise<Payment | undefined> {
    // If we are recording a payment, we increment the paidAmount
    const current = await this.getPayment(id, userId);
    if (!current) return undefined;

    const newPaidAmount = (current.paidAmount || 0) + (updates.paidAmount || 0);
    const isCleared = newPaidAmount >= current.amount;

    const finalUpdates: any = {
      ...updates,
      paidAmount: newPaidAmount,
      status: isCleared ? "paid" : (current.dueDate < new Date().toISOString().split("T")[0] ? "overdue" : "pending"),
      paidDate: isCleared ? (updates.paidDate || new Date().toISOString().split("T")[0]) : current.paidDate
    };

    const [payment] = await db
      .update(payments)
      .set(finalUpdates)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)))
      .returning();
    return payment;
  }

  async deletePayment(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)))
      .returning({ id: payments.id });
    return result.length > 0;
  }

  // ===================
  // MAINTENANCE METHODS
  // ===================

  async getAllMaintenanceRequests(
    userId: string
  ): Promise<(MaintenanceRequest & { propertyName: string; tenantName?: string })[]> {
    const result = await db
      .select({
        request: maintenanceRequests,
        propertyName: properties.name,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
      })
      .from(maintenanceRequests)
      .leftJoin(properties, eq(maintenanceRequests.propertyId, properties.id))
      .leftJoin(tenants, eq(maintenanceRequests.tenantId, tenants.id))
      .where(eq(maintenanceRequests.userId, userId))
      .orderBy(desc(maintenanceRequests.createdAt));

    return result.map((row) => ({
      ...row.request,
      propertyName: row.propertyName || "Unknown Property",
      tenantName:
        row.tenantFirstName && row.tenantLastName
          ? `${row.tenantFirstName} ${row.tenantLastName}`
          : undefined,
    }));
  }

  async getMaintenanceRequest(id: string, userId: string): Promise<MaintenanceRequest | undefined> {
    const [request] = await db
      .select()
      .from(maintenanceRequests)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.userId, userId)))
      .limit(1);
    return request;
  }

  async createMaintenanceRequest(
    insertRequest: InsertMaintenanceRequest,
    userId: string
  ): Promise<MaintenanceRequest> {
    const [request] = await db
      .insert(maintenanceRequests)
      .values({ ...insertRequest, userId })
      .returning();
    return request;
  }

  async updateMaintenanceRequest(
    id: string,
    updates: Partial<MaintenanceRequest>,
    userId: string
  ): Promise<MaintenanceRequest | undefined> {
    const [request] = await db
      .update(maintenanceRequests)
      .set(updates)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.userId, userId)))
      .returning();
    return request;
  }

  async deleteMaintenanceRequest(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(maintenanceRequests)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.userId, userId)))
      .returning({ id: maintenanceRequests.id });
    return result.length > 0;
  }

  // ===================
  // DASHBOARD METHODS
  // ===================

  async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    await this.updateOverduePayments(userId);
    // Get counts and sums using SQL aggregation
    const [propertyStats] = await db
      .select({
        totalProperties: sql<number>`COUNT(*)::int`,
        totalUnits: sql<number>`COALESCE(SUM(${properties.units}), 0)::int`,
        occupiedUnits: sql<number>`COALESCE(SUM(${properties.occupiedUnits}), 0)::int`,
        monthlyRevenue: sql<number>`COALESCE(SUM(${properties.monthlyRent} * ${properties.occupiedUnits}), 0)::float`,
      })
      .from(properties)
      .where(eq(properties.userId, userId));

    const [paymentStats] = await db
      .select({
        pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
        overduePayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'overdue' THEN 1 END)::int`,
      })
      .from(payments)
      .where(eq(payments.userId, userId));

    const [maintenanceStats] = await db
      .select({
        openRequests: sql<number>`COUNT(CASE WHEN ${maintenanceRequests.status} != 'completed' THEN 1 END)::int`,
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.userId, userId));

    const occupancyRate =
      propertyStats.totalUnits > 0
        ? (propertyStats.occupiedUnits / propertyStats.totalUnits) * 100
        : 0;

    return {
      totalProperties: propertyStats.totalProperties,
      totalUnits: propertyStats.totalUnits,
      occupiedUnits: propertyStats.occupiedUnits,
      occupancyRate,
      monthlyRevenue: propertyStats.monthlyRevenue,
      pendingPayments: paymentStats.pendingPayments,
      overduePayments: paymentStats.overduePayments,
      openMaintenanceRequests: maintenanceStats.openRequests,
    };
  }

  async getRevenueData(userId: string): Promise<RevenueData[]> {
    const monthlyData: Record<string, number> = {};
    const months: string[] = [];

    // Initialize last 6 months based on current server time
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      monthlyData[monthName] = 0;
    }

    // Fetch all payments with any collections
    const collections = await db
      .select({
        paidAmount: payments.paidAmount,
        paidDate: payments.paidDate,
        dueDate: payments.dueDate, // Fallback if no paidDate yet but partial payment exists
      })
      .from(payments)
      .where(and(
        eq(payments.userId, userId),
        sql`${payments.paidAmount} > 0`
      ));

    // Aggregate revenue by month
    collections.forEach(p => {
      const dateStr = p.paidDate || p.dueDate;
      if (dateStr) {
        const date = new Date(dateStr);
        const monthName = date.toLocaleString('default', { month: 'short' });
        if (monthlyData[monthName] !== undefined) {
          monthlyData[monthName] += p.paidAmount;
        }
      }
    });

    return months.map(month => ({
      month,
      revenue: monthlyData[month],
      expenses: monthlyData[month] * 0.1, // Estimated 10% expenses for now
    }));
  }

  async getRecentActivities(userId: string): Promise<Activity[]> {
    // This would ideally come from an activity log table
    // For now, return recent payments and maintenance as activities
    const recentPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidDate: payments.paidDate,
        propertyId: payments.propertyId,
        tenantId: payments.tenantId,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
      })
      .from(payments)
      .leftJoin(tenants, eq(payments.tenantId, tenants.id))
      .where(and(eq(payments.userId, userId), sql`${payments.paidDate} IS NOT NULL`))
      .orderBy(desc(payments.paidDate))
      .limit(3);

    const recentMaintenance = await db
      .select({
        id: maintenanceRequests.id,
        title: maintenanceRequests.title,
        createdAt: maintenanceRequests.createdAt,
        propertyId: maintenanceRequests.propertyId,
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.userId, userId))
      .orderBy(desc(maintenanceRequests.createdAt))
      .limit(3);

    const activities: Activity[] = [
      ...recentPayments.map((p) => ({
        id: p.id,
        type: "payment" as const,
        description: `${p.tenantFirstName} ${p.tenantLastName} paid $${p.amount}`,
        timestamp: p.paidDate || "",
        propertyId: p.propertyId,
        tenantId: p.tenantId,
      })),
      ...recentMaintenance.map((m) => ({
        id: m.id,
        type: "maintenance" as const,
        description: `New maintenance request: ${m.title}`,
        timestamp: m.createdAt,
        propertyId: m.propertyId,
      })),
    ];

    return activities.slice(0, 6);
  }

  async getUpcomingPayments(
    userId: string
  ): Promise<(Payment & { tenantName: string; propertyName: string })[]> {
    await this.updateOverduePayments(userId);
    const result = await db
      .select({
        payment: payments,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
        propertyName: properties.name,
      })
      .from(payments)
      .leftJoin(tenants, eq(payments.tenantId, tenants.id))
      .leftJoin(properties, eq(payments.propertyId, properties.id))
      .where(
        and(
          eq(payments.userId, userId),
          sql`${payments.status} IN ('pending', 'overdue')`
        )
      )
      .orderBy(payments.dueDate)
      .limit(5);

    return result.map((row) => ({
      ...row.payment,
      tenantName:
        row.tenantFirstName && row.tenantLastName
          ? `${row.tenantFirstName} ${row.tenantLastName}`
          : "Unknown Tenant",
      propertyName: row.propertyName || "Unknown Property",
    }));
  }

  async getExpiringLeases(userId: string): Promise<(Tenant & { propertyName: string })[]> {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        tenant: tenants,
        propertyName: properties.name,
      })
      .from(tenants)
      .leftJoin(properties, eq(tenants.propertyId, properties.id))
      .where(
        and(
          eq(tenants.userId, userId),
          eq(tenants.status, "active"),
          sql`${tenants.leaseEnd} <= ${sixtyDaysFromNow.toISOString().split("T")[0]}`
        )
      )
      .orderBy(tenants.leaseEnd)
      .limit(5);

    return result.map((row) => ({
      ...row.tenant,
      propertyName: row.propertyName || "Unknown Property",
    }));
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
// Also export db for use in other files
export { db };
