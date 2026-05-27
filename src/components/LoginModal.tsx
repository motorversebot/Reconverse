import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, loginErrorMessage } from "@/lib/api";
import { provisionDealerIfNeeded } from "@/lib/provisionDealer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignup?: () => void;
}

async function resolveIdentifier(identifier: string): Promise<string | null> {
  try {
    const res = await apiFetch("/api/v1/reconverse/resolve-identifier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.email ?? data?.email ?? null;
  } catch {
    return null;
  }
}

const LoginModal = ({ open, onOpenChange, onSwitchToSignup }: LoginModalProps) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const email = await resolveIdentifier(identifier.trim()) || identifier.trim();

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setLoading(false);
      setError(loginErrorMessage(signInError.message));
      return;
    }

    setLoading(false);
    onOpenChange(false);

    try {
      const meRes = await apiFetch("/api/v1/auth/me");
      const meJ = await meRes.json().catch(() => null);
      if (meJ?.ok && meJ.data?.user?.is_platform_admin) {
        navigate("/platform");
      } else {
        await provisionDealerIfNeeded();
        navigate("/dealer");
      }
    } catch {
      navigate("/dealer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel-strong border-border sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Sign in to Reconverse</DialogTitle>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 p-1 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 grid place-items-center text-background font-black text-lg mx-auto mb-3">
              R
            </div>
            <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to Reconverse</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-identifier" className="text-sm font-medium text-foreground">Email or Username</label>
              <Input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or username"
                className="bg-[hsl(var(--glass-bg)/0.5)] border-[hsl(var(--glass-border)/0.1)]"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[hsl(var(--glass-bg)/0.5)] border-[hsl(var(--glass-border)/0.1)]"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>

            <div className="text-center">
              <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </button>
            </div>

            {onSwitchToSignup && (
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { onOpenChange(false); setTimeout(() => onSwitchToSignup(), 200); }}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
