import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug logging
console.log("RAMA AI Frontend starting...");
console.log("API URL:", import.meta.env.VITE_API_URL || "https://backend1-2-z3zg.onrender.com");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  createRoot(rootElement).render(<App />);
}



