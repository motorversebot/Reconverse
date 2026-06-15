import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-wide error boundary. Catches render-time crashes so a single broken
 * screen can't take down the whole dealer workspace with a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to the console so it shows up in browser logs / Sentry-style tools.
    console.error("Uncaught render error:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page hit an unexpected error. Reloading usually fixes it. If it keeps
          happening, contact support.
        </p>
        {this.state.error?.message && (
          <pre className="max-w-md overflow-auto rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
        )}
        <Button onClick={this.handleReload}>Reload page</Button>
      </div>
    );
  }
}
