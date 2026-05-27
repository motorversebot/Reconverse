import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  ClipboardCheck,
  Calculator,
  ThumbsUp,
  Wrench,
  ShieldCheck,
  Tag,
  Car,
  Camera,
  Activity,
  Users,
  Smartphone,
  Gauge,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Pipeline stages used in the interactive centerpiece ── */
const STAGES = [
  { 
    id: "intake", 
    label: "Intake", 
    icon: Car, 
    tint: "text-sky-400", 
    dot: "bg-sky-400",
    description: "Scan VIN to decode vehicle specs instantly, assign stock numbers, and ingest the vehicle into the lot workflow.",
    role: "Intake Agent",
    metric: "12 units"
  },
  { 
    id: "mpi", 
    label: "MPI", 
    icon: ClipboardCheck, 
    tint: "text-amber-400", 
    dot: "bg-amber-400",
    description: "Execute a mobile-friendly Multi-Point Inspection. Grade items as pass, fail, or monitor with notes & photos.",
    role: "Technician",
    metric: "8 units"
  },
  { 
    id: "estimate", 
    label: "Estimate", 
    icon: Calculator, 
    tint: "text-blue-400", 
    dot: "bg-blue-400",
    description: "Draft comprehensive estimate sheets containing labor rates, part costs, and sublet itemizations automatically.",
    role: "Service Advisor",
    metric: "5 units"
  },
  { 
    id: "approval", 
    label: "Approval", 
    icon: ThumbsUp, 
    tint: "text-orange-400", 
    dot: "bg-orange-400",
    description: "Dealers or owners approve or decline repairs item-by-item, moving approved work directly to the service lane.",
    role: "Dealer Manager",
    metric: "3 units"
  },
  { 
    id: "repair", 
    label: "Repair", 
    icon: Wrench, 
    tint: "text-purple-400", 
    dot: "bg-purple-400",
    description: "Service technicians address approved work orders and track status adjustments in real time.",
    role: "Mechanic",
    metric: "6 units"
  },
  { 
    id: "qc", 
    label: "QC", 
    icon: ShieldCheck, 
    tint: "text-teal-400", 
    dot: "bg-teal-400",
    description: "A final verification checklist confirms that all safety and cosmetic standards are fully resolved before listing.",
    role: "QC Inspector",
    metric: "2 units"
  },
  { 
    id: "ready", 
    label: "Ready", 
    icon: Tag, 
    tint: "text-emerald-400", 
    dot: "bg-emerald-400",
    description: "Flagged ready for sale, complete with pricing and inspection certificates, ready to print lot guides.",
    role: "Sales Admin",
    metric: "9 units"
  },
] as const;

