import { createRoot } from "react-dom/client";
import "./index.css";

// 1. Setup Error Trap FIRST (Before App loads)
const showError = (title: string, message: string, stack?: string) => {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: white; background: #990000; font-family: monospace; height: 100vh;">
      <h1>${title}</h1>
      <p style="font-size: 1.2em;">${message}</p>
      <pre style="background: rgba(0,0,0,0.3); padding: 10px; overflow: auto;">${stack || 'No stack trace'}</pre>
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
