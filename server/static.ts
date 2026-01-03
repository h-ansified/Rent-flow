import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use process.cwd() which is the most reliable way to find the project root in Vercel/Node
  const distPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(path.join(distPath, "index.html"))) {
    console.warn(`Static assets directory not found at ${distPath}. Checking alternative paths...`);

    // Fallback for cases where we might be running inside the dist folder itself
    const altPath = path.resolve(process.cwd());
    if (fs.existsSync(path.join(altPath, "index.html"))) {
      serve(app, altPath);
      return;
    }

    console.error("Could not find static assets. The application may show a blank page.");
    return;
  }

  serve(app, distPath);
}

function serve(app: Express, staticPath: string) {
  app.use(express.static(staticPath));

  // Catch-all route for SPA
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(staticPath, "index.html"));
  });
}
