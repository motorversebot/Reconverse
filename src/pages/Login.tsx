import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { provisionDealerIfNeeded } from "@/lib/provisionDealer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

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

    // Try to resolve username/email to canonical email
    const email = await resolveIdentifier(identifier.trim()) || identifier.trim();

    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError("Invalid credentials");
      return;
    }
    // signIn stores the user in AuthContext; useAuth will have the user now.
    // We need to check the role from the API response. The user is available
    // via getMe() which signIn already called. Re-read from auth context:
    // Since signIn succeeded, we can fetch /me to decide where to route.
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
