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
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Pipeline stages used in the centerpiece ── */
const STAGES = [
  { id: "intake",   label: "Intake",     icon: Car,             tint: "text-cyan-400",     dot: "bg-cyan-400" },
  { id: "mpi",      label: "MPI",        icon: ClipboardCheck,  tint: "text-purple-400",   dot: "bg-purple-400" },
  { id: "estimate", label: "Estimate",   icon: Calculator,      tint: "text-pink-400",     dot: "bg-pink-400" },
  { id: "approval", label: "Approval",   icon: ThumbsUp,        tint: "text-amber-400",    dot: "bg-amber-400" },
  { id: "repair",   label: "Repair",     icon: Wrench,          tint: "text-indigo-400",   dot: "bg-indigo-400" },
  { id: "qc",       label: "QC",         icon: ShieldCheck,     tint: "text-teal-400",     dot: "bg-teal-400" },
  { id: "ready",    label: "Ready",      icon: Tag,             tint: "text-emerald-400",  dot: "bg-emerald-400" },
] as const;

/* ── Top navigation ── */
function Nav() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/50 border-b border-border/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-foreground font-black text-base shadow-[0_0_20px_rgba(185,90,250,0.25)] group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="font-extrabold tracking-tight text-foreground text-lg">Reconverse</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full ml-1">
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

