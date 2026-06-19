import { Component, type ErrorInfo, type ReactNode } from "react";
import { logClientError } from "@/lib/clientErrors";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * App-wide error boundary. Turns a render crash (previously a blank white
 * screen) into a friendly fallback, and reports the error to MC for debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logClientError(
      { message: error?.message || "render error", stack: error?.stack || null, component_stack: info?.componentStack || null },
      "react",
    );
  }

  private reload = () => { window.location.reload(); };
  private home = () => { window.location.assign("/dealer"); };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border text-2xl font-bold text-foreground">!</div>
          <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page hit an unexpected error. It's been logged automatically. Try reloading — your data is safe.
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={this.reload} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Reload</button>
            <button onClick={this.home} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground">Go to dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}
