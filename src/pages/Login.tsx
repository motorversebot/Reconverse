import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { provisionDealerIfNeeded } from "@/lib/provisionDealer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { ShieldAlert, ArrowLeft } from "lucide-react";

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

    const email = await resolveIdentifier(identifier.trim()) || identifier.trim();

    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError("Invalid credentials");
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-background selection:bg-neutral-800 p-6 relative">
      <Helmet>
        <title>Sign in to Reconverse — Recon Management Platform</title>
        <meta name="description" content="Sign in to your Reconverse account to manage vehicle reconditioning, track unit progress, and keep your dealership pipeline moving." />
        <link rel="canonical" href="https://reconverse.app/login" />
        <meta property="og:title" content="Sign in to Reconverse" />
        <meta property="og:description" content="Sign in to manage your dealership's reconditioning pipeline." />
        <meta property="og:url" content="https://reconverse.app/login" />
      </Helmet>

      {/* Back Link */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
      </Link>

      <div className="w-full max-w-md space-y-8">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center gap-2 select-none">
          <div className="h-9 w-9 rounded-none border border-foreground bg-foreground text-background flex items-center justify-center font-mono font-bold text-sm">
            R
          </div>
          <div>
            <h2 className="font-mono font-bold tracking-widest text-foreground text-base uppercase">Reconverse</h2>
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">RECON MANAGEMENT HUB</p>
          </div>
        </div>

        <Card className="border border-border rounded-none bg-card w-full shadow-none relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-foreground" />
          
          <CardHeader className="text-center pb-3 pt-8">
            <CardTitle className="text-sm font-mono font-bold uppercase tracking-wider text-foreground">Sign In to Dashboard</CardTitle>
            <CardDescription className="text-[10px] font-mono uppercase text-muted-foreground">Admin & Staff workspace gate</CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-page-identifier" className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">Email or Username</label>
                <Input
                  id="login-page-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@dealership.com or username"
                  className="h-10 text-xs bg-transparent border-border rounded-none focus-visible:ring-foreground focus-visible:border-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="login-page-password" className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">Password</label>
                <Input
                  id="login-page-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 text-xs bg-transparent border-border rounded-none focus-visible:ring-foreground focus-visible:border-foreground"
                  required
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-none bg-red-950/20 text-red-400 border border-red-950/50 text-xs font-mono">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error.toUpperCase()}</span>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-10 rounded-none border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground text-xs font-mono uppercase tracking-wider transition-all mt-6"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-3.5 w-3.5 border border-background border-t-transparent rounded-none animate-spin" />
                    <span>Authenticating…</span>
                  </div>
                ) : "Enter Terminal"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
            Authorized personnel only. Sessions are audited and logged.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