/* ── Interactive ROI Savings Calculator ── */
function ROICalculator() {
  const [volume, setVolume] = useState<number>(30);
  const [daysSaved, setDaysSaved] = useState<number>(3);
  const holdingCost = 40; // $40 per day holding cost

  const monthlySavings = volume * daysSaved * holdingCost;
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="glass-panel-strong p-6 sm:p-8 max-w-md w-full relative overflow-hidden border-primary/20">
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
        <TrendingUp className="h-5 w-5 text-accent" />
        <h3 className="text-base font-bold text-foreground">Recon Savings Calculator</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        See how much capital you recover by accelerating key-to-key cycle times.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground/80">Monthly Lot Volume</span>
            <span className="text-foreground font-bold">{volume} units</span>
          </div>
          <input
            type="range"
            min="5"
            max="150"
            step="5"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground/80">Recon Days Reduced</span>
            <span className="text-foreground font-bold">{daysSaved} days</span>
          </div>
          <input
            type="range"
            min="1"
            max="7"
            step="1"
            value={daysSaved}
            onChange={(e) => setDaysSaved(Number(e.target.value))}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 text-center mt-6">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Monthly Saved Holding Costs</span>
          <p className="text-3xl font-black text-foreground tracking-tight mt-1.5 tabular-nums text-gradient-accent">
            ${monthlySavings.toLocaleString()}
          </p>
          <span className="text-[10px] text-muted-foreground/50 mt-1 block">
            (${yearlySavings.toLocaleString()} annually at ${holdingCost}/d holding cost)
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="relative bg-gradient-hero overflow-hidden pb-16">
      {/* Mesh glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-accent/80 rounded-full blur-[120px] pointer-events-none opacity-10" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          
          {/* Left Hero Column */}
          <div className="flex flex-col items-start text-left max-w-xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-accent bg-accent/10 border border-accent/20 mb-6">
              <Sparkles className="h-3 w-3" />
              Recon Workflow Redefined
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-foreground">
              Intake to frontline, <span className="text-gradient-accent">slashed to hours</span>.
            </h1>

            <p className="mt-6 text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
              Ditch the whiteboards and paper logs. Reconverse synchronizes your vehicle inspections, parts estimation sheets, and approval cycles into a clean, mobile-first operations hub.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto gap-2 h-12 px-8 font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform">
                <Link to="/login" id="hero-getstarted-btn">
                  Get Started Free
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto gap-2 h-12 px-8 font-semibold border-border/40 bg-background/25">
                <Link to="/login" id="hero-signin-btn">Member Sign In</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/45">
              <span>✓ Auto VIN Decoder</span>
              <span>·</span>
              <span>✓ Mobile lot dashboard</span>
              <span>·</span>
              <span>✓ Real-time holding indicators</span>
            </div>
          </div>

          {/* Right Hero Column (Interactive ROI Tool) */}
          <div className="flex justify-center lg:justify-end">
            <ROICalculator />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Interactive Pipeline Showcase Card ── */
function PipelineSection() {
  const [activeStage, setActiveStage] = useState<string>("mpi");
  const currentStageInfo = STAGES.find(s => s.id === activeStage) || STAGES[0];
  const ActiveIcon = currentStageInfo.icon;

  const stageDetails: Record<string, { role: string; text: string; details: string }> = {
    intake: { role: "Intake Agent", text: "Register lot units instantly.", details: "Decode the VIN config automatically, assign stock numbers, and upload initial visual lot condition check photos." },
    mpi: { role: "Technician", text: "Multi-point lot inspection check.", details: "Walk the vehicle to assess frame, interior, tires, mechanical, and safety points using quick mobile checkboxes." },
    estimate: { role: "Service Advisor", text: "Itemize repair actions.", details: "Draft estimations containing labor line item hours, parts numbers, sublets, taxes, and automatically computed margins." },
    approval: { role: "Dealer Manager", text: "Authorize repair limits.", details: "Approve or decline operations item-by-item, pushing accepted work items straight to mechanic work orders." },
    repair: { role: "Mechanic", text: "Execute lane tasks.", details: "Mechanics update status flags, post labor comments, and attach completed photos directly from their workstation." },
    qc: { role: "QC Inspector", text: "Verify completed works.", details: "Double-check safety parameters, clean visual defects, and sign off before releasing to the lot." },
    ready: { role: "Sales Admin", text: "frontline list ready.", details: "Generate retail lot guides, download safety reports, list pricing specs, and update frontline inventory status." }
  };

  return (
    <section className="relative bg-gradient-section py-20 sm:py-24 border-t border-border/20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20">
            Unified Workflow
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Connect every lane in one dashboard.
          </h2>
        </div>

        <div className="glass-panel-strong p-6 max-w-4xl mx-auto">
          {/* Stage Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
            {STAGES.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === activeStage;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
                  onMouseEnter={() => setActiveStage(s.id)}
                  className={cn(
                    "glass-panel p-3 text-left transition-all duration-300 relative group",
                    isActive ? "border-accent/40 bg-accent/5 scale-[1.02]" : "hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                    <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground truncate">{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-black text-foreground">
                      {[12, 8, 5, 3, 6, 2, 9][STAGES.findIndex(x => x.id === s.id)]}
                    </span>
                    <Icon className={cn("h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity", s.tint)} />
                  </div>
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Stage Details */}
          <div className="glass-panel p-5 bg-background/25 border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <ActiveIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{stageDetails[activeStage].text}</h4>
                <p className="text-xs text-muted-foreground/75 mt-1 leading-relaxed max-w-xl">
                  {stageDetails[activeStage].details}
                </p>
              </div>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-border/40 pt-3 sm:pt-0 sm:pl-4 shrink-0 flex flex-col w-full sm:w-auto">
              <span className="text-[9px] font-bold tracking-widest text-muted-foreground/40 uppercase">Role Owner</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{stageDetails[activeStage].role}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features Section ── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Mobile Inspections",
    body: "Assess vehicles on the spot. Mark line items, capture photo proof, and record notes on frame, tires, or mechanical safety elements.",
  },
  {
    icon: Calculator,
    title: "Estimate Itemizer",
    body: "Build estimates containing labor time calculations, part cost details, and sublet items. Set custom margins and compute taxes automatically.",
  },
  {
    icon: ThumbsUp,
    title: "Instant Sign-Offs",
    body: "Managers accept or deny estimate lines with a single mobile trigger, sending work orders instantly to technicians.",
  },
  {
    icon: Camera,
    title: "Evidence Photos",
    body: "Link photos to specific inspections and estimate lines, stored securely in high-speed cloud directories.",
  },
  {
    icon: Activity,
    title: "Continuous Activity Log",
    body: "Chronologically record stage modifications, user replies, and cost revisions. Eliminate verbal misalignments.",
  },
  {
    icon: Users,
    title: "Rooftop Separations",
    body: "Enterprise multi-tenant data structures ensure database and inventory records are isolated securely at the server level.",
  },
] as const;

function Features() {
  return (
    <section className="relative py-20 sm:py-24 border-t border-border/20 bg-background">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            Capabilities
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Everything your reconditioning loop requires.
          </h2>
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

/* ── Value Strip ── */
function ValueStrip() {
  const items = [
    { icon: Smartphone, label: "Mobilized Lot Speed", body: "Techs and managers execute checklists directly from vehicle hoods." },
    { icon: ShieldCheck, label: "RLS Governance", body: "Rooftop contents are completely isolated at the server-database level." },
    { icon: Activity, label: "Detailed Audit Logs", body: "Vehicle updates are chronologically recorded in unified server logs." },
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
                "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.15), transparent), radial-gradient(ellipse 50% 40% at 50% 100%, hsl(var(--ring) / 0.15), transparent)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Ready to recover holding costs?
            </h2>
            <p className="mt-4 text-xs text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
              Consolidate your reconditioning loop under one pipeline. Start tracking units today.
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
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-background font-black text-sm">
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
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20 selection:text-accent">
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
      <Hero />
      <PipelineSection />
      <Features />
      <ValueStrip />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Index;
