import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with authentication fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Password must be at least 8 characters with uppercase, lowercase, and number
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
}).pick({
  username: true,
  email: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Session table for express-session with connect-pg-simple
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Property Schema - with userId for multi-user support
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  type: text("type").notNull(), // apartment, house, condo, townhouse
  units: integer("units").notNull().default(1),
  occupiedUnits: integer("occupied_units").notNull().default(0),
  monthlyRent: real("monthly_rent").notNull(),
  imageUrl: text("image_url"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, userId: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Tenant Schema - with userId for multi-user support
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  propertyId: varchar("property_id").notNull(),
  unit: text("unit"),
  leaseStart: text("lease_start").notNull(),
  leaseEnd: text("lease_end").notNull(),
  rentAmount: real("rent_amount").notNull(),
  status: text("status").notNull().default("active"), // active, pending, ended
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, userId: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Payment Schema - with userId for multi-user support
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  amount: real("amount").notNull(),
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  status: text("status").notNull().default("pending"), // paid, pending, overdue
  method: text("method"), // bank_transfer, check, cash, online
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, userId: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Maintenance Request Schema - with userId for multi-user support
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull(),
  tenantId: varchar("tenant_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("new"), // new, in_progress, completed
  category: text("category").notNull(), // plumbing, electrical, hvac, appliance, other
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
  assignedTo: text("assigned_to"),
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({ id: true, userId: true });
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

// Dashboard metrics type
export type DashboardMetrics = {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  openMaintenanceRequests: number;
};

// Revenue data for charts
export type RevenueData = {
  month: string;
  revenue: number;
  expenses: number;
};

// Activity log type
export type Activity = {
  id: string;
  type: "payment" | "maintenance" | "lease" | "tenant";
  description: string;
  timestamp: string;
  propertyId?: string;
  tenantId?: string;
};
