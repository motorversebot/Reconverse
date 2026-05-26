import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, CheckCircle } from "lucide-react";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin?: () => void;
}

const SignupModal = ({ open, onOpenChange, onSwitchToLogin }: SignupModalProps) => {
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          shop_name: shopName.trim(),
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setFullName("");
      setShopName("");
      setEmail("");
      setPassword("");
      setError("");
      setSuccess(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-panel-strong border-border bg-[hsl(var(--glass-bg)/0.85)] backdrop-blur-2xl sm:max-w-md p-0 gap-0 overflow-hidden [&>button]:hidden">
        <button
          onClick={handleClose}
          aria-label="Close sign up dialog"
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--glass-border)/0.1)] transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="p-8">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <DialogTitle className="text-xl font-bold text-foreground mb-2">
                Check Your Email
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
                Click it to activate your account.
              </p>
            </div>
          ) : (
            <>
              <DialogTitle className="text-xl font-bold text-foreground text-center mb-1">
                Get Started Free
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Sign up your shop — no credit card required
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-fullname" className="text-sm font-medium text-foreground">Your Name</label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className="bg-[hsl(var(--glass-bg)/0.5)] border-[hsl(var(--glass-border)/0.1)]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-shopname" className="text-sm font-medium text-foreground">Shop / Dealership Name</label>
                  <Input
                    id="signup-shopname"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Acme Motors"
                    className="bg-[hsl(var(--glass-bg)/0.5)] border-[hsl(var(--glass-border)/0.1)]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-[hsl(var(--glass-bg)/0.5)] border-[hsl(var(--glass-border)/0.1)]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[hsl(var(--glass-bg)/0.5)] border-[hsl(var(--glass-border)/0.1)]"
                    required
                    minLength={6}
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
                  {loading ? "Creating account…" : "Create Free Account"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By signing up you agree to our Terms of Service.
                </p>

                {onSwitchToLogin && (
                  <p className="text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        setTimeout(() => onSwitchToLogin(), 200);
                      }}
                      className="text-primary font-medium hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
