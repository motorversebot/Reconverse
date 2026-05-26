import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-identifier`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ identifier }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.email ?? null;
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

    // Resolve identifier to email
    const email = await resolveIdentifier(identifier.trim());
    if (!email) {
      setLoading(false);
      setError("Invalid credentials");
      return;
    }

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setLoading(false);
      setError("Invalid credentials");
      return;
    }

    setLoading(false);
    onOpenChange(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", session.user.id)
        .single();
      if (data?.is_platform_admin) {
        navigate("/platform");
      } else {
        // Auto-provision dealer for self-service signups
        await provisionDealerIfNeeded();
        navigate("/dealer");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel-strong border-border bg-[hsl(var(--glass-bg)/0.85)] backdrop-blur-2xl sm:max-w-md p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close login dialog"
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--glass-border)/0.1)] transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="p-8">
          <DialogTitle className="text-xl font-bold text-foreground text-center mb-1">
            Platform Login
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Sign in to your account
          </p>

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

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {onSwitchToSignup && (
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => onSwitchToSignup(), 200);
                  }}
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
