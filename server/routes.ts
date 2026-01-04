import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { insertPropertySchema, insertTenantSchema, insertPaymentSchema, insertPaymentHistorySchema, insertMaintenanceRequestSchema, insertExpenseSchema } from "@shared/schema";
import { authRouter, requireAuth } from "./auth";

// Rate limiting for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health check route
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Diagnostic route to check environment and database
  app.get("/api/diagnostic", async (_req, res) => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasSupabaseUrl: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
          hasSupabaseKey: !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
          nodeEnv: process.env.NODE_ENV,
        },
        database: {
          connected: false,
          error: null as string | null,
        },
      };

      // Test database connection
      try {
        await db.execute(sql`SELECT 1`);
        diagnostics.database.connected = true;
      } catch (dbError) {
        diagnostics.database.connected = false;
        diagnostics.database.error = dbError instanceof Error ? dbError.message : String(dbError);
      }

      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({
        error: "Diagnostic check failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Authentication routes (public, with rate limiting)
  app.use("/api/auth", authLimiter, authRouter);

  // Dashboard routes (protected)
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const metrics = await storage.getDashboardMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error in /api/dashboard/metrics:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to fetch dashboard metrics",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.get("/api/dashboard/revenue", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const revenue = await storage.getRevenueData(userId);
      res.json(revenue);
    } catch (error) {
      console.error("Error in /api/dashboard/revenue:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to fetch revenue data",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.get("/api/dashboard/activities", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const activities = await storage.getRecentActivities(userId);
      res.json(activities);
    } catch (error) {
      console.error("Error in /api/dashboard/activities:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to fetch activities",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.get("/api/dashboard/upcoming-payments", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const payments = await storage.getUpcomingPayments(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error in /api/dashboard/upcoming-payments:", error);
      res.status(500).json({ error: "Failed to fetch upcoming payments" });
    }
  });

  app.get("/api/dashboard/expiring-leases", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const leases = await storage.getExpiringLeases(userId);
      res.json(leases);
    } catch (error) {
      console.error("Error in /api/dashboard/expiring-leases:", error);
      res.status(500).json({ error: "Failed to fetch expiring leases" });
    }
  });

  // Property routes (protected)
  app.get("/api/properties", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const properties = await storage.getAllProperties(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error in /api/properties:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to fetch properties",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.get("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const property = await storage.getProperty(req.params.id, userId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", requireAuth, async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:135',message:'POST /api/properties entry',data:{hasAuth:!!req.user,userId:req.user?.id,bodyKeys:Object.keys(req.body||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const userId = req.user!.id;
      const parsed = insertPropertySchema.safeParse(req.body);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:139',message:'Property schema validation',data:{success:parsed.success,errors:parsed.success?null:parsed.error.errors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid property data", details: parsed.error.errors });
      }
      const property = await storage.createProperty(parsed.data, userId);
      res.status(201).json(property);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:145',message:'POST /api/properties error',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error("Error in POST /api/properties:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to create property",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.patch("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const property = await storage.updateProperty(req.params.id, req.body, userId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteProperty(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Tenant routes (protected)
  app.get("/api/tenants", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tenants = await storage.getAllTenants(userId);
      res.json(tenants);
    } catch (error) {
      console.error("Error in /api/tenants:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to fetch tenants",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.get("/api/tenants/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tenant = await storage.getTenant(req.params.id, userId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.post("/api/tenants", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const parsed = insertTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid tenant data", details: parsed.error.errors });
      }
      const tenant = await storage.createTenant(parsed.data, userId);
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error in POST /api/tenants:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to create tenant",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.patch("/api/tenants/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tenant = await storage.updateTenant(req.params.id, req.body, userId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  app.delete("/api/tenants/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteTenant(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  // Payment routes (protected)
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const payments = await storage.getAllPayments(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const payment = await storage.getPayment(req.params.id, userId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const parsed = insertPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payment data", details: parsed.error.errors });
      }
      const payment = await storage.createPayment(parsed.data, userId);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const payment = await storage.updatePayment(req.params.id, req.body, userId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  app.delete("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deletePayment(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }

  });

  app.get("/api/payments/:id/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const payment = await storage.getPayment(req.params.id, userId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      const history = await storage.getPaymentHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  app.post("/api/payments/:id/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const paymentId = req.params.id;
      const payment = await storage.getPayment(paymentId, userId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const parsed = insertPaymentHistorySchema.safeParse({ ...req.body, paymentId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid transaction data", details: parsed.error.errors });
      }

      await storage.createPaymentHistory(parsed.data);

      // Update parent payment status and total
      const history = await storage.getPaymentHistory(paymentId);
      const totalPaid = history.reduce((sum, h) => sum + h.amount, 0);

      let newStatus = "pending";
      if (totalPaid >= payment.amount) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partial"; // Assuming 'partial' is valid in schema now
      }

      const updated = await storage.updatePayment(paymentId, {
        paidAmount: totalPaid,
        status: newStatus,
        paidDate: new Date().toISOString().split("T")[0], // Update last paid date
        method: parsed.data.method, // Update last method
        reference: parsed.data.reference, // Update last ref
      }, userId);

      res.status(201).json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to record transaction" });
    }
  });

  // Maintenance routes (protected)
  app.get("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const requests = await storage.getAllMaintenanceRequests(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  app.get("/api/maintenance/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const request = await storage.getMaintenanceRequest(req.params.id, userId);
      if (!request) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance request" });
    }
  });

  app.post("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const parsed = insertMaintenanceRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid maintenance request data", details: parsed.error.errors });
      }
      const request = await storage.createMaintenanceRequest(parsed.data, userId);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create maintenance request" });
    }
  });

  app.patch("/api/maintenance/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const request = await storage.updateMaintenanceRequest(req.params.id, req.body, userId);
      if (!request) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to update maintenance request" });
    }
  });

  app.delete("/api/maintenance/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteMaintenanceRequest(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete maintenance request" });
    }
  });

  // Expense routes (protected)
  app.get("/api/expenses", requireAuth, async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:445',message:'GET /api/expenses entry',data:{hasAuth:!!req.user,userId:req.user?.id,hasAuthHeader:!!req.headers.authorization},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const userId = req.user.id;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:450',message:'Calling getAllExpenses',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const expenses = await storage.getAllExpenses(userId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:452',message:'getAllExpenses success',data:{count:expenses.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      res.json(expenses);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:455',message:'GET /api/expenses error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined,errorName:error instanceof Error ? error.name : 'Unknown',isConnectionError:error instanceof Error && (error.message.includes('connect') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout') || error.message.includes('DATABASE_URL'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.error("Error in /api/expenses:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      
      // Check if it's a connection error
      const isConnectionError = errorMessage.includes('connect') || 
                                errorMessage.includes('ECONNREFUSED') || 
                                errorMessage.includes('timeout') ||
                                errorMessage.includes('DATABASE_URL');
      
      res.status(500).json({ 
        error: isConnectionError 
          ? "Database connection failed. Please check your DATABASE_URL environment variable."
          : "Failed to fetch expenses",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const expense = await storage.getExpense(req.params.id, userId);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:475',message:'POST /api/expenses entry',data:{hasAuth:!!req.user,userId:req.user?.id,bodyKeys:Object.keys(req.body||{}),bodySize:JSON.stringify(req.body||{}).length,hasBody:!!req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      if (!req.user || !req.user.id) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:477',message:'Missing user in request',data:{hasUser:!!req.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return res.status(401).json({ error: "Authentication required" });
      }
      const userId = req.user.id;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:482',message:'userId extracted',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (!req.body) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:485',message:'Missing request body',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return res.status(400).json({ error: "Request body is required" });
      }
      const parsed = insertExpenseSchema.safeParse(req.body);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:489',message:'Schema validation result',data:{success:parsed.success,errors:parsed.success?null:parsed.error.errors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid expense data", details: parsed.error.errors });
      }
      const expense = await storage.createExpense(parsed.data, userId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:495',message:'Expense created successfully',data:{expenseId:expense.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      res.status(201).json(expense);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:499',message:'POST /api/expenses error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined,errorName:error instanceof Error ? error.name : 'Unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error("Error in POST /api/expenses:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Full error details:", { errorMessage, errorStack });
      res.status(500).json({ 
        error: "Failed to create expense",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
  });

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const expense = await storage.updateExpense(req.params.id, req.body, userId);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteExpense(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.get("/api/expenses/report", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;
      const report = await storage.getExpenseReport(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate expense report" });
    }
  });


  // Tenant Portal Routes
  app.get("/api/tenant/me", requireAuth, async (req, res) => {
    try {
      const email = req.user!.email;
      const tenant = await storage.getTenantByEmail(email);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant profile not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant profile" });
    }
  });

  app.get("/api/tenant/dashboard", requireAuth, async (req, res) => {
    try {
      const email = req.user!.email;
      const tenant = await storage.getTenantByEmail(email);

      if (!tenant) {
        return res.status(404).json({ error: "Tenant profile not found" });
      }

      const [property, payments, maintenance] = await Promise.all([
        storage.getTenantProperty(tenant.id),
        storage.getTenantPayments(tenant.id),
        storage.getTenantMaintenance(tenant.id)
      ]);

      const nextPayment = payments.find(p => p.status === 'pending' || p.status === 'overdue');

      res.json({
        tenant,
        property,
        payments,
        maintenance,
        nextPayment
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant dashboard" });
    }
  });

  return httpServer;

}