/* ── Top navigation ── */
function Nav() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/50 border-b border-border/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 grid place-items-center text-background font-black text-base shadow-[0_0_20px_hsl(var(--primary)/0.25)] group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="font-extrabold tracking-tight text-foreground text-lg">Reconverse</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full ml-1">
            Rebrand
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            id="nav-signin-link"
            to="/login"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="gap-1.5 h-9 px-4 text-xs font-semibold shadow-lg shadow-primary/20">
            <Link to="/login" id="nav-getstarted-btn">
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ── */
function Hero({ activeStage, setActiveStage }: { activeStage: string; setActiveStage: (id: string) => void }) {
  return (
    <section className="relative bg-gradient-hero overflow-hidden pb-12">
      {/* Decorative backdrop glow meshes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-accent/80 rounded-full blur-[100px] pointer-events-none opacity-20" />
      
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Eyebrow badge */}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Reconditioning SaaS for Modern Rooftops
          </span>

          {/* Headline */}
          <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-foreground animate-fade-in-up">
            Accelerate your used cars from{" "}
            <span className="text-gradient-accent">intake to frontline</span>{" "}
            in days, not weeks.
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-muted-foreground/80 max-w-2xl leading-relaxed">
            Reconverse synchronizes your dealership's inspections, estimate builders, approvals, and work orders in a single, mobile-first pipeline designed for lot speed.
          </p>

          {/* Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2 h-12 px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] transition-all">
              <Link to="/login" id="hero-getstarted-btn">
                Start Redeeming Cycle
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto gap-2 h-12 px-8 font-semibold border-border/40 text-foreground/85 bg-background/20 backdrop-blur-md hover:bg-background/40">
              <Link to="/login" id="hero-signin-btn">
                <Lock className="h-4 w-4 text-muted-foreground/60" /> Member Login
              </Link>
            </Button>
          </div>

          {/* Value markers */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/50">
            <span>✓ Multi-rooftop Scoped</span>
            <span>·</span>
            <span>✓ Mobile-first lot-ready</span>
            <span>·</span>
            <span>✓ Auto VIN Decoder</span>
          </div>
        </div>

        {/* Dynamic Centerpiece Showcase */}
        <div className="mt-16 sm:mt-20">
          <PipelineShowcase activeStage={activeStage} setActiveStage={setActiveStage} />
        </div>
      </div>
    </section>
  );
}

/* ── Interactive Pipeline Showcase Card ── */
function PipelineShowcase({ activeStage, setActiveStage }: { activeStage: string; setActiveStage: (id: string) => void }) {
  const currentStageInfo = STAGES.find(s => s.id === activeStage) || STAGES[0];
  const ActiveIcon = currentStageInfo.icon;

  return (
    <div className="glass-panel-strong p-6 sm:p-8 max-w-5xl mx-auto relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 border-b border-border/30 pb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary/70">
            Pipeline Explorer
          </p>
          <h3 className="text-sm font-semibold text-foreground/50 mt-0.5">Click/Hover stages to inspect details</h3>
        </div>
        <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground/40 bg-muted/30 px-3 py-1 rounded-md">
          reconverse.app/workspace
        </span>
      </div>

      {/* Stage Grid Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = stage.id === activeStage;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              onMouseEnter={() => setActiveStage(stage.id)}
              className={cn(
                "glass-panel p-4 flex flex-col gap-3 text-left transition-all duration-300 relative group",
                isActive 
                  ? "border-primary/50 bg-primary/5 scale-[1.02] shadow-[0_0_20px_hsl(var(--primary)/0.08)]" 
                  : "hover:border-border/80 hover:bg-muted/10"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", stage.dot)} />
                  <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wide uppercase">
                    {stage.label}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">
                  {stage.metric.split(" ")[0]}
                </span>
                <Icon className={cn("h-4 w-4 opacity-70 group-hover:scale-110 transition-transform", stage.tint)} />
              </div>
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-emerald-400 rounded-b-xl" />
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Detail Panel */}
      <div className="glass-panel p-5 bg-background/30 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-500 animate-fade-in border-primary/10">
        <div className="flex items-start gap-4">
          <div className={cn("h-14 w-14 rounded-2xl border border-border/40 flex items-center justify-center bg-muted/10 shrink-0 shadow-inner", currentStageInfo.dot.replace("bg-", "text-"))}>
            <ActiveIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-foreground">{currentStageInfo.label} Stage</h4>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                Active: {currentStageInfo.metric}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-1.5 max-w-xl leading-relaxed">
              {currentStageInfo.description}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-border/45 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Primary Owner</span>
          <span className="text-sm font-semibold text-foreground mt-0.5">{currentStageInfo.role}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Features section ── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Multi-point Inspections",
    body: "Technicians walk the lot with mobile-first checklist sheets. Grade parts, take quick vehicle photos, and add notes inline in real time.",
  },
  {
    icon: Calculator,
    title: "Dynamic Estimate Builder",
    body: "Compile structured estimates featuring labor operations, parts sourcing, and sublet items. Automate parts margins and tax equations.",
  },
  {
    icon: ThumbsUp,
    title: "One-Click Approvals",
    body: "Decision-makers approve or decline estimates line-by-line via mobile triggers, generating direct shop repair orders instantaneously.",
  },
  {
    icon: Camera,
    title: "Visual Evidence Photos",
    body: "Bind specific photos (odometer, damage, completed works) to service lines, stored securely on high-speed bucket systems.",
  },
  {
    icon: Activity,
    title: "Continuous Activity Trail",
    body: "Chronologically record stage adjustments, user comments, and pricing updates. Keep your team aligned with zero verbal friction.",
  },
  {
    icon: Users,
    title: "Robust Multi-Tenancy",
    body: "Enterprise database rules enforce rigorous row-level isolation between different dealer rooftops. Data is kept fully secure and segregated.",
  },
] as const;

function Features() {
  return (
    <section className="relative py-20 sm:py-24 border-t border-border/20 bg-background">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Platform Capabilities
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Engineered for real-world lot performance.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl mx-auto">
            Reconverse simplifies vehicle reconditioning by replacing verbal handoffs, whiteboards, and spreadsheets with a single connected workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="floating-card group glow-overlay-container hover:scale-[1.01]"
              >
                <div className="glow-overlay" />
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors shadow-inner">
                  <Icon className="h-5.5 w-5.5 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2.5">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ── */
const HOW_STEPS = [
  {
    n: "01",
    icon: Car,
    title: "Ingest the Vehicle",
    body: "Instantly scan the vehicle's VIN. Our tool decodes vehicle configuration parameters automatically, registering stock indicators.",
  },
  {
    n: "02",
    icon: Gauge,
    title: "Run the Recon Lanes",
    body: "Lanes process vehicles concurrently. Complete assessments, gather manager line sign-offs, and monitor aging warnings.",
  },
  {
    n: "03",
    icon: CheckCircle2,
    title: "Frontline & Sale Check",
    body: "Once QC authorizes, the unit is flagged for frontline listing. Audit trails track metrics, and vehicle stages update automatically.",
  },
] as const;

function HowItWorks() {
  return (
    <section className="relative bg-gradient-section py-20 sm:py-24 border-t border-border/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Speed-To-Frontline
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Establish a standardized cycle.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="glass-panel p-8 relative overflow-hidden group hover:border-primary/25 transition-all">
                <span className="absolute -right-3 -top-5 text-7xl font-black text-foreground/5 select-none font-mono group-hover:scale-105 transition-transform duration-300">
                  {s.n}
                </span>
                <Icon className="h-7 w-7 text-primary mb-5" />
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground/75 leading-relaxed">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Core Value Strip ── */
function ValueStrip() {
  const items = [
    { icon: Smartphone, label: "Mobilized Workforce", body: "Equip lot managers and service techs with an intuitive mobile workflow." },
    { icon: ShieldCheck, label: "Strict RLS Governance", body: "Dealer workspace contents are separated securely at the server-database level." },
    { icon: Activity, label: "Impeccable Audit Trail", body: "Automatic change history loggers track vehicle updates chronologically." },
  ];
  return (
    <section className="relative py-16 border-t border-border/20 bg-background">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground/90">{it.label}</h4>
                  <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{it.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Final Call To Action ── */
function FinalCTA() {
  return (
    <section className="relative py-20 sm:py-24 border-t border-border/10">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <div className="glass-panel-strong p-10 sm:p-14 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(152 75% 55% / 0.2), transparent), radial-gradient(ellipse 50% 40% at 50% 100%, hsl(260 70% 60% / 0.15), transparent)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Ready to accelerate your turn rate?
            </h2>
            <p className="mt-4 text-xs text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
              Consolidate your entire reconditioning loop inside a single dashboard. Get started instantly without set-up friction or credit cards.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto gap-2 h-12 px-8 font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform">
                <Link to="/login" id="cta-getstarted-btn">
                  Start Free Trial
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto gap-2 h-12 px-8 font-semibold border-border/40 bg-background/25">
                <Link to="/login" id="cta-signin-btn">Member Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function LandingFooter() {
  return (
    <footer className="border-t border-border/20 py-12 bg-background">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-500 grid place-items-center text-background font-black text-sm">
            R
          </div>
          <div>
            <span className="text-sm font-extrabold text-foreground">Reconverse</span>
            <span className="text-[10px] text-muted-foreground/50 ml-2 border-l border-border/60 pl-2">
              Part of the Motorverse ecosystem
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground/60">
          <Link to="/login" className="hover:text-foreground transition-colors font-semibold">
            Member Login
          </Link>
          <a
            href="mailto:hello@reconverse.app"
            className="hover:text-foreground transition-colors font-semibold"
          >
            Support Email
          </a>
          <span className="text-[11px] text-muted-foreground/45">© {new Date().getFullYear()} Reconverse Inc.</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page composition ── */
const Index = () => {
  const navigate = useNavigate();
  const { user, isPlatformAdmin, loading } = useAuth();
  const [activeStage, setActiveStage] = useState<string>("mpi");

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(isPlatformAdmin ? "/platform" : "/dealer", { replace: true });
    }
  }, [user, isPlatformAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 border-t-2 border-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null; // navigating away

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>Reconverse — Vehicle Recon Workflow for Modern Dealerships</title>
        <meta
          name="description"
          content="Reconverse is the single real-time pipeline used car teams use to move vehicles from intake to frontline-ready — built mobile-first for the lot."
        />
        <link rel="canonical" href="https://reconverse.app/" />
        <meta property="og:title" content="Reconverse — Vehicle Recon Workflow for Modern Dealerships" />
        <meta
          property="og:description"
          content="One pipeline for inspections, estimates, approvals, and repairs. Built mobile-first for dealership recon teams."
        />
        <meta property="og:url" content="https://reconverse.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Reconverse" />
        <meta
          name="twitter:description"
          content="Vehicle recon workflow software for modern dealerships."
        />
      </Helmet>
      <Nav />
      <Hero activeStage={activeStage} setActiveStage={setActiveStage} />
      <Features />
      <HowItWorks />
      <ValueStrip />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Index;
