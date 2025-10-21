import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug logging
console.log("RAMA AI Frontend starting...");
console.log("Environment:", import.meta.env.MODE);
console.log("API URL:", import.meta.env.VITE_API_URL || "https://backend1-2-z3zg.onrender.com");

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found!");
    document.body.innerHTML = "<h1>Error: Root element not found!</h1>";
  } else {
    console.log("Root element found, rendering app...");
    createRoot(rootElement).render(<App />);
  }
} catch (error) {
  console.error("Error rendering app:", error);
  document.body.innerHTML = `<h1>Error: ${error}</h1>`;
}
