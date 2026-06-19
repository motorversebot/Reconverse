import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorLogging } from "@/lib/clientErrors";

// Apply persisted theme before render – default is light
const storedTheme = localStorage.getItem("mv-theme") || "light";
if (storedTheme === "dark") {
  // Only apply dark when explicitly chosen
} else if (storedTheme === "system") {
  if (!window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("light");
  } else {
    // system prefers dark – no "light" class needed
  }
} else {
  document.documentElement.classList.add("light");
}

installGlobalErrorLogging();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
