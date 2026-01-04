import { createRoot } from "react-dom/client";
import "./index.css";

// 1. Setup Error Trap FIRST (Before App loads)
const showError = (title: string, message: string, stack?: string) => {
  const root = document.getElementById("root");
  if (root) {
    // Check if error is related to missing environment variables
    const isEnvError = message.includes("Supabase") || message.includes("environment") || message.includes("VITE_");
    const helpText = isEnvError 
      ? `<div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-left: 4px solid #fff;">
          <strong>Solution:</strong> Please set the required environment variables in Vercel:
          <ul style="margin-top: 10px;">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>DATABASE_URL</li>
          </ul>
          <p style="margin-top: 10px;">See VERCEL_ENV_SETUP.md for detailed instructions.</p>
        </div>`
      : '';
    
    root.innerHTML = `<div style="padding: 20px; color: white; background: #990000; font-family: monospace; height: 100vh;">
      <h1>${title}</h1>
      <p style="font-size: 1.2em;">${message}</p>
      ${helpText}
      <details style="margin-top: 20px;">
        <summary style="cursor: pointer; padding: 10px; background: rgba(0,0,0,0.3);">Show technical details</summary>
        <pre style="background: rgba(0,0,0,0.3); padding: 10px; overflow: auto; margin-top: 10px;">${stack || 'No stack trace'}</pre>
      </details>
    </div>`;
  }
};

window.addEventListener('error', (event) => {
  showError("Startup Error (Global)", event.message, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  showError("Unhandled Promise Rejection", event.reason?.message || String(event.reason), event.reason?.stack);
});

// 2. Dynamic Import App (Catches import errors)
import("./App")
  .then(({ default: App }) => {
    try {
      createRoot(document.getElementById("root")!).render(<App />);
    } catch (e: any) {
      showError("Render Error", e.message, e.stack);
    }
  })
  .catch((e: any) => {
    showError("Import Error", "Failed to load application. Check console for details.", e?.message + "\n" + e?.stack);
  });
