import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { insertPropertySchema, insertTenantSchema, insertPaymentSchema, insertMaintenanceRequestSchema } from "@shared/schema";
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

  // Authentication routes (public, with rate limiting)
  app.use("/api/auth", authLimiter, authRouter);

  // Dashboard routes (protected)
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const metrics = await storage.getDashboardMetrics(userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/revenue", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const revenue = await storage.getRevenueData(userId);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue data" });
    }
  });

  app.get("/api/dashboard/activities", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const activities = await storage.getRecentActivities(userId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/dashboard/upcoming-payments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const payments = await storage.getUpcomingPayments(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming payments" });
    }
  });

  app.get("/api/dashboard/expiring-leases", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const leases = await storage.getExpiringLeases(userId);
      res.json(leases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expiring leases" });
    }
  });

  // Property routes (protected)
  app.get("/api/properties", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const properties = await storage.getAllProperties(userId);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
    try {
      const userId = req.session.userId!;
      const parsed = insertPropertySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid property data", details: parsed.error.errors });
      }
      const property = await storage.createProperty(parsed.data, userId);
      res.status(201).json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const tenants = await storage.getAllTenants(userId);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const parsed = insertTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid tenant data", details: parsed.error.errors });
      }
      const tenant = await storage.createTenant(parsed.data, userId);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  app.patch("/api/tenants/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const payments = await storage.getAllPayments(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const deleted = await storage.deletePayment(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // Maintenance routes (protected)
  app.get("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const requests = await storage.getAllMaintenanceRequests(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  app.get("/api/maintenance/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const deleted = await storage.deleteMaintenanceRequest(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete maintenance request" });
    }
  });

  return httpServer;
}
