import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import SignupModal from "@/components/SignupModal";

const HeroSection = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-hero pb-32">
      {/* Top nav bar */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">M</span>
          </div>
          <span className="text-base font-semibold text-foreground tracking-tight">Motorverse Recon</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="hero-ghost" size="sm" className="gap-2 rounded-lg" onClick={() => setSignupOpen(true)}>
            Sign Up
          </Button>
          <Button variant="hero-ghost" size="sm" className="gap-2 rounded-lg" onClick={() => setLoginOpen(true)}>
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        </div>
      </nav>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onSwitchToSignup={() => setSignupOpen(true)} />
      <SignupModal open={signupOpen} onOpenChange={setSignupOpen} onSwitchToLogin={() => setLoginOpen(true)} />

      {/* Background ornaments */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/5 blur-[140px]" />
      <div className="absolute top-40 right-1/4 w-[400px] h-[300px] rounded-full bg-accent/8 blur-[120px]" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--foreground)/0.025)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />

      <div className="relative z-10 container mx-auto px-6 pt-36 pb-12">
        {/* Headline cluster */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 status-pill mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Now in Early Access</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.02] mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            The operating system for
            <br />
            <span className="text-gradient-accent">dealership reconditioning.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            Replace whiteboards, group texts, and spreadsheets with one real-time pipeline. Move every unit from intake to front-line ready in days, not weeks.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <Button variant="hero" size="lg" className="text-sm px-7 py-5 rounded-xl" onClick={() => setSignupOpen(true)}>
              Request Early Access
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
            <Button variant="hero-ghost" size="lg" className="text-sm px-7 py-5 rounded-xl">
              See How It Works
            </Button>
          </div>
        </div>

        {/* Floating dashboard preview */}
        <div className="relative mt-20 max-w-5xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
          <div className="absolute -inset-6 bg-gradient-to-tr from-primary/15 via-accent/10 to-primary/10 blur-3xl rounded-[3rem]" />
          <div className="relative glass-panel-strong overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--glass-border)/0.08)]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[hsl(0_60%_60%/0.7)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(40_80%_55%/0.7)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(140_50%_50%/0.7)]" />
              </div>
              <span className="text-muted-foreground text-[11px] font-mono tracking-wide">recon.motorverserecon.com / pipeline</span>
              <div className="w-12" />
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[hsl(var(--glass-border)/0.08)]">
              <KPI label="In Recon" value="142" delta="+8 today" trend="up" />
              <KPI label="Avg Cycle" value="4.2d" delta="−1.8d MoM" trend="down" highlight />
              <KPI label="Front Line" value="12" delta="On schedule" trend="ok" />
              <KPI label="Bottlenecks" value="3" delta="2 overdue" trend="warn" />
            </div>

            {/* Mini pipeline strip */}
            <div className="flex items-center gap-1.5 px-5 py-4 overflow-x-auto">
              {[
                { l: "MPI", n: 18, c: "hsl(var(--accent))" },
                { l: "Estimate", n: 22, c: "hsl(200 70% 55%)" },
                { l: "Approval", n: 14, c: "hsl(40 85% 55%)" },
                { l: "Repair", n: 41, c: "hsl(var(--primary))" },
                { l: "QC", n: 9, c: "hsl(280 55% 60%)" },
                { l: "Ready", n: 12, c: "hsl(152 65% 45%)" },
              ].map((s) => (
                <div key={s.l} className="flex-1 min-w-[88px] rounded-lg border border-[hsl(var(--glass-border)/0.08)] px-3 py-2 bg-background/40">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} />
                    {s.l}
                  </div>
                  <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-0.5">{s.n}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const KPI = ({
  label,
  value,
  delta,
  trend,
  highlight,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "ok" | "warn";
  highlight?: boolean;
}) => {
  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : trend === "warn" ? AlertTriangle : CheckCircle2;
  const tone =
    trend === "warn"
      ? "text-[hsl(40_85%_45%)]"
      : trend === "down"
      ? "text-primary"
      : trend === "up"
      ? "text-primary"
      : "text-muted-foreground";
  return (
    <div className={`p-5 border-r last:border-r-0 border-[hsl(var(--glass-border)/0.08)] ${highlight ? "bg-primary/[0.03]" : ""}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums tracking-tight">{value}</div>
      <div className={`flex items-center gap-1 text-[11px] mt-1 ${tone}`}>
        <Icon className="w-3 h-3" />
        {delta}
      </div>
    </div>
  );
};

export default HeroSection;
