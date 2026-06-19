// Lightweight client-side crash/error reporting. Logs to the console and
// best-effort POSTs to MC (/client-errors) so crashes are easy to debug.
import { apiFetch } from "@/lib/api";

export interface ClientErrorPayload {
  message: string;
  stack?: string | null;
  component_stack?: string | null;
  source?: string; // "react" | "window" | "promise"
  url?: string;
  user_agent?: string;
}

let lastSig = "";
let lastAt = 0;

export function logClientError(
  input: Partial<ClientErrorPayload> & { message: string },
  source = "react",
) {
  const payload: ClientErrorPayload = {
    message: String(input.message || "Unknown error").slice(0, 2000),
    stack: input.stack ? String(input.stack).slice(0, 8000) : null,
    component_stack: input.component_stack ? String(input.component_stack).slice(0, 8000) : null,
    source,
    url: typeof location !== "undefined" ? location.href : undefined,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // De-dupe identical errors fired in quick succession (React double-invoke, loops).
  const sig = `${payload.source}:${payload.message}`;
  const now = Date.now();
  if (sig === lastSig && now - lastAt < 3000) return;
  lastSig = sig;
  lastAt = now;

  // eslint-disable-next-line no-console
  console.error("[client-error]", payload.source, payload.message, payload.stack || "");

  // Report to MC (never throws, never blocks).
  try {
    void apiFetch("/api/v1/reconverse/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Install global handlers for uncaught errors + unhandled promise rejections. */
export function installGlobalErrorLogging() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    logClientError(
      { message: e.message || "window error", stack: (e.error?.stack as string) || `${e.filename}:${e.lineno}:${e.colno}` },
      "window",
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r: any = e.reason;
    logClientError({ message: r?.message || String(r) || "unhandled rejection", stack: r?.stack || null }, "promise");
  });
}
