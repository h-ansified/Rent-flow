import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Error trap for debugging startup issues
window.addEventListener('error', (event) => {
    const root = document.getElementById("root");
    if (root) {
        root.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Application Error</h1>
      <p>${event.message}</p>
      <pre>${event.error?.stack || 'No stack trace'}</pre>
    </div>`;
    }
});

try {
    createRoot(document.getElementById("root")!).render(<App />);
} catch (e: any) {
    const root = document.getElementById("root");
    if (root) {
        root.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Render Error</h1>
      <p>${e.message}</p>
      <pre>${e.stack}</pre>
    </div>`;
    }
}
