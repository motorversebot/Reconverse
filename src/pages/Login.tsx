import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { provisionDealerIfNeeded } from "@/lib/provisionDealer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { ShieldAlert, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen flex bg-background selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>Sign in to Reconverse — Recon Management Platform</title>
        <meta name="description" content="Sign in to your Reconverse account to manage vehicle reconditioning, track unit progress, and keep your dealership pipeline moving." />
        <link rel="canonical" href="https://reconverse.app/login" />
        <meta property="og:title" content="Sign in to Reconverse" />
        <meta property="og:description" content="Sign in to manage your dealership's reconditioning pipeline." />
        <meta property="og:url" content="https://reconverse.app/login" />
      </Helmet>

      {/* Left Pane (Showcase - hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-hero border-r border-border/30 flex-col justify-between p-12 overflow-hidden select-none">
        {/* Glow gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Brand header */}
        <Link to="/" className="flex items-center gap-2.5 z-10 self-start group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-foreground font-black text-base shadow-[0_0_20px_rgba(185,90,250,0.25)] group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="font-extrabold tracking-tight text-foreground text-base group-hover:text-primary transition-colors">Reconverse</span>
          <span className="text-[9px] font-bold text-muted-foreground/50 border border-border/60 px-2 py-0.5 rounded-full ml-1">.app</span>
        </Link>

        {/* Feature/Testimonial presentation */}
        <div className="z-10 my-auto max-w-md space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20">
            <Sparkles className="h-3 w-3" /> Fully Integrated Lot Speeder
          </div>
          
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            Consolidate your dealership's reconditioning in <span className="text-gradient-accent">one workspace</span>.
          </h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Mobile-First Lot Inspections</h4>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Let technicians construct MPI inspects straight from vehicle hoods.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Instant Estimate Handshake</h4>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Generate estimations line-by-line and approve via push triggers.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Server-Level Multi-Tenancy</h4>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Automated RLS gates keep dealership inventory safely separated.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4.5 bg-background/25 border-primary/10 shadow-lg shadow-black/30">
            <p className="text-xs text-muted-foreground/90 italic leading-relaxed">
              "We slashed our key-to-key cycle from 8.5 days down to 36 hours. The tech dashboard eliminated paper tracking for good."
            </p>
            <p className="text-[10px] font-bold text-foreground/80 tracking-wide uppercase mt-2.5">— Fixed-Ops Manager, Apex Motors</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="z-10 flex items-center justify-between text-[11px] text-muted-foreground/45 border-t border-border/20 pt-6">
          <span>Part of Motorverse</span>
          <span>© {new Date().getFullYear()} Reconverse Inc.</span>
        </div>
      </div>

      {/* Right Pane (Login Container) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background relative overflow-hidden">
        {/* Glow circles for mobile backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] bg-primary/5 rounded-full blur-[80px] pointer-events-none lg:hidden" />
        
        {/* Back Link */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header (shown on small viewports) */}
          <div className="flex flex-col items-center lg:hidden text-center gap-2.5 mb-2 select-none">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-foreground font-black text-base shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
              R
            </div>
            <div>
              <h2 className="font-extrabold text-foreground tracking-tight text-lg">Reconverse</h2>
              <p className="text-[11px] text-muted-foreground/60">Dealer recon pipeline platform</p>
            </div>
          </div>

          <Card className="glass-panel-strong border-border/40 w-full shadow-2xl relative overflow-hidden shadow-black/40">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent" />
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-xl font-extrabold text-foreground">Sign In to Dashboard</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Admin & Staff workspace gate</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-page-identifier" className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Email or Username</label>
                  <Input
                    id="login-page-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@dealership.com or username"
                    className="h-10 text-xs bg-muted/10 border-border/30 focus-visible:ring-accent focus-visible:border-accent focus:border-accent/80 transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="login-page-password" className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Password</label>
                  </div>
                  <Input
                    id="login-page-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs bg-muted/10 border-border/30 focus-visible:ring-accent focus-visible:border-accent focus:border-accent/80 transition-all duration-200"
                    required
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-10 font-black tracking-wide uppercase text-xs shadow-lg shadow-primary/20 hover:shadow-accent/20 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 border-0 text-foreground transition-all mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating…</span>
                    </div>
                  ) : "Enter Terminal"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
              Multi-tenant vehicle operations. By signing in, you access secure dealership resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
