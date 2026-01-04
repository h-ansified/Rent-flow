import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool, db } from "./db";
import { users, properties, tenants, payments, maintenanceRequests } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq, and } from "drizzle-orm";

const app = express();
const httpServer = createServer(app);

// PostgreSQL session store
const PgSession = pgSimple(session);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ... helmet and other middleware ...
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
}));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Handle OPTIONS preflight for all routes (fixes potential 405 errors)
app.options("*", (_req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
});

// Session configuration
if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET not set! Using insecure default for development only.");
}

app.set("trust proxy", 1);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function lowercaseExistingEmails() {
  try {
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      if (user.email !== user.email.toLowerCase()) {
        await db.update(users)
          .set({ email: user.email.toLowerCase() })
          .where(eq(users.id, user.id));
        log(`Lowercased email for user: ${user.username}`);
      }
    }
  } catch (error) {
    log("Email lowercasing skipped: " + (error instanceof Error ? error.message : String(error)));
  }
}

async function seedDemoUser() {
  try {
    const demoEmail = "demo@rentflow.app";
    const demoPassword = "Demo123!";
    const hashedPassword = await hashPassword(demoPassword);

    // 1. Create or Update Demo User
    let [demoUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoEmail))
      .limit(1);

    if (!demoUser) {
      [demoUser] = await db.insert(users).values({
        username: "demo_user",
        email: demoEmail,
        password: hashedPassword,
        firstName: "Demo",
        lastName: "User",
        companyName: "Demo Properties Ltd",
        currency: "KSH",
      }).returning();
      log("Demo user created successfully: demo@rentflow.app");
    } else {
      // Force password and currency to ensure login always works
      await db.update(users).set({
        password: hashedPassword,
        currency: "KSH"
      }).where(eq(users.email, demoEmail));
      log("Demo user updated (password & currency synced)");
    }

    // 2. Check for existing data
    const existingProperties = await db.select().from(properties).where(eq(properties.userId, demoUser.id)).limit(1);
    if (existingProperties.length > 0) {
      log("Demo data already exists, skipping property/tenant seeding");
      return;
    }

    log("Seeding default demo data...");

    // 3. Seed Properties
    const [prop1] = await db.insert(properties).values({
      userId: demoUser.id,
      name: "Ocean View Apartments",
      address: "123 Beach Road",
      city: "Mombasa",
      state: "Coast",
      zipCode: "80100",
      type: "apartment",
      units: 10,
      occupiedUnits: 2,
      monthlyRent: 45000,
    }).returning();

    const [prop2] = await db.insert(properties).values({
      userId: demoUser.id,
      name: "Heights Residency",
      address: "45 Ngong Road",
      city: "Nairobi",
      state: "Nairobi",
      zipCode: "00100",
      type: "condo",
      units: 5,
      occupiedUnits: 1,
      monthlyRent: 75000,
    }).returning();

    // 4. Seed Tenants
    const [tenant1] = await db.insert(tenants).values({
      userId: demoUser.id,
      propertyId: prop1.id,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+254712345678",
      unit: "A1",
      leaseStart: "2023-01-01",
      leaseEnd: "2024-01-01",
      rentAmount: 45000,
      status: "active",
    }).returning();

    const [tenant2] = await db.insert(tenants).values({
      userId: demoUser.id,
      propertyId: prop1.id,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "+254722345678",
      unit: "B2",
      leaseStart: "2023-06-01",
      leaseEnd: "2024-06-01",
      rentAmount: 45000,
      status: "active",
    }).returning();

    const [tenant3] = await db.insert(tenants).values({
      userId: demoUser.id,
      propertyId: prop2.id,
      firstName: "Alice",
      lastName: "Wanjiku",
      email: "alice@example.com",
      phone: "+254733345678",
      unit: "Pethouse",
      leaseStart: "2023-03-01",
      leaseEnd: "2024-03-01",
      rentAmount: 75000,
      status: "active",
    }).returning();

    // 5. Seed Payments
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 5).toISOString().split('T')[0];
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split('T')[0];

    await db.insert(payments).values([
      {
        userId: demoUser.id,
        tenantId: tenant1.id,
        propertyId: prop1.id,
        amount: 45000,
        paidAmount: 45000,
        dueDate: lastMonth,
        paidDate: lastMonth,
        status: "paid",
        method: "m_pesa",
        reference: "QTY789XCV",
      },
      {
        userId: demoUser.id,
        tenantId: tenant2.id,
        propertyId: prop1.id,
        amount: 45000,
        paidAmount: 20000,
        dueDate: thisMonth,
        status: "pending",
        notes: "Partial payment made",
      },
      {
        userId: demoUser.id,
        tenantId: tenant3.id,
        propertyId: prop2.id,
        amount: 75000,
        paidAmount: 0,
        dueDate: lastMonth,
        status: "overdue",
      }
    ]);

    // 6. Seed Maintenance
    await db.insert(maintenanceRequests).values({
      userId: demoUser.id,
      propertyId: prop1.id,
      tenantId: tenant1.id,
      title: "Leaky Faucet",
      description: "Kitchen faucet has a steady drip.",
      priority: "medium",
      status: "new",
      category: "plumbing",
      createdAt: today.toISOString().split('T')[0],
    });

    log("Demo data seeded successfully.");
  } catch (error) {
    console.warn("Demo seeding failed:", error instanceof Error ? error.message : error);
  }
}

// Helper to check if running directly
import { fileURLToPath } from "url";

// Setup logic
async function initServer() {
  try {
    // 1. Core setup
    await registerRoutes(httpServer, app);

    // 2. Static files
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // 3. Background tasks (non-blocking for route registration)
    lowercaseExistingEmails().catch(e => log(`Email sync error: ${e}`, "error"));
    seedDemoUser().catch(e => log(`Seeding error: ${e}`, "error"));

  } catch (err) {
    log(`CRITICAL: Failed to initialize server: ${err instanceof Error ? err.stack : err}`, "error");
  }

  // Error handling middleware (must be last)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`ERROR: ${message} - ${err.stack}`, "error");
    res.status(status).json({ message, details: process.env.NODE_ENV === "development" ? err.stack : undefined });
  });
}

// Initialize server components
export const initPromise = initServer();

// For local development
if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.PORT || "5000", 10);
  // We don't await here to allow the module to export the app immediately,
  // but the server will only start listening once initPromise is resolved.
  initPromise.then(() => {
    // Only listen if this is the main module (not imported as a serverless function)
    const isMain = process.argv[1] && (
      process.argv[1].endsWith('index.ts') ||
      process.argv[1].endsWith('index.js') ||
      process.argv[1].endsWith('index.cjs')
    );

    if (isMain) {
      httpServer.listen({ port, host: "0.0.0.0" }, () => {
        log(`serving on port ${port}`);
      });
    }
  });
}

export default app;
