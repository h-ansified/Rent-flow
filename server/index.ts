import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool, db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

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

async function seedDemoUser() {
  try {
    const demoEmail = "demo@rentflow.app";
    // Check if user exists (this will fail if DB columns are missing, but it's caught)
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoEmail))
      .limit(1);

    if (!existing) {
      const hashedPassword = await hashPassword("Demo123!");
      await db.insert(users).values({
        username: "demo_user",
        email: demoEmail,
        password: hashedPassword,
        firstName: "Demo",
        lastName: "User",
        companyName: "Demo Properties Ltd",
        currency: "KSH",
      });
      log("Demo user created successfully: demo@rentflow.app");
    } else {
      // Update currency just in case
      await db.update(users).set({ currency: "KSH" }).where(eq(users.email, demoEmail));
      log("Demo user already exists (KSH branding applied)");
    }
  } catch (error) {
    // If this fails (e.g. missing columns), we just log it and continue
    // It's vital that this doesn't crash the server startup
    console.warn("Demo seeding skipped/failed (possibly missing DB columns):", error instanceof Error ? error.message : error);
  }
}

(async () => {
  try {
    await seedDemoUser();
    await registerRoutes(httpServer, app);
  } catch (err) {
    log(`CRITICAL: Failed to start server components: ${err instanceof Error ? err.stack : err}`, "error");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`ERROR: ${message} - ${err.stack}`, "error");
    res.status(status).json({ message, details: process.env.NODE_ENV === "development" ? err.stack : undefined });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
