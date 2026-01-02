import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// polyfill import.meta.dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(async () => {
  const plugins: any[] = [react()];

  // Only add Replit-specific plugins in development and when running on Replit
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const cartographer = await import("@replit/vite-plugin-cartographer").then((m) =>
        m.cartographer(),
      );
      const devBanner = await import("@replit/vite-plugin-dev-banner").then((m) =>
        m.devBanner(),
      );
      const runtimeError = await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
        m.default(),
      );
      plugins.push(cartographer, devBanner, runtimeError);
    } catch (error) {
      // Replit plugins not available, skip them
      console.log("Replit plugins not available, skipping...");
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
