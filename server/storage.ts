import { db } from "./db";
import {
  users, properties, tenants, payments, paymentHistory, maintenanceRequests, expenses,
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Tenant, type InsertTenant,
  type Payment, type InsertPayment,
  type PaymentHistory, type InsertPaymentHistory,
  type MaintenanceRequest, type InsertMaintenanceRequest,
  type Expense, type InsertExpense,
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
    updates: Partial<Payment>,
    userId: string
  ): Promise<Payment | undefined> {
    const current = await this.getPayment(id, userId);
    if (!current) return undefined;

    // Use the provided paidAmount or fallback to current
    const finalPaidAmount = updates.paidAmount !== undefined ? updates.paidAmount : (current.paidAmount || 0);
    const isCleared = finalPaidAmount >= current.amount;

    const finalUpdates: any = {
      ...updates,
      paidAmount: finalPaidAmount,
      status: isCleared ? "paid" : (current.dueDate < new Date().toISOString().split("T")[0] ? "overdue" : "pending"),
      paidDate: isCleared ? (updates.paidDate || new Date().toISOString().split("T")[0]) : (updates.paidDate || current.paidDate)
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

  async createPaymentHistory(record: InsertPaymentHistory): Promise<PaymentHistory> {
    const [history] = await db
      .insert(paymentHistory)
      .values(record)
      .returning();
    return history;
  }

  async getPaymentHistory(paymentId: string): Promise<PaymentHistory[]> {
    return await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.paymentId, paymentId))
      .orderBy(desc(paymentHistory.date));
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
    const [maybePropertyStats] = await db
      .select({
        totalProperties: sql<number>`COUNT(*)::int`,
        totalUnits: sql<number>`COALESCE(SUM(${properties.units}), 0)::int`,
        occupiedUnits: sql<number>`COALESCE(SUM(${properties.occupiedUnits}), 0)::int`,
        monthlyRevenue: sql<number>`COALESCE(SUM(${properties.monthlyRent} * ${properties.occupiedUnits}), 0)::float`,
      })
      .from(properties)
      .where(eq(properties.userId, userId));

    const [maybePaymentStats] = await db
      .select({
        pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
        overduePayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'overdue' THEN 1 END)::int`,
      })
      .from(payments)
      .where(eq(payments.userId, userId));

    const [maybeMaintenanceStats] = await db
      .select({
        openRequests: sql<number>`COUNT(CASE WHEN ${maintenanceRequests.status} != 'completed' THEN 1 END)::int`,
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.userId, userId));

    const propertyStats = maybePropertyStats || { totalProperties: 0, totalUnits: 0, occupiedUnits: 0, monthlyRevenue: 0 };
    const paymentStats = maybePaymentStats || { pendingPayments: 0, overduePayments: 0 };
    const maintenanceStats = maybeMaintenanceStats || { openRequests: 0 };

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
    const monthlyRevenue: Record<string, number> = {};
    const monthlyExpenses: Record<string, number> = {};
    const months: string[] = [];

    // Initialize last 6 months based on current server time
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      monthlyRevenue[monthName] = 0;
      monthlyExpenses[monthName] = 0;
    }

    // Fetch all payments with collections (actual revenue)
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

    // Fetch all expenses with payments (actual expenses)
    const expensePayments = await db
      .select({
        paidAmount: expenses.paidAmount,
        paidDate: expenses.paidDate,
        dueDate: expenses.dueDate, // Fallback
      })
      .from(expenses)
      .where(and(
        eq(expenses.userId, userId),
        sql`${expenses.paidAmount} > 0`
      ));

    // Aggregate revenue by month
    collections.forEach(p => {
      const dateStr = p.paidDate || p.dueDate;
      if (dateStr) {
        const date = new Date(dateStr);
        const monthName = date.toLocaleString('default', { month: 'short' });
        if (monthlyRevenue[monthName] !== undefined) {
          monthlyRevenue[monthName] += p.paidAmount;
        }
      }
    });

    // Aggregate expenses by month
    expensePayments.forEach(e => {
      const dateStr = e.paidDate || e.dueDate;
      if (dateStr) {
        const date = new Date(dateStr);
        const monthName = date.toLocaleString('default', { month: 'short' });
        if (monthlyExpenses[monthName] !== undefined) {
          monthlyExpenses[monthName] += e.paidAmount;
        }
      }
    });

    return months.map(month => ({
      month,
      revenue: monthlyRevenue[month],
      expenses: monthlyExpenses[month],
    }));
  }

  async getRecentActivities(userId: string): Promise<Activity[]> {
    // This would ideally come from an activity log table
    // For now, return recent payments, maintenance, expenses, and tenant activities
    const recentPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidDate: payments.paidDate,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
        propertyId: payments.propertyId,
        tenantId: payments.tenantId,
      })
      .from(payments)
      .leftJoin(tenants, eq(payments.tenantId, tenants.id))
      .where(and(eq(payments.userId, userId), sql`${payments.paidAmount} > 0`))
      .orderBy(desc(payments.paidDate))
      .limit(5);

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
      .limit(5);

    const recentExpenses = await db
      .select({
        id: expenses.id,
        title: expenses.title,
        amount: expenses.amount,
        createdAt: expenses.createdAt,
        propertyId: expenses.propertyId,
      })
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.createdAt))
      .limit(5);

    const newTenants = await db
      .select({
        id: tenants.id,
        firstName: tenants.firstName,
        lastName: tenants.lastName,
        propertyId: tenants.propertyId,
        leaseStart: tenants.leaseStart,
      })
      .from(tenants)
      .where(eq(tenants.userId, userId))
      .orderBy(desc(tenants.leaseStart))
      .limit(5);

    const activities: Activity[] = [
      ...recentPayments.map((p) => ({
        id: `pay-${p.id}`,
        type: "payment" as const,
        description: `Payment received: ${p.tenantFirstName} ${p.tenantLastName || ''} paid ${p.amount}`,
        timestamp: p.paidDate || new Date().toISOString(),
        propertyId: p.propertyId,
        tenantId: p.tenantId,
      })),
      ...recentMaintenance.map((m) => ({
        id: `maint-${m.id}`,
        type: "maintenance" as const,
        description: `Maintenance Request: ${m.title}`,
        timestamp: m.createdAt,
        propertyId: m.propertyId,
      })),
      ...recentExpenses.map((e) => ({
        id: `exp-${e.id}`,
        type: "maintenance" as const, // Categorize expenses under maintenance for icon consistency
        description: `Expense Recorded: ${e.title} (${e.amount})`,
        timestamp: new Date(e.createdAt).toISOString(),
        propertyId: e.propertyId || undefined,
      })),
      ...newTenants.map((t) => ({
        id: `ten-${t.id}`,
        type: "tenant" as const,
        description: `New Tenant: ${t.firstName} ${t.lastName}`,
        timestamp: t.leaseStart,
        propertyId: t.propertyId,
      })),
    ];

    // Unified sort by timestamp (newest first)
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
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

  // ===================
  // EXPENSE METHODS
  // ===================

  private async updateOverdueExpenses(userId: string): Promise<void> {
    const now = new Date().toISOString().split("T")[0];
    await db
      .update(expenses)
      .set({ status: "overdue" })
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.status, "pending"),
          sql`${expenses.dueDate} < ${now}`,
          sql`${expenses.amount} > ${expenses.paidAmount}`
        )
      );
  }

  async getAllExpenses(userId: string): Promise<(Expense & { propertyName?: string })[]> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/storage.ts:674',message:'getAllExpenses entry',data:{userId,hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    try {
      if (!userId) {
        throw new Error("User ID is required to fetch expenses");
      }
      await this.updateOverdueExpenses(userId);
      const result = await db
        .select({
          expense: expenses,
          propertyName: properties.name,
        })
        .from(expenses)
        .leftJoin(properties, eq(expenses.propertyId, properties.id))
        .where(eq(expenses.userId, userId))
        .orderBy(desc(expenses.dueDate));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/storage.ts:686',message:'getAllExpenses success',data:{count:result.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return result.map((row) => ({
        ...row.expense,
        propertyName: row.propertyName || undefined,
      }));
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/storage.ts:693',message:'getAllExpenses database error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',isConnectionError:error instanceof Error && (error.message.includes('connect') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }

  async getExpense(id: string, userId: string): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .limit(1);
    return expense;
  }

  async createExpense(insertExpense: InsertExpense, userId: string): Promise<Expense> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/storage.ts:701',message:'createExpense entry',data:{userId,expenseKeys:Object.keys(insertExpense||{}),hasTitle:!!insertExpense?.title,hasAmount:!!insertExpense?.amount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      if (!userId) {
        throw new Error("User ID is required to create expense");
      }
      if (!insertExpense) {
        throw new Error("Expense data is required");
      }
      const [expense] = await db
        .insert(expenses)
        .values({ ...insertExpense, userId })
        .returning();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/storage.ts:710',message:'createExpense success',data:{expenseId:expense.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return expense;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/storage.ts:714',message:'createExpense database error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',isConnectionError:error instanceof Error && (error.message.includes('connect') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }

  async updateExpense(
    id: string,
    updates: Partial<Expense>,
    userId: string
  ): Promise<Expense | undefined> {
    const current = await this.getExpense(id, userId);
    if (!current) return undefined;

    // Use the provided paidAmount or fallback to current
    const finalPaidAmount = updates.paidAmount !== undefined ? updates.paidAmount : (current.paidAmount || 0);
    const isCleared = finalPaidAmount >= current.amount;

    const finalUpdates: any = {
      ...updates,
      paidAmount: finalPaidAmount,
      status: isCleared ? "paid" : (current.dueDate < new Date().toISOString().split("T")[0] ? "overdue" : "pending"),
      paidDate: isCleared ? (updates.paidDate || new Date().toISOString().split("T")[0]) : (updates.paidDate || current.paidDate)
    };

    const [expense] = await db
      .update(expenses)
      .set(finalUpdates)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return expense;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });
    return result.length > 0;
  }

  async getExpenseReport(userId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    const conditions = [eq(expenses.userId, userId)];

    if (startDate) {
      conditions.push(sql`${expenses.dueDate} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${expenses.dueDate} <= ${endDate}`);
    }

    return await db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.dueDate));
  }

  // ===================
  // TENANT PORTAL METHODS
  // ===================

  async getTenantByEmail(email: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.email, email))
      .limit(1);
    return tenant;
  }

  async getTenantProperty(tenantId: string): Promise<Property | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) return undefined;

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, tenant.propertyId))
      .limit(1);

    return property;
  }

  async getTenantPayments(tenantId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.dueDate));
  }

  async getTenantMaintenance(tenantId: string): Promise<MaintenanceRequest[]> {
    return await db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.tenantId, tenantId))
      .orderBy(desc(maintenanceRequests.createdAt));
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
// Also export db for use in other files
export { db };
