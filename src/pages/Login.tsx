import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { provisionDealerIfNeeded } from "@/lib/provisionDealer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

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

const Login = () => {
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

    const email = await resolveIdentifier(identifier.trim());
    if (!email) {
      setLoading(false);
      setError("Invalid credentials");
      return;
    }

    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError("Invalid credentials");
    } else {
      // Check role and redirect accordingly
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
          await provisionDealerIfNeeded();
          navigate("/dealer");
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Helmet>
        <title>Sign in to Reconverse — Recon Management Platform</title>
        <meta name="description" content="Sign in to your Reconverse account to manage vehicle reconditioning, track unit progress, and keep your dealership pipeline moving." />
        <link rel="canonical" href="https://reconverse.app/login" />
        <meta property="og:title" content="Sign in to Reconverse" />
        <meta property="og:description" content="Sign in to manage your dealership's reconditioning pipeline." />
        <meta property="og:url" content="https://reconverse.app/login" />
      </Helmet>
      <Card className="w-full max-w-md glass-panel-strong border-border">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in to Reconverse</h1>
          <CardDescription className="text-muted-foreground">Dealer & Admin Sign-in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-page-identifier" className="text-sm font-medium text-foreground">Email or Username</label>
              <Input
                id="login-page-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or username"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-page-password" className="text-sm font-medium text-foreground">Password</label>
              <Input
                id="login-page-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" variant="hero" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
